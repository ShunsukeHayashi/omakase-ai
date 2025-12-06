# ローカルLLM実行環境とファインチューニング調査

## Issue: #1100

## 1. 概要

ローカルLLM実行環境を調査し、Miyabiフレームワークでの活用方法を検討する。

---

## 2. 主要ローカルLLM実行環境

### 2.1 Ollama

| 項目 | 内容 |
|------|------|
| 公式サイト | https://ollama.ai |
| 対応OS | macOS, Linux, Windows |
| 特徴 | シンプルなCLI、Docker風のモデル管理 |
| GPU | Apple Silicon (Metal), NVIDIA CUDA |

**インストール:**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

**基本操作:**
```bash
ollama pull llama3.2        # モデルダウンロード
ollama run llama3.2         # 対話実行
ollama serve                # APIサーバー起動 (localhost:11434)
```

**API:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Hello"
}'
```

**Miyabi統合案:**
- MCP Server経由でOllama APIを呼び出し
- ローカル推論によるプライバシー保護タスク
- コスト削減（API課金なし）

---

### 2.2 llama.cpp

| 項目 | 内容 |
|------|------|
| GitHub | https://github.com/ggerganov/llama.cpp |
| 言語 | C/C++ |
| 特徴 | 高速推論、量子化対応(GGUF)、低メモリ |
| GPU | Metal, CUDA, Vulkan, SYCL |

**ビルド:**
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make -j

# Metal (macOS)
make LLAMA_METAL=1

# CUDA (Linux/Windows)
make LLAMA_CUDA=1
```

**実行:**
```bash
./llama-cli -m models/llama-3.2-8b-q4_k_m.gguf -p "Hello" -n 128
```

**サーバーモード:**
```bash
./llama-server -m model.gguf --host 0.0.0.0 --port 8080
```

**量子化レベル:**
| 形式 | サイズ削減 | 品質影響 |
|------|----------|---------|
| Q8_0 | ~50% | 最小 |
| Q4_K_M | ~75% | 低 |
| Q4_0 | ~75% | 中 |
| Q2_K | ~87% | 高 |

**Miyabi統合案:**
- 高速推論が必要なリアルタイム処理
- エッジデバイスでの実行
- カスタム量子化モデル運用

---

### 2.3 vLLM

| 項目 | 内容 |
|------|------|
| GitHub | https://github.com/vllm-project/vllm |
| 言語 | Python |
| 特徴 | PagedAttention、高スループット、本番向け |
| GPU | NVIDIA CUDA必須 |

**インストール:**
```bash
pip install vllm
```

**サーバー起動:**
```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.2-8B-Instruct \
  --port 8000
```

**API (OpenAI互換):**
```bash
curl http://localhost:8000/v1/chat/completions -d '{
  "model": "meta-llama/Llama-3.2-8B-Instruct",
  "messages": [{"role": "user", "content": "Hello"}]
}'
```

**特徴:**
- PagedAttention: メモリ効率最大化
- Continuous Batching: 高スループット
- OpenAI互換API: 既存コード流用可能

**Miyabi統合案:**
- 本番環境での大規模推論
- マルチテナント対応
- OpenAI APIからの移行

---

### 2.4 LocalAI

| 項目 | 内容 |
|------|------|
| GitHub | https://github.com/mudler/LocalAI |
| 特徴 | OpenAI API完全互換、マルチモーダル |
| 対応 | llama.cpp, Whisper, Stable Diffusion統合 |

**Docker起動:**
```bash
docker run -p 8080:8080 localai/localai:latest
```

---

### 2.5 LM Studio

| 項目 | 内容 |
|------|------|
| 公式 | https://lmstudio.ai |
| 特徴 | GUIアプリ、ドラッグ&ドロップ |
| 対応 | GGUF形式、ローカルサーバー機能 |

---

## 3. ファインチューニング手法

### 3.1 LoRA (Low-Rank Adaptation)

**概要:** 重みの低ランク分解による効率的なファインチューニング

**メリット:**
- 学習パラメータ数: 0.1%程度
- VRAM: 8GB程度で可能
- 元モデル重み保持

**ツール:**
```bash
# Unsloth (高速LoRA)
pip install unsloth

# PEFT (Hugging Face)
pip install peft
```

**Unsloth例:**
```python
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=2048,
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,              # LoRAランク
    lora_alpha=16,
    lora_dropout=0,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
)
```

### 3.2 QLoRA

**概要:** 量子化 + LoRA

**メリット:**
- 4bit量子化で更にVRAM削減
- 消費者GPU (RTX 3090/4090) で実行可能

### 3.3 Full Fine-tuning

**概要:** 全パラメータ更新

**要件:**
- 7Bモデル: 80GB+ VRAM (A100等)
- 分散学習: DeepSpeed, FSDP

---

## 4. Miyabi統合アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    Miyabi Framework                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │ Claude API   │   │ Local LLM    │   │ Hybrid Mode  │ │
│  │ (Primary)    │   │ (Fallback)   │   │ (Router)     │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘ │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            ▼                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              MCP Server: miyabi-local-llm            │ │
│  │  - ollama_generate                                   │ │
│  │  - llama_cpp_generate                                │ │
│  │  - vllm_generate                                     │ │
│  │  - model_switch                                      │ │
│  │  - health_check                                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                            │                             │
└────────────────────────────┼─────────────────────────────┘
                             ▼
          ┌──────────────────────────────────┐
          │         Local LLM Backends        │
          ├──────────┬──────────┬────────────┤
          │  Ollama  │llama.cpp │   vLLM     │
          │ :11434   │  :8080   │   :8000    │
          └──────────┴──────────┴────────────┘
```

---

## 5. ユースケース

### 5.1 プライバシー重視タスク
- 機密コードレビュー
- 社内ドキュメント処理
- 個人情報含むデータ分析

### 5.2 コスト最適化
- 大量バッチ処理
- 開発・テスト環境
- 低優先度タスク

### 5.3 カスタムモデル
- ドメイン特化ファインチューニング
- 企業固有用語学習
- コーディングスタイル適応

### 5.4 オフライン対応
- ネットワーク制限環境
- エアギャップ環境
- 災害時フォールバック

---

## 6. 推奨構成

### 開発環境 (Apple Silicon Mac)
| 項目 | 推奨 |
|------|------|
| ツール | Ollama |
| モデル | Llama 3.2 8B Q4_K_M |
| RAM | 16GB+ |

### 本番環境 (NVIDIA GPU)
| 項目 | 推奨 |
|------|------|
| ツール | vLLM |
| モデル | Llama 3.2 8B/70B |
| GPU | A100 40GB+ |

### ファインチューニング
| 項目 | 推奨 |
|------|------|
| 手法 | QLoRA (Unsloth) |
| GPU | RTX 4090 24GB |
| データ | 1000-10000サンプル |

---

## 7. 実装ロードマップ

| Phase | 内容 | 期間 |
|-------|------|------|
| 1 | miyabi-local-llm MCP Server作成 | - |
| 2 | Ollama統合・テスト | - |
| 3 | LoRAファインチューニングパイプライン | - |
| 4 | ハイブリッドルーティング実装 | - |

---

## 8. 参考リンク

- Ollama: https://ollama.ai
- llama.cpp: https://github.com/ggerganov/llama.cpp
- vLLM: https://github.com/vllm-project/vllm
- Unsloth: https://github.com/unslothai/unsloth
- PEFT: https://github.com/huggingface/peft
- LocalAI: https://github.com/mudler/LocalAI
