# tmux Control Mode統合方針

## Issue: #1238

## 1. tmux Control Mode (-C) プロトコル解析

### 1.1 基本フォーマット

```
%begin <timestamp> <command-number> <flags>
<command output>
%end <timestamp> <command-number> <flags>
```

### 1.2 イベント通知タイプ

| イベント | 説明 |
|---------|------|
| `%sessions-changed` | セッション一覧変更 |
| `%session-changed $N <name>` | アクティブセッション変更 |
| `%window-add @N` | ウィンドウ追加 |
| `%window-close @N` | ウィンドウ削除 |
| `%output %N <data>` | Pane出力（エスケープシーケンス含む） |
| `%exit` | Control Mode終了 |

### 1.3 Pane ID形式

- フォーマット: `%N` (例: `%50`, `%51`)
- 永続的ID: セッション存続中は変わらない
- Control Modeでリアルタイム取得可能

## 2. 既存 miyabi-tmux-orchestrator 構造

### 2.1 モジュール構成

```
crates/miyabi-tmux-orchestrator/
├── src/
│   ├── lib.rs      # エントリポイント
│   ├── session.rs  # TmuxSession管理
│   ├── pane.rs     # Pane状態管理
│   ├── agent.rs    # Agent起動
│   └── error.rs    # エラー型
```

### 2.2 現在の実装方式

- `std::process::Command` で `tmux` コマンド実行
- 同期的なコマンド実行
- 出力パース: 単純な文字列処理

### 2.3 制約事項

- リアルタイムイベント受信なし
- ポーリングベースの状態確認
- 出力監視に遅延あり

## 3. Control Mode統合方針

### 3.1 アーキテクチャ変更

```
                    ┌─────────────────────────┐
                    │   miyabi-tmux MCP       │
                    │   (TypeScript/Node.js)  │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Control Mode Manager   │
                    │  - 持続的接続           │
                    │  - イベントストリーム    │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼─────────┐ ┌────▼────┐ ┌─────────▼─────────┐
    │ SessionManager    │ │EventBus │ │ PaneOutputParser  │
    │ - list-sessions   │ │         │ │ - %output解析     │
    │ - list-panes      │ │         │ │ - ANSI除去        │
    └───────────────────┘ └─────────┘ └───────────────────┘
```

### 3.2 新規モジュール

#### 3.2.1 `ControlModeClient`

```typescript
class ControlModeClient {
  private process: ChildProcess;
  private commandQueue: Map<number, Resolver>;
  private eventEmitter: EventEmitter;

  async connect(): Promise<void>;
  async sendCommand(cmd: string): Promise<string>;
  onEvent(type: string, callback: EventHandler): void;
}
```

#### 3.2.2 `PaneOutputParser`

```typescript
class PaneOutputParser {
  // %output %N <escaped-data> を解析
  parseOutput(raw: string): PaneOutput;

  // ANSIエスケープシーケンス除去
  stripAnsi(data: string): string;
}
```

### 3.3 実装優先順位

| 優先度 | 機能 | 説明 |
|-------|------|------|
| P0 | 持続的接続 | `tmux -C attach`との接続維持 |
| P0 | コマンド送受信 | begin/end解析 |
| P1 | リアルタイム出力 | `%output`イベント処理 |
| P1 | セッション監視 | `%session-changed`等 |
| P2 | 再接続ロジック | 接続断時の自動復旧 |

### 3.4 MCP Tool追加案

```typescript
// 既存ツールの拡張
tmux_pane_subscribe    // Pane出力をリアルタイム購読
tmux_control_command   // 任意のtmuxコマンド実行
tmux_wait_for_output   // 特定パターンまで待機
```

## 4. 移行計画

### Phase 1: プロトタイプ (1週間)
- ControlModeClient基本実装
- 単一セッション接続テスト

### Phase 2: MCP統合 (1週間)
- 既存miyabi-tmux MCPへの統合
- 新規ツール追加

### Phase 3: 本番移行 (1週間)
- Rust crate (miyabi-tmux-orchestrator) との連携
- パフォーマンステスト

## 5. リスクと対策

| リスク | 対策 |
|-------|------|
| Control Mode接続断 | 自動再接続 + 状態復元 |
| 大量出力によるバッファ溢れ | ストリーム処理 + 制限 |
| ANSIエスケープ解析エラー | 堅牢なパーサー + フォールバック |

## 6. 参考資料

- [tmux(1) man page - CONTROL MODE](https://man7.org/linux/man-pages/man1/tmux.1.html)
- miyabi-tmux-orchestrator: `/crates/miyabi-tmux-orchestrator/`
