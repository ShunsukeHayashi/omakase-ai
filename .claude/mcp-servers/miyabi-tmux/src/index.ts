#!/usr/bin/env node
/**
 * miyabi-tmux MCP Server
 *
 * tmux Control Mode統合MCPサーバー
 * リアルタイムPane出力監視・セッション管理・コマンド実行
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ControlModeClient, PaneOutput } from "./control-mode-client.js";

// Global client instance
let client: ControlModeClient | null = null;

// Create MCP server
const server = new Server(
  {
    name: "miyabi-tmux",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "tmux_control_connect",
        description: "tmux Control Modeに接続する",
        inputSchema: {
          type: "object",
          properties: {
            session: {
              type: "string",
              description: "接続するセッション名（省略時は新規セッション）",
            },
          },
        },
      },
      {
        name: "tmux_control_disconnect",
        description: "tmux Control Mode接続を切断する",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "tmux_control_command",
        description: "任意のtmuxコマンドを実行する",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "実行するtmuxコマンド",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "tmux_control_list_sessions",
        description: "全セッション一覧を取得する",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "tmux_control_list_panes",
        description: "Pane一覧を取得する",
        inputSchema: {
          type: "object",
          properties: {
            target: {
              type: "string",
              description: "対象セッション/ウィンドウ（省略時は全Pane）",
            },
          },
        },
      },
      {
        name: "tmux_control_send_keys",
        description: "指定Paneにキーを送信する",
        inputSchema: {
          type: "object",
          properties: {
            pane_id: {
              type: "string",
              description: "対象Pane ID (例: %50)",
            },
            keys: {
              type: "string",
              description: "送信するキー",
            },
          },
          required: ["pane_id", "keys"],
        },
      },
      {
        name: "tmux_control_capture_pane",
        description: "Pane内容をキャプチャする",
        inputSchema: {
          type: "object",
          properties: {
            pane_id: {
              type: "string",
              description: "対象Pane ID",
            },
            lines: {
              type: "number",
              description: "取得する行数（省略時は全内容）",
            },
          },
          required: ["pane_id"],
        },
      },
      {
        name: "tmux_control_wait_for_output",
        description: "特定パターンがPane出力に現れるまで待機する",
        inputSchema: {
          type: "object",
          properties: {
            pane_id: {
              type: "string",
              description: "対象Pane ID",
            },
            pattern: {
              type: "string",
              description: "待機するパターン（正規表現）",
            },
            timeout: {
              type: "number",
              description: "タイムアウト（ミリ秒、デフォルト30000）",
            },
          },
          required: ["pane_id", "pattern"],
        },
      },
      {
        name: "tmux_control_status",
        description: "Control Mode接続状態を確認する",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "tmux_control_connect": {
        if (client?.connected) {
          return { content: [{ type: "text", text: "Already connected" }] };
        }
        client = new ControlModeClient(args?.session as string | undefined);
        await client.connect();

        // Set up output listener
        client.onOutput((output: PaneOutput) => {
          console.error(`[OUTPUT ${output.paneId}] ${output.data.substring(0, 100)}`);
        });

        return { content: [{ type: "text", text: "Connected to tmux Control Mode" }] };
      }

      case "tmux_control_disconnect": {
        if (!client) {
          return { content: [{ type: "text", text: "Not connected" }] };
        }
        client.disconnect();
        client = null;
        return { content: [{ type: "text", text: "Disconnected" }] };
      }

      case "tmux_control_command": {
        if (!client?.connected) {
          return { content: [{ type: "text", text: "Error: Not connected. Use tmux_control_connect first." }] };
        }
        const result = await client.sendCommand(args?.command as string);
        return { content: [{ type: "text", text: result.output || "(no output)" }] };
      }

      case "tmux_control_list_sessions": {
        if (!client?.connected) {
          return { content: [{ type: "text", text: "Error: Not connected" }] };
        }
        const sessions = await client.listSessions();
        return { content: [{ type: "text", text: sessions.join("\n") || "(no sessions)" }] };
      }

      case "tmux_control_list_panes": {
        if (!client?.connected) {
          return { content: [{ type: "text", text: "Error: Not connected" }] };
        }
        const panes = await client.listPanes(args?.target as string | undefined);
        return { content: [{ type: "text", text: panes.join("\n") || "(no panes)" }] };
      }

      case "tmux_control_send_keys": {
        if (!client?.connected) {
          return { content: [{ type: "text", text: "Error: Not connected" }] };
        }
        await client.sendKeys(args?.pane_id as string, args?.keys as string);
        return { content: [{ type: "text", text: `Keys sent to ${args?.pane_id}` }] };
      }

      case "tmux_control_capture_pane": {
        if (!client?.connected) {
          return { content: [{ type: "text", text: "Error: Not connected" }] };
        }
        const content = await client.capturePane(
          args?.pane_id as string,
          args?.lines as number | undefined
        );
        return { content: [{ type: "text", text: content || "(empty)" }] };
      }

      case "tmux_control_wait_for_output": {
        if (!client?.connected) {
          return { content: [{ type: "text", text: "Error: Not connected" }] };
        }
        const pattern = new RegExp(args?.pattern as string);
        const timeout = (args?.timeout as number) || 30000;
        const output = await client.waitForOutput(args?.pane_id as string, pattern, timeout);
        return { content: [{ type: "text", text: output }] };
      }

      case "tmux_control_status": {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              connected: client?.connected ?? false,
            }, null, 2)
          }]
        };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${message}` }] };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("miyabi-tmux MCP server running");
}

main().catch(console.error);
