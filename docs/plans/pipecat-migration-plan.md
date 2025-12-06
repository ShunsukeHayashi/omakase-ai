# Implementation Plan: Pipecat Migration

**Spec**: docs/specs/pipecat-migration.md
**Created**: 2025-12-06
**Status**: Draft

---

## Summary

**Primary Requirement**: VAPIからPipecatへ移行し、音声AI基盤を自社管理化する
**Technical Approach**: PythonベースのPipecatサーバーを構築し、既存TypeScriptバックエンドと連携

---

## Constitution Alignment

| Article | Aligned | Notes |
|---------|---------|-------|
| I - Spec-Driven | Yes | `docs/specs/pipecat-migration.md` 作成済み |
| II - Test-First | Yes | Unit/Integration/E2Eテスト戦略定義 |
| III - Simplicity | Yes | Pipecatの標準パイプラインを活用 |
| IV - Library-First | Yes | Pipecat OSS + 外部サービスAPI |
| V - Integration Testing | Yes | STT→LLM→TTS フロー検証 |

---

## Technical Context

- **Language**: Python 3.12+ (Pipecat), TypeScript (既存Backend)
- **Runtime**: Python asyncio, Node.js 18+
- **Framework**: Pipecat, Express.js
- **Testing**: pytest (Python), Jest (TypeScript)
- **Dependencies**:
  - pipecat-ai[daily,deepgram,anthropic,elevenlabs]
  - Daily.co SDK
  - Deepgram API
  - Anthropic Claude API
  - ElevenLabs API

---

## Architecture

### Components

1. **Pipecat Server** (新規)
   - Purpose: 音声AIパイプライン処理
   - Interface: HTTP API + WebRTC
   - Dependencies: Daily.co, Deepgram, Claude, ElevenLabs

2. **Voice Router** (新規)
   - Purpose: セッション管理、ルーム作成
   - Interface: REST API
   - Dependencies: Daily.co API

3. **Tool Executor** (新規)
   - Purpose: Function Calling処理
   - Interface: Python async functions
   - Dependencies: 既存Backend API

4. **Backend API** (既存・拡張)
   - Purpose: 商品/カート/ナレッジ操作
   - Interface: REST API
   - Dependencies: In-Memory Store

5. **Widget** (既存・修正)
   - Purpose: UI + Daily.co接続
   - Interface: React + daily-js
   - Dependencies: Pipecat Server

### Data Flow

```
[User Audio] → [Daily.co SFU] → [Pipecat Server]
                                      │
    ┌─────────────────────────────────┼─────────────────────────────────┐
    │                                 ▼                                 │
    │  [Deepgram STT] → [Claude LLM] → [Tool Executor] → [Backend API] │
    │                         │                                         │
    │                         ▼                                         │
    │                 [ElevenLabs TTS]                                  │
    └─────────────────────────┼─────────────────────────────────────────┘
                              ▼
              [Daily.co SFU] → [User Audio]
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: 基本パイプラインの動作確認

| Task | Description | Owner | Est |
|------|-------------|-------|-----|
| 1.1 | Python環境セットアップ | Dev | 2h |
| 1.2 | Pipecat基本パイプライン実装 | Dev | 4h |
| 1.3 | Daily.co接続テスト | Dev | 2h |
| 1.4 | Deepgram STT統合 | Dev | 2h |
| 1.5 | Claude LLM統合 | Dev | 2h |
| 1.6 | ElevenLabs TTS統合 | Dev | 2h |
| 1.7 | 日本語音声テスト | QA | 4h |

**Deliverables**:
- `pipecat-server/` ディレクトリ
- 基本パイプライン動作
- 日本語音声入出力確認

**Files to Create**:
```
pipecat-server/
├── pyproject.toml
├── .env.example
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── pipeline.py
│   └── config.py
└── tests/
    └── test_pipeline.py
