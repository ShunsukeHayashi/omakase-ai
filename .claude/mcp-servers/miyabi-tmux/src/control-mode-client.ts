/**
 * tmux Control Mode Client
 *
 * tmux -C (Control Mode) との持続的接続を管理し、
 * リアルタイムイベント受信とコマンド送受信を提供する。
 *
 * @see docs/specs/tmux-control-mode-integration.md
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { createInterface, Interface } from "readline";

// ============================================================================
// Types
// ============================================================================

export interface CommandResult {
  commandNumber: number;
  output: string;
  timestamp: number;
}

export interface PaneOutput {
  paneId: string;
  data: string;
  rawData: string;
}

export interface SessionChangedEvent {
  sessionId: number;
  sessionName: string;
}

export interface WindowEvent {
  windowId: string;
  type: "add" | "close";
}

type EventHandler<T = unknown> = (data: T) => void;

interface PendingCommand {
  resolve: (result: CommandResult) => void;
  reject: (error: Error) => void;
  output: string[];
  startTimestamp: number;
}

// ============================================================================
// PaneOutputParser
// ============================================================================

export class PaneOutputParser {
  // ANSI escape sequence pattern
  private static readonly ANSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07|\x1b[PX^_].*?\x1b\\|\x1b./g;

  /**
   * Parse %output event data
   * Format: %output %N <escaped-data>
   */
  parseOutput(raw: string): PaneOutput | null {
    const match = raw.match(/^%output (%\d+) (.*)$/);
    if (!match) return null;

    const paneId = match[1];
    const rawData = match[2];
    const data = this.unescapeData(rawData);

    return {
      paneId,
      data: this.stripAnsi(data),
      rawData: data,
    };
  }

  /**
   * Remove ANSI escape sequences from string
   */
  stripAnsi(data: string): string {
    return data.replace(PaneOutputParser.ANSI_PATTERN, "");
  }

  /**
   * Unescape tmux control mode escaped data
   */
  private unescapeData(data: string): string {
    return data
      .replace(/\\015/g, "\r")
      .replace(/\\012/g, "\n")
      .replace(/\\033/g, "\x1b")
      .replace(/\\\\/g, "\\");
  }
}

// ============================================================================
// ControlModeClient
// ============================================================================

