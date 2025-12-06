# Feature Specification: Pipecat Migration

**Version**: 1.0
**Created**: 2025-12-06
**Status**: Draft
**Owner**: Engineering Team

---

## 1. Overview

### 1.1 Problem Statement

現在のomakase.aiはVAPI（Voice AI Platform）に完全依存している。この依存により：

1. **コスト課題**: VAPIの従量課金がスケール時にボトルネック
2. **カスタマイズ制限**: VAPIの設定範囲内でしか調整不可
3. **ベンダーロックイン**: VAPI障害・料金変更の影響を直接受ける
4. **レイテンシ**: 複数サービス経由で遅延蓄積

### 1.2 Proposed Solution

VAPIからPipecat（Daily.co提供のOSS音声AIフレームワーク）へ移行し、音声AI基盤を自社管理化する。

```
現状: omakase.ai Widget → VAPI → Daily.co
改善: omakase.ai Widget → Pipecat Server → Daily.co
```

### 1.3 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| 月間コスト | $X (VAPI) | 50%削減 |
| レイテンシ | ~800ms | <600ms |
| カスタマイズ性 | 制限あり | 完全自由 |
| 可用性 | VAPI依存 | 自社管理 |

---

## 2. Functional Requirements

### 2.1 Core Features (Must Have)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-01 | 音声認識 (STT) | リアルタイム音声→テキスト変換 |
| FR-02 | 音声合成 (TTS) | テキスト→音声変換（日本語対応） |
| FR-03 | LLM統合 | Claude/GPTによる会話生成 |
| FR-04 | WebRTC接続 | Daily.coによるブラウザ音声通信 |
| FR-05 | Function Calling | 商品検索、カート操作等のツール実行 |
| FR-06 | 割り込み処理 | ユーザー発話による応答中断 |

### 2.2 Nice to Have

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-07 | 感情認識 | 音声トーンからの感情分析 |
| FR-08 | 多言語 | 日本語以外の言語サポート |
| FR-09 | 録音・分析 | 会話ログの保存と分析 |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Requirement | Specification |
|-------------|---------------|
| First-byte latency | <200ms |
| End-to-end latency | <600ms |
| Concurrent sessions | 100+ |
| Audio quality | Opus 48kHz |

### 3.2 Availability

| Requirement | Specification |
|-------------|---------------|
| Uptime SLA | 99.9% |
| Failover | Automatic |
| Graceful degradation | Text-only fallback |

### 3.3 Security

| Requirement | Specification |
|-------------|---------------|
| Transport | TLS 1.3 |
| Authentication | JWT |
| Data encryption | At rest & in transit |

---

## 4. Technical Specification

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (User)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              omakase.ai Widget                       │   │
│  │  ┌───────────────┐  ┌─────────────────────────┐    │   │
│  │  │ Daily.co SDK  │  │ UI Components           │    │   │
│  │  │ (WebRTC)      │  │ (Product, Cart, etc.)   │    │   │
│  │  └───────┬───────┘  └─────────────────────────┘    │   │
│  └──────────┼──────────────────────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────┘
              │ WebRTC
              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Daily.co Infrastructure                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SFU (Selective Forwarding Unit)         │   │
│  └─────────────────────────┬───────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │ WebRTC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Pipecat Server (Self-hosted)                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    Pipeline                            │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │ │
│  │  │ Daily   │→ │Deepgram │→ │ Claude  │→ │Eleven   │  │ │
│  │  │Transport│  │ STT     │  │ LLM     │  │Labs TTS │  │ │
│  │  └─────────┘  └─────────┘  └────┬────┘  └─────────┘  │ │
│  │                                 │                      │ │
│  │                         ┌───────▼───────┐             │ │
│  │                         │ Function Tools │             │ │
│  │                         │ (EC Backend)   │             │ │
│  │                         └───────────────┘             │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   omakase.ai Backend                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Products API│  │ Cart API    │  │ Knowledge API       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Pipecat Pipeline Configuration

```python
from pipecat.frames.frames import LLMMessagesFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_response import LLMAssistantResponseAggregator
from pipecat.processors.aggregators.user_response import UserResponseAggregator
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.services.anthropic import AnthropicLLMService
from pipecat.transports.services.daily import DailyTransport, DailyParams

# Transport (Daily.co WebRTC)
transport = DailyTransport(
    room_url=room_url,
    token=token,
    bot_name="Omakase AI",
    params=DailyParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        transcription_enabled=False,  # Use Deepgram instead
    )
)

# STT (Deepgram)
stt = DeepgramSTTService(
    api_key=os.getenv("DEEPGRAM_API_KEY"),
    language="ja",
)

# LLM (Claude)
llm = AnthropicLLMService(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    model="claude-sonnet-4-20250514",
)

# TTS (ElevenLabs)
tts = ElevenLabsTTSService(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
    voice_id="Yuki",  # Japanese voice
)

# Pipeline
pipeline = Pipeline([
    transport.input(),
    stt,
    UserResponseAggregator(),
    llm,
    tts,
    transport.output(),
])
```

