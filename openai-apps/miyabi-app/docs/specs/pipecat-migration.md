# Pipecat Voice Agent 移行調査レポート

## 概要

現在のOpenAI Realtime API (WebRTC) 実装からPipecatフレームワークへの移行可能性を調査。

## 現在の実装分析

### 技術スタック
| コンポーネント | 現在の実装 |
|--------------|-----------|
| フレームワーク | Express.js (Node.js) |
| 音声API | OpenAI Realtime API |
| 通信プロトコル | WebRTC |
| STT | Whisper-1 (組み込み) |
| TTS | OpenAI Voices (shimmer, echo, alloy等) |
| LLM | gpt-4o-realtime-preview-2024-12-17 |

### 主要機能 (src/server/routes/voice.ts)
- `/api/voice/session`: WebRTC用エフェメラルトークン生成
- `/api/voice/config`: 音声設定取得
- 9つのFunction Tools (search_products, add_to_cart, place_order等)
- 動的プロンプト生成
- 複数Agent対応 (shopping-guide, sales-manager等)
- VAD (Voice Activity Detection) 設定

### 現在の長所
- OpenAI統合がシンプル
- 低レイテンシ (WebRTC直接接続)
- 日本語音声サポート

### 現在の課題
- OpenAI依存 (ベンダーロックイン)
- カスタマイズの制限
- マルチモーダル対応の制約

---

## Pipecat フレームワーク調査

### 概要
Pipecat は Daily.co が開発したオープンソースの音声・マルチモーダル会話AIフレームワーク。

### 技術仕様
| 項目 | 仕様 |
|------|------|
| 言語 | Python 3.10+ (推奨3.12) |
| ライセンス | BSD-2-Clause |
| リポジトリ | [github.com/pipecat-ai/pipecat](https://github.com/pipecat-ai/pipecat) |

### 主要機能

#### 1. モジュラー設計
- 必要なコンポーネントのみ選択可能
- 軽量なコアフレームワーク

#### 2. 豊富なAIサービス統合
**STT (Speech-to-Text)**
- AssemblyAI, AWS, Azure, Deepgram, Google, OpenAI Whisper, Cartesia

**LLM**
- OpenAI, Anthropic, AWS Bedrock, Google Gemini, Groq, Mistral, Ollama, NVIDIA NIM

**TTS (Text-to-Speech)**
- Cartesia, Deepgram, ElevenLabs, Google, OpenAI, PlayHT, Hume

#### 3. トランスポート
- WebRTC対応
- 電話統合可能
- ビデオ入出力対応

#### 4. 開発ツール
- Pipecat CLI (プロジェクト作成・デプロイ)
- Whisker (リアルタイムデバッガー)
- Pipecat Flows (会話状態管理)

---

## 比較分析

### 機能比較

| 機能 | 現在 (OpenAI Realtime) | Pipecat |
|------|------------------------|---------|
| STTプロバイダー | Whisper固定 | 10+プロバイダー選択可 |
| TTSプロバイダー | OpenAI固定 | 10+プロバイダー選択可 |
| LLMプロバイダー | GPT-4o固定 | 15+プロバイダー選択可 |
| WebRTC | ✅ | ✅ |
| 電話統合 | ❌ | ✅ |
| ビデオ | ❌ | ✅ |
| カスタムパイプライン | ❌ | ✅ |
| オンプレミス | ❌ | ✅ (Ollama等) |
| 日本語サポート | ✅ | △ (プロバイダー依存) |

### コスト比較 (月間1000時間の音声処理想定)

| 項目 | 現在 | Pipecat (最適化後) |
|------|------|-------------------|
| STT | $0 (Realtime含む) | $100-500 (Deepgram/AssemblyAI) |
| LLM | ~$2000 (Realtime) | $500-1500 (選択可) |
| TTS | $0 (Realtime含む) | $200-800 (ElevenLabs/Cartesia) |
| **合計** | ~$2000 | $800-2800 |

### 移行リスク評価

| リスク | 影響度 | 対策 |
|-------|--------|------|
| 言語変更 (Node.js→Python) | 高 | 段階的移行、API層維持 |
| レイテンシ増加 | 中 | Cartesia等の低レイテンシTTS選択 |
| 日本語音声品質 | 中 | ElevenLabs日本語モデル検証 |
| 開発工数 | 高 | 3-6ヶ月想定 |

---

## 移行計画案

### Phase 1: PoC (2週間)
1. Pipecat開発環境構築
2. 基本的な音声対話実装
3. 日本語STT/TTS品質検証

### Phase 2: コア機能移行 (4週間)
1. Function Tools移植
2. 動的プロンプト生成移植
3. Agent設定システム移植

### Phase 3: 統合テスト (2週間)
1. E2Eテスト
2. パフォーマンス検証
3. 本番環境検証

### Phase 4: 本番移行 (2週間)
1. カナリアリリース
2. 段階的トラフィック移行
3. 旧システム廃止

### 推定工数: 10週間 (2.5ヶ月)

---

## 推奨構成 (移行後)

```python
# Pipecat パイプライン構成案
pipeline = Pipeline([
    # Transport
    WebRTCTransport(),

    # STT
    DeepgramSTTService(language="ja"),

    # LLM
    OpenAILLMService(model="gpt-4o"),  # または Anthropic Claude

    # TTS
    CartesiaTTSService(voice="japanese-female"),

    # Custom Processors
    FunctionToolProcessor(tools=voice_tools),
    PromptGeneratorProcessor(),
])
```

---

## 結論・推奨

### 短期 (0-6ヶ月): 現状維持
- OpenAI Realtime APIは安定稼働中
- 即時の移行必要性は低い

### 中期 (6-12ヶ月): PoC実施推奨
- Pipecatでの日本語音声品質検証
- マルチプロバイダー構成のコスト検証
- 電話統合ニーズがあれば優先度UP

### 長期 (12ヶ月+): 移行検討
- ベンダーロックイン回避
- マルチモーダル拡張
- コスト最適化

---

## 参考リンク

- [Pipecat GitHub](https://github.com/pipecat-ai/pipecat)
- [Pipecat Documentation](https://docs.pipecat.ai/getting-started/overview)
- [AWS Blog: Building Voice Agents with Pipecat](https://aws.amazon.com/blogs/machine-learning/building-intelligent-ai-voice-agents-with-pipecat-and-amazon-bedrock-part-1/)
- [AssemblyAI Pipecat Guide](https://www.assemblyai.com/docs/voice-agents/pipecat-intro-guide)
- [NVIDIA NIM Voice Agent Blueprint](https://build.nvidia.com/pipecat/voice-agent-framework-for-conversational-ai)

---

**作成日**: 2024-12-06
**作成者**: ツバキ (Miyabi Agent)
