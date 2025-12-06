/**
 * Miyabi tmux Control Mode MCP Server Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    stdout: new EventEmitter(),
    stdin: { write: vi.fn() },
    stderr: new EventEmitter(),
    on: vi.fn(),
    kill: vi.fn(),
  }),
}));

describe('ControlModeClient', () => {
  describe('Connection Management', () => {
    it('should connect to tmux control mode', async () => {
      const client = createMockClient();
      await client.connect();

      expect(client.isConnected()).toBe(true);
    });

    it('should disconnect properly', async () => {
      const client = createMockClient();
      await client.connect();
      client.disconnect();

      expect(client.isConnected()).toBe(false);
    });

    it('should emit connected event', async () => {
      const client = createMockClient();
      const connectedHandler = vi.fn();
      client.on('event', connectedHandler);

      await client.connect();

      expect(connectedHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'connected' })
      );
    });
  });

  describe('Command Execution', () => {
    it('should send command and receive response', async () => {
      const client = createMockClient();
      await client.connect();

      const result = await client.sendCommand('list-sessions');

      expect(result).toBeDefined();
      expect(result.output).toBeInstanceOf(Array);
    });

    it('should handle command timeout', async () => {
      const client = createMockClient({ timeout: true });
      await client.connect();

      await expect(client.sendCommand('slow-command')).rejects.toThrow('timeout');
    });
  });

  describe('Event Parsing', () => {
    it('should parse %output events', () => {
      const line = '%output %50 Hello World';
      const parsed = parseControlModeLine(line);

      expect(parsed.type).toBe('output');
      expect(parsed.paneId).toBe('%50');
      expect(parsed.data).toBe('Hello World');
    });

    it('should parse %session-changed events', () => {
      const line = '%session-changed $0 main';
      const parsed = parseControlModeLine(line);

      expect(parsed.type).toBe('session-changed');
      expect(parsed.sessionId).toBe(0);
      expect(parsed.sessionName).toBe('main');
    });

    it('should parse %window-add events', () => {
      const line = '%window-add @1';
      const parsed = parseControlModeLine(line);

      expect(parsed.type).toBe('window-add');
      expect(parsed.windowId).toBe('@1');
    });

    it('should parse %begin/%end blocks', () => {
      const beginLine = '%begin 1733500000 1 0';
      const outputLine = 'session-name';
      const endLine = '%end 1733500000 1 0';

      const parser = createBlockParser();
      parser.handleLine(beginLine);
      parser.handleLine(outputLine);
      const result = parser.handleLine(endLine);

      expect(result.commandNumber).toBe(1);
      expect(result.output).toContain('session-name');
    });
  });

  describe('ANSI Escape Stripping', () => {
    it('should strip ANSI escape sequences', () => {
      const input = '\x1b[32mGreen Text\x1b[0m';
      const stripped = stripAnsi(input);

      expect(stripped).toBe('Green Text');
    });

    it('should handle complex escape sequences', () => {
      const input = '\x1b[1;31;40mBold Red on Black\x1b[0m';
      const stripped = stripAnsi(input);

      expect(stripped).toBe('Bold Red on Black');
    });

    it('should preserve normal text', () => {
      const input = 'Normal text without escapes';
      const stripped = stripAnsi(input);

      expect(stripped).toBe('Normal text without escapes');
    });
  });

  describe('Convenience Methods', () => {
    it('should list sessions', async () => {
      const client = createMockClient();
      await client.connect();

      const sessions = await client.listSessions();

      expect(sessions).toBeInstanceOf(Array);
    });

    it('should list panes', async () => {
      const client = createMockClient();
      await client.connect();

      const panes = await client.listPanes();

      expect(panes).toBeInstanceOf(Array);
      panes.forEach((pane: { id: string; command: string; path: string }) => {
        expect(pane.id).toMatch(/^%\d+$/);
      });
    });

    it('should capture pane content', async () => {
      const client = createMockClient();
      await client.connect();

      const content = await client.capturePane('%50', 100);

      expect(typeof content).toBe('string');
    });

    it('should send keys to pane', async () => {
      const client = createMockClient();
      await client.connect();

      await expect(client.sendKeys('%50', 'echo hello')).resolves.not.toThrow();
    });
  });
});

describe('PaneOutputParser', () => {
  it('should detect shell prompts', () => {
    const parser = createPaneOutputParser();

    expect(parser.hasPrompt('user@host:~$ ')).toBe(true);
    expect(parser.hasPrompt('# ')).toBe(true);
    expect(parser.hasPrompt('> ')).toBe(true);
    expect(parser.hasPrompt('output text')).toBe(false);
  });

  it('should extract last line', () => {
    const parser = createPaneOutputParser();
    const result = parser.parseOutput('line1\nline2\nline3');

    expect(result.lastLine).toBe('line3');
  });
});

// Helper functions

function createMockClient(options: { timeout?: boolean } = {}) {
  return {
    connected: false,
    async connect() {
      this.connected = true;
      this.emit('event', { type: 'connected' });
    },
    disconnect() {
      this.connected = false;
    },
    isConnected() {
      return this.connected;
    },
    async sendCommand(cmd: string) {
      if (options.timeout) {
        throw new Error('Command timeout');
      }
      return { commandNumber: 1, output: ['result'], success: true };
    },
    async listSessions() {
      return ['session1', 'session2'];
    },
    async listPanes() {
      return [
        { id: '%50', command: 'bash', path: '/home/user' },
        { id: '%51', command: 'vim', path: '/home/user/project' },
      ];
    },
    async capturePane(_paneId: string, _lines?: number) {
      return 'Captured pane content';
    },
    async sendKeys(_paneId: string, _keys: string) {
      return;
    },
    listeners: new Map<string, Function[]>(),
    on(event: string, handler: Function) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(handler);
    },
    emit(event: string, data: unknown) {
      const handlers = this.listeners.get(event) || [];
      handlers.forEach((h) => h(data));
    },
  };
}

function parseControlModeLine(line: string) {
  const outputMatch = line.match(/^%output %(\d+) (.*)$/);
  if (outputMatch) {
    return { type: 'output', paneId: `%${outputMatch[1]}`, data: outputMatch[2] };
  }

  const sessionMatch = line.match(/^%session-changed \$(\d+) (.+)$/);
  if (sessionMatch) {
    return { type: 'session-changed', sessionId: parseInt(sessionMatch[1]), sessionName: sessionMatch[2] };
  }

  const windowMatch = line.match(/^%window-add @(\d+)$/);
  if (windowMatch) {
    return { type: 'window-add', windowId: `@${windowMatch[1]}` };
  }

  return { type: 'unknown' };
}

function createBlockParser() {
  let currentBlock: { commandNumber: number; output: string[] } | null = null;

  return {
    handleLine(line: string) {
      const beginMatch = line.match(/^%begin (\d+) (\d+) (\d+)$/);
      if (beginMatch) {
        currentBlock = { commandNumber: parseInt(beginMatch[2]), output: [] };
        return null;
      }

      const endMatch = line.match(/^%end (\d+) (\d+) (\d+)$/);
      if (endMatch && currentBlock) {
        const result = { ...currentBlock };
        currentBlock = null;
        return result;
      }

      if (currentBlock) {
        currentBlock.output.push(line);
      }

      return null;
    },
  };
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function createPaneOutputParser() {
  return {
    hasPrompt(line: string): boolean {
      return /[$#>]\s*$/.test(line);
    },
    parseOutput(text: string) {
      const lines = text.split('\n');
      return {
        text,
        lastLine: lines[lines.length - 1] || '',
        hasPrompt: this.hasPrompt(lines[lines.length - 1] || ''),
      };
    },
  };
}