```

### Phase 2: Core Logic (Week 2)

**Goal**: Function Calling + Backend連携

| Task | Description | Owner | Est |
|------|-------------|-------|-----|
| 2.1 | Tool定義（13ツール） | Dev | 4h |
| 2.2 | Tool Executor実装 | Dev | 6h |
| 2.3 | Backend API連携 | Dev | 4h |
| 2.4 | Context管理 | Dev | 4h |
| 2.5 | 割り込み処理 | Dev | 4h |
| 2.6 | エラーハンドリング | Dev | 4h |
| 2.7 | Unit Tests | Dev | 6h |

**Deliverables**:
- 13 Function Tools動作
- Backend連携確認
- Unit Test 80%+カバレッジ

**Files to Create/Modify**:
```
pipecat-server/src/
├── tools/
│   ├── __init__.py
│   ├── products.py
│   ├── cart.py
│   ├── knowledge.py
│   └── executor.py
├── context/
│   ├── __init__.py
│   └── manager.py
└── prompts/
    ├── __init__.py
    └── ec_assistant.py
```

### Phase 3: Integration (Week 3)

**Goal**: Widget統合 + API整備

| Task | Description | Owner | Est |
|------|-------------|-------|-----|
| 3.1 | Voice Router API | Dev | 4h |
| 3.2 | Widget修正（Daily.co直接接続） | Dev | 6h |
| 3.3 | セッション管理 | Dev | 4h |
| 3.4 | Feature Flag実装 | Dev | 2h |
| 3.5 | Integration Tests | Dev | 6h |
| 3.6 | E2E Tests | QA | 8h |

**Deliverables**:
- Widget → Pipecat接続動作
- Feature Flagで切り替え可能
- Integration Tests

**Files to Create/Modify**:
```
src/server/routes/
├── pipecat.ts          # 新規

frontend/src/lib/
├── pipecat.ts          # 新規
├── realtime.ts         # 修正（Feature Flag）

pipecat-server/src/
├── api/
│   ├── __init__.py
│   ├── routes.py
│   └── models.py
```

### Phase 4: Testing & Optimization (Week 4)

**Goal**: 品質保証 + パフォーマンス最適化

| Task | Description | Owner | Est |
|------|-------------|-------|-----|
| 4.1 | 負荷テスト | QA | 8h |
| 4.2 | レイテンシ計測・最適化 | Dev | 8h |
| 4.3 | 日本語品質テスト | QA | 4h |
| 4.4 | エッジケーステスト | QA | 4h |
| 4.5 | ドキュメント整備 | Dev | 4h |
| 4.6 | 監視・アラート設定 | DevOps | 4h |

**Deliverables**:
- レイテンシ < 600ms
- 同時100接続対応
- 運用ドキュメント

### Phase 5: Deployment (Week 5-6)

**Goal**: 段階的本番リリース

| Task | Description | Owner | Est |
|------|-------------|-------|-----|
| 5.1 | Staging環境デプロイ | DevOps | 4h |
| 5.2 | Staging検証 | QA | 8h |
| 5.3 | Production環境構築 | DevOps | 4h |
| 5.4 | Canary Release (10%) | DevOps | 2h |
| 5.5 | モニタリング・観測 | DevOps | 16h |
| 5.6 | Full Rollout (50%→100%) | DevOps | 8h |
| 5.7 | VAPI廃止 | DevOps | 2h |

**Deliverables**:
- Production稼働
- VAPIからの完全移行
- コスト削減達成

---

## Testing Strategy

### Unit Tests (pytest)

```python
# tests/test_pipeline.py
@pytest.mark.asyncio
async def test_stt_transcription():
    """STTが正しく音声をテキスト化するか"""
    pass

@pytest.mark.asyncio
async def test_llm_response():
    """LLMが適切な応答を生成するか"""
    pass

@pytest.mark.asyncio
async def test_tts_synthesis():
    """TTSが正しく音声を生成するか"""
    pass