### 4.3 Function Tools Integration

```python
from pipecat.services.anthropic import AnthropicLLMService

# Tool definitions
tools = [
    {
        "name": "search_products",
        "description": "Search products by keyword",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keyword"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "add_to_cart",
        "description": "Add product to cart",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "quantity": {"type": "integer", "default": 1}
            },
            "required": ["product_id"]
        }
    },
    # ... other tools
]

# LLM with tools
llm = AnthropicLLMService(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    model="claude-sonnet-4-20250514",
    tools=tools,
)

# Tool executor
async def handle_tool_call(tool_name: str, args: dict):
    if tool_name == "search_products":
        return await products_api.search(args["query"])
    elif tool_name == "add_to_cart":
        return await cart_api.add(args["product_id"], args.get("quantity", 1))
    # ... other tools
```

### 4.4 API Changes

#### Widget → Backend (既存を維持)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/voice/session` | POST | 音声セッション開始 |
| `/api/products/*` | GET/POST | 商品操作 |
| `/api/cart/*` | GET/POST/DELETE | カート操作 |

#### Backend → Pipecat (新規)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pipecat/room` | POST | Daily.coルーム作成 |
| `/pipecat/join` | POST | セッション参加 |
| `/pipecat/leave` | POST | セッション終了 |

---

## 5. Data Models

### 5.1 Voice Session

```typescript
interface VoiceSession {
  id: string;
  roomUrl: string;
  token: string;
  status: 'pending' | 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
  context: {
    storeId: string;
    pageContext: Record<string, unknown>;
  };
}
```

### 5.2 Conversation Turn

```typescript
interface ConversationTurn {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  latency?: number;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}
```

---

## 6. Dependencies

### 6.1 External Services

| Service | Purpose | Fallback |
|---------|---------|----------|
| Daily.co | WebRTC | N/A (core) |
| Deepgram | STT | Whisper API |
| Anthropic | LLM | OpenAI GPT |
| ElevenLabs | TTS | Google TTS |

### 6.2 Python Packages

```requirements
pipecat-ai[daily,deepgram,anthropic,elevenlabs]>=0.0.50
python-dotenv>=1.0.0
aiohttp>=3.9.0
```

---

## 7. Migration Strategy

### 7.1 Phases

| Phase | Description | Duration |
|-------|-------------|----------|
| 1. PoC | 基本パイプライン動作確認 | 1週間 |
| 2. Development | 全機能実装 | 2週間 |
| 3. Testing | E2E・負荷テスト | 1週間 |
| 4. Staging | ステージング環境デプロイ | 1週間 |
| 5. Production | 段階的ロールアウト | 2週間 |

### 7.2 Rollback Plan

1. Feature flagで切り替え可能
2. VAPIエンドポイントを90日間維持
3. 問題発生時は即座にVAPIへ戻す

---

## 8. Testing Requirements

### 8.1 Unit Tests

- Pipelineコンポーネント個別テスト
- Tool executor テスト
- Context管理テスト

### 8.2 Integration Tests

- STT → LLM → TTS フロー
- Tool calling E2E
- Daily.co接続テスト

### 8.3 Performance Tests

- レイテンシ測定
- 同時接続負荷テスト
- 長時間安定性テスト

---

## 9. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Pipecat習熟不足 | Medium | High | PoC期間で検証 |
| レイテンシ悪化 | Low | High | サービス選定最適化 |
| 日本語品質低下 | Medium | Medium | TTS/STT比較テスト |
| 運用負担増加 | High | Medium | 監視・アラート整備 |

---

## 10. Appendix

### 10.1 References

- [Pipecat Documentation](https://docs.pipecat.ai/)
- [Daily.co API](https://docs.daily.co/)
- [Deepgram API](https://developers.deepgram.com/)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)

### 10.2 Related Documents

- `docs/TECHNICAL_ANALYSIS.md` - 現行システム分析
- `docs/COMPETITIVE_ANALYSIS.md` - 競合比較
- `docs/omakase-ai-protocol.puml` - 現行プロトコル
