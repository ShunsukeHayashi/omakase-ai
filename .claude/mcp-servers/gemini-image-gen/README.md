# Gemini Image Generation MCP Server

Gemini APIを使用した画像生成・編集MCPサーバー。

## 機能

| ツール | 説明 |
|--------|------|
| `generate_image` | テキストプロンプトから画像生成 |
| `edit_image` | 既存画像の編集 |
| `describe_image` | 画像の詳細説明生成 |

## 環境変数

```bash
GEMINI_API_KEY=your-api-key      # 必須: Google AI Studio APIキー
GEMINI_OUTPUT_DIR=/path/to/output # オプション: 出力ディレクトリ
```

## インストール

```bash
cd .claude/mcp-servers/gemini-image-gen
npm install
```

## 使用例

### 画像生成
```json
{
  "tool": "generate_image",
  "arguments": {
    "prompt": "A futuristic city with flying cars",
    "aspect_ratio": "16:9",
    "output_format": "base64",
    "num_images": 2
  }
}
```

### 画像編集
```json
{
  "tool": "edit_image",
  "arguments": {
    "image_source": "/path/to/image.png",
    "prompt": "Change the sky to sunset colors",
    "output_format": "url"
  }
}
```

### 画像説明
```json
{
  "tool": "describe_image",
  "arguments": {
    "image_source": "data:image/png;base64,...",
    "detail_level": "comprehensive"
  }
}
```

## 出力フォーマット

- `base64`: インラインBase64データ（Claude UI表示向け）
- `url`: ファイルパス保存（後続処理向け）

## レート制限

- 10リクエスト/分
- 超過時は自動的にエラーメッセージで待機時間を通知

## エラーハンドリング

| エラータイプ | 説明 |
|-------------|------|
| `RATE_LIMIT_ERROR` | レート制限超過 |
| `AUTH_ERROR` | APIキー認証エラー |
| `VALIDATION_ERROR` | パラメータ不正 |
| `QUOTA_ERROR` | APIクォータ超過 |
| `CONTENT_FILTER_ERROR` | コンテンツ安全フィルター |