@pytest.mark.asyncio
async def test_tool_execution():
    """Function Toolsが正しく実行されるか"""
    pass
```

### Integration Tests

```python
# tests/test_integration.py
@pytest.mark.asyncio
async def test_full_pipeline():
    """STT→LLM→TTS フルパイプライン"""
    pass

@pytest.mark.asyncio
async def test_product_search_flow():
    """商品検索 E2Eフロー"""
    pass

@pytest.mark.asyncio
async def test_cart_operation_flow():
    """カート操作 E2Eフロー"""
    pass
```

### E2E Tests (Playwright + 音声)

```typescript
// tests/e2e/voice.spec.ts
test('音声で商品検索ができる', async () => {
  // 1. Widgetを開く
  // 2. マイクをモック
  // 3. 「おすすめの商品を教えて」音声入力
  // 4. 応答確認
});
```

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Pipecat習熟不足 | Medium | High | Phase 1でPoC検証 |
| レイテンシ悪化 | Low | High | サービス選定最適化、Deepgram Edge |
| 日本語品質低下 | Medium | Medium | TTS/STT複数比較テスト |
| 運用負担増加 | High | Medium | 監視・アラート・ランブック整備 |
| Daily.co障害 | Low | High | ステータス監視、手動フェイルオーバー |
| 移行中のサービス断 | Medium | High | Feature Flag、ロールバック手順 |

---

## Complexity Tracking

| Violation | Justification |
|-----------|---------------|
| 新規Python環境追加 | Pipecat公式サポート言語、TypeScriptバインディングなし |
| マイクロサービス化 | 音声AI処理の分離、スケーラビリティ確保 |
| 外部サービス4種依存 | 各分野のBest-in-Class選定、代替可能 |

---

## Cost Analysis

### 現状 (VAPI)

| Item | Monthly Cost |
|------|-------------|
| VAPI | ~$X/min |
| Total | $X |

### 移行後 (Pipecat)

| Item | Monthly Cost |
|------|-------------|
| Daily.co | ~$Y |
| Deepgram | ~$Z |
| ElevenLabs | ~$W |
| Anthropic | ~$V |
| Compute (Cloud Run) | ~$U |
| **Total** | **$Y+Z+W+V+U** |

**Expected Savings**: 30-50%

---

## Rollback Plan

1. **Feature Flag**: `VOICE_PROVIDER=vapi|pipecat` 環境変数
2. **即時ロールバック**: Feature Flagを`vapi`に変更
3. **VAPIエンドポイント維持**: 移行完了後90日間
4. **ロールバック基準**:
   - レイテンシ > 1000ms
   - エラー率 > 5%
   - ユーザー苦情 > 10件/日

---

## Success Criteria

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| コスト | $X/月 | -50% | 請求額 |
| レイテンシ | ~800ms | <600ms | P95 |
| エラー率 | <1% | <1% | 監視ダッシュボード |
| 可用性 | 99.9% | 99.9% | Uptime監視 |
| 日本語品質 | Baseline | 同等以上 | ユーザーテスト |

---

## Dependencies & Prerequisites

### Before Phase 1

- [x] 技術分析完了 (`docs/TECHNICAL_ANALYSIS.md`)
- [x] 仕様書作成 (`docs/specs/pipecat-migration.md`)
- [ ] Daily.co APIキー取得
- [ ] Deepgram APIキー取得
- [ ] ElevenLabs APIキー取得
- [ ] Python 3.12+ 環境構築

### Before Phase 5

- [ ] Staging環境構築
- [ ] 監視ダッシュボード設定
- [ ] アラートルール定義
- [ ] ランブック作成
- [ ] ロールバック手順確認

---

## References

- [Pipecat Documentation](https://docs.pipecat.ai/)
- [Pipecat GitHub](https://github.com/pipecat-ai/pipecat)
- [Daily.co Developer Docs](https://docs.daily.co/)
- [Deepgram API](https://developers.deepgram.com/)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