export class ControlModeClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private readline: Interface | null = null;
  private commandQueue: Map<number, PendingCommand> = new Map();
  private commandCounter = 0;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private parser = new PaneOutputParser();

  // Current parsing state
  private currentCommand: {
    number: number;
    timestamp: number;
    flags: number;
    output: string[];
  } | null = null;

  constructor(private sessionName?: string) {
    super();
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  /**
   * Connect to tmux in control mode
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new Error("Already connected");
    }

    return new Promise((resolve, reject) => {
      const args = ["-C"];
      if (this.sessionName) {
        args.push("attach-session", "-t", this.sessionName);
      } else {
        args.push("new-session");
      }

      this.process = spawn("tmux", args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error("Failed to create tmux process streams"));
        return;
      }

      this.readline = createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity,
      });

      this.readline.on("line", (line) => this.handleLine(line));

      this.process.on("error", (err) => {
        this.emit("error", err);
        if (!this.isConnected) {
          reject(err);
        }
      });

      this.process.on("close", (code) => {
        this.isConnected = false;
        this.emit("close", code);
        this.attemptReconnect();
      });

      this.process.stderr?.on("data", (data) => {
        this.emit("stderr", data.toString());
      });

      // Give tmux time to initialize
      setTimeout(() => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit("connected");
        resolve();
      }, 100);
    });
  }

  /**
   * Disconnect from tmux
   */
  disconnect(): void {
    if (this.process) {
      this.process.stdin?.write("detach\n");
      this.process.kill();
      this.process = null;
    }
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    this.isConnected = false;
    this.commandQueue.clear();
  }

  /**
   * Attempt automatic reconnection
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("reconnect-failed");
      return;
    }

    this.reconnectAttempts++;
    this.emit("reconnecting", this.reconnectAttempts);

    await new Promise((r) => setTimeout(r, this.reconnectDelay * this.reconnectAttempts));

    try {
      await this.connect();
      this.emit("reconnected");
    } catch (error) {
      this.attemptReconnect();
    }
  }

  // --------------------------------------------------------------------------
  // Command Execution
  // --------------------------------------------------------------------------

  /**
   * Send a command to tmux and wait for response
   */
  async sendCommand(cmd: string, timeout = 10000): Promise<CommandResult> {
    if (!this.isConnected || !this.process?.stdin) {
      throw new Error("Not connected to tmux");
    }

    const commandNumber = ++this.commandCounter;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.commandQueue.delete(commandNumber);
        reject(new Error(`Command timeout: ${cmd}`));
      }, timeout);

      this.commandQueue.set(commandNumber, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        output: [],
        startTimestamp: Date.now(),
      });

      this.process!.stdin!.write(`${cmd}\n`);
    });
  }

  /**
   * Send command without waiting for response
   */
  sendCommandAsync(cmd: string): void {
    if (!this.isConnected || !this.process?.stdin) {
      throw new Error("Not connected to tmux");
    }
    this.process.stdin.write(`${cmd}\n`);
  }

  // --------------------------------------------------------------------------
  // Line Parsing
  // --------------------------------------------------------------------------

  /**
   * Handle incoming line from tmux
   */
  private handleLine(line: string): void {
    // Check for %begin
    const beginMatch = line.match(/^%begin (\d+) (\d+) (\d+)$/);
    if (beginMatch) {
      this.currentCommand = {
        timestamp: parseInt(beginMatch[1], 10),
        number: parseInt(beginMatch[2], 10),
        flags: parseInt(beginMatch[3], 10),
        output: [],
      };
      return;
    }

    // Check for %end
    const endMatch = line.match(/^%end (\d+) (\d+) (\d+)$/);
    if (endMatch && this.currentCommand) {
      const commandNumber = parseInt(endMatch[2], 10);
      const pending = this.commandQueue.get(commandNumber);

      if (pending) {
        pending.resolve({
          commandNumber,
          output: this.currentCommand.output.join("\n"),
          timestamp: parseInt(endMatch[1], 10),
        });
        this.commandQueue.delete(commandNumber);
      }

      this.currentCommand = null;
      return;
    }

    // Check for %error
    const errorMatch = line.match(/^%error (\d+) (\d+) (\d+)$/);
    if (errorMatch && this.currentCommand) {
      const commandNumber = parseInt(errorMatch[2], 10);
      const pending = this.commandQueue.get(commandNumber);

      if (pending) {
        pending.reject(new Error(this.currentCommand.output.join("\n")));
        this.commandQueue.delete(commandNumber);
      }

      this.currentCommand = null;
      return;
    }

    // If inside a command block, collect output
    if (this.currentCommand) {
      this.currentCommand.output.push(line);
      return;
    }

    // Handle events
    this.handleEvent(line);
  }

  /**
   * Handle tmux event notifications
   */
  private handleEvent(line: string): void {
    // %output %N <data>
    if (line.startsWith("%output ")) {
      const parsed = this.parser.parseOutput(line);
      if (parsed) {
        this.emit("output", parsed);
      }
      return;
    }

    // %sessions-changed
    if (line === "%sessions-changed") {
      this.emit("sessions-changed");
      return;
    }

    // %session-changed $N <name>
    const sessionMatch = line.match(/^%session-changed \$(\d+) (.+)$/);
    if (sessionMatch) {
      this.emit("session-changed", {
        sessionId: parseInt(sessionMatch[1], 10),
        sessionName: sessionMatch[2],
      } as SessionChangedEvent);
      return;
    }

    // %window-add @N
    const windowAddMatch = line.match(/^%window-add (@\d+)$/);
    if (windowAddMatch) {
      this.emit("window-event", {
        windowId: windowAddMatch[1],
        type: "add",
      } as WindowEvent);
      return;
    }

    // %window-close @N
    const windowCloseMatch = line.match(/^%window-close (@\d+)$/);
    if (windowCloseMatch) {
      this.emit("window-event", {
        windowId: windowCloseMatch[1],
        type: "close",
      } as WindowEvent);
      return;
    }

    // %exit
    if (line === "%exit") {
      this.emit("exit");
      this.disconnect();
      return;
    }

    // Unknown event
    this.emit("unknown-event", line);
  }

  // --------------------------------------------------------------------------
  // Convenience Methods
  // --------------------------------------------------------------------------

  /**
   * List all sessions
   */
  async listSessions(): Promise<string[]> {
    const result = await this.sendCommand("list-sessions -F '#{session_name}'");
    return result.output.split("\n").filter(Boolean);
  }

  /**
   * List all panes with detailed info
   */
  async listPanes(target?: string): Promise<string[]> {
    const cmd = target
      ? `list-panes -t ${target} -F '#{pane_id}:#{pane_current_command}:#{pane_current_path}'`
      : `list-panes -a -F '#{pane_id}:#{pane_current_command}:#{pane_current_path}'`;
    const result = await this.sendCommand(cmd);
    return result.output.split("\n").filter(Boolean);
  }

  /**
   * Send keys to a pane
   */
  async sendKeys(paneId: string, keys: string): Promise<void> {
    await this.sendCommand(`send-keys -t ${paneId} ${JSON.stringify(keys)}`);
  }

  /**
   * Capture pane content
   */
  async capturePane(paneId: string, lines?: number): Promise<string> {
    const start = lines ? `-S -${lines}` : "";
    const result = await this.sendCommand(`capture-pane -t ${paneId} -p ${start}`);
    return result.output;
  }

  /**
   * Wait for specific output pattern in a pane
   */
  async waitForOutput(
    paneId: string,
    pattern: RegExp,
    timeout = 30000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off("output", handler);
        reject(new Error(`Timeout waiting for pattern: ${pattern}`));
      }, timeout);

      const handler = (output: PaneOutput) => {
        if (output.paneId === paneId && pattern.test(output.data)) {
          clearTimeout(timeoutId);
          this.off("output", handler);
          resolve(output.data);
        }
      };

      this.on("output", handler);
    });
  }

  // --------------------------------------------------------------------------
  // Event Subscription Helpers
  // --------------------------------------------------------------------------

  /**
   * Subscribe to pane output events
   */
  onOutput(callback: EventHandler<PaneOutput>): this {
    return this.on("output", callback);
  }

  /**
   * Subscribe to session changes
   */
  onSessionChanged(callback: EventHandler<SessionChangedEvent>): this {
    return this.on("session-changed", callback);
  }

  /**
   * Subscribe to window events
   */
  onWindowEvent(callback: EventHandler<WindowEvent>): this {
    return this.on("window-event", callback);
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and connect a new ControlModeClient
 */
export async function createControlModeClient(
  sessionName?: string
): Promise<ControlModeClient> {
  const client = new ControlModeClient(sessionName);
  await client.connect();
  return client;
}

// ============================================================================
// Export Default
// ============================================================================

export default ControlModeClient;
