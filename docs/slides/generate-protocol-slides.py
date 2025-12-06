#!/usr/bin/env python3
"""
omakase.ai Protocol Flow Slides Generator
Using Google Gemini 3 Pro Image Preview (Nano Banana Pro)

Based on: omakase-ai-protocol.puml
"""

import os
from pathlib import Path

from google import genai
from google.genai import types

# Configuration
OUTPUT_DIR = Path("/Users/shunsuke/Dev/omakase_ai/docs/slides/protocol-images")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# API Setup
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable")

client = genai.Client(api_key=GOOGLE_API_KEY)
MODEL = "models/gemini-3-pro-image-preview"  # Nano Banana Pro

# Style prefix
STYLE_PREFIX = """Create a hand-drawn whiteboard-style technical infographic illustration.

STYLE REQUIREMENTS:
- Hand-drawn sketch aesthetic with marker pen and crayon textures
- Black marker outlines with yellow, orange, blue, green, purple color accents
- Technical diagram style but friendly and approachable
- Simple icons for servers, devices, and connections
- White paper texture background
- Hand-drawn arrows showing data flow
- ALL visible text labels MUST be in JAPANESE
- High resolution, detailed illustration

"""

# Protocol slides based on the PlantUML sequence diagram
SLIDES = [
    {
        "id": "01_overview",
        "title": "システム概要",
        "prompt": """Create a system architecture overview slide for omakase.ai voice AI platform.

VISUAL ELEMENTS:
- Center: Large smartphone icon (User/Browser)
- Left side: omakase.ai Widget box
- Right side: Cloud services arranged in layers:
  - Clerk (Authentication) - green box
  - VAPI (Voice AI) - purple box
  - Daily.co (WebRTC) - blue box
- Bottom: Two AI agent icons labeled "Vapi Speaker" and "Vapi Listener"
- Hand-drawn arrows connecting all components
- Sound waves between user and widget

TEXT LABELS (Japanese):
- "omakase.ai" at top as title
- "音声AIプロトコル概要" as subtitle
- "ユーザー" near smartphone
- "Widget" on widget box
- "認証" on Clerk
- "音声AI" on VAPI
- "WebRTC" on Daily.co
- "Speaker" and "Listener" on AI agents

ANNOTATIONS:
- "WebSocket" label on connections
- "RTP音声" label on audio streams

MOOD: Technical but approachable, educational
COLORS: Blue for WebRTC, Purple for VAPI, Green for Auth
"""
    },
    {
        "id": "02_auth_phase",
        "title": "認証フェーズ",
        "prompt": """Create an authentication phase diagram slide.

VISUAL ELEMENTS:
- Left: User icon clicking a "通話開始" button
- Center: omakase.ai Widget box
- Right: Clerk authentication server (green box with lock icon)
- Hand-drawn arrow from Widget to Clerk
- Return arrow with checkmark showing "200 OK"
- JWT token icon (golden key shape)

FLOW (numbered steps):
1. User clicks "Start Call" button
2. Widget sends POST /sessions/{id}/touch
3. Clerk validates session
4. Returns 200 OK with session token

TEXT LABELS (Japanese):
- "認証フェーズ" as title
- "① 通話開始クリック"
- "② セッション検証"
- "③ JWT トークン発行"
- "Clerk認証サーバー"
- "セッション有効" with green checkmark

MOOD: Step-by-step process, secure feeling
COLORS: Green for success, gold for tokens
"""
    },
    {
        "id": "03_vapi_init",
        "title": "VAPI初期化",
        "prompt": """Create a VAPI call initialization diagram slide.

VISUAL ELEMENTS:
- Left: Widget box
- Right: VAPI API server (purple cloud icon)
- Large POST request arrow going right
- Response arrow coming back with room info
- JSON-like data blocks (hand-drawn)
- Room URL icon (link symbol)
- WebRTC icon

REQUEST DATA shown:
- assistantId
- page_context (product info)

RESPONSE DATA shown:
- call id
- webCallUrl
- transport: "daily"
- listenUrl, controlUrl

TEXT LABELS (Japanese):
- "VAPI通話初期化" as title
- "POST /call/web"
- "assistantId: 91eb9aaa..."
- "商品コンテキスト送信"
- "通話ルーム作成"
- "Daily.co URL取得"

MOOD: API request/response, technical
COLORS: Purple for VAPI, blue highlights
"""
    },
    {
        "id": "04_daily_setup",
        "title": "Daily.co接続",
        "prompt": """Create a Daily.co WebRTC connection setup diagram.

VISUAL ELEMENTS:
- Left: Widget loading SDK
- Center: Daily.co signaling server (blue tower icon)
- Right: SFU server (blue cloud with multiple connections)
- SDK package icon (v0.85.0 label)
- ICE servers shown as small icons:
  - Cloudflare STUN (orange)
  - Twilio TURN (green)
- WebSocket upgrade arrow

FLOW steps:
1. Load daily-js SDK
2. POST /rooms/check
3. Get ICE configuration
4. WebSocket connect to SFU

TEXT LABELS (Japanese):
- "Daily.co接続セットアップ" as title
- "SDK読み込み (v0.85.0)"
- "ルーム確認"
- "ICE設定取得"
- "STUN/TURNサーバー"
- "WebSocket接続"
- "SFUトポロジー"

MOOD: Network setup, infrastructure
COLORS: Blue gradient for Daily.co components
"""
    },
    {
        "id": "05_webrtc_transport",
        "title": "WebRTCトランスポート",
        "prompt": """Create a WebRTC transport setup diagram.

VISUAL ELEMENTS:
- Central SFU server box
- Two transport pipes:
  - Green pipe: "send" direction (left to center)
  - Blue pipe: "recv" direction (center to left)
- ICE candidate boxes showing:
  - UDP port 43083
  - TCP port 42675
- DTLS fingerprint icon (lock with fingerprint)
- Connection established checkmarks

FLOW:
1. create-transport (send)
2. create-transport (recv)
3. Get transportOptions
4. connect-transport with DTLS parameters

TEXT LABELS (Japanese):
- "WebRTCトランスポート設定" as title
- "送信トランスポート" (green)
- "受信トランスポート" (blue)
- "ICE候補"
- "DTLS暗号化"
- "接続完了 ✓"

MOOD: Technical plumbing, bidirectional
COLORS: Green for send, Blue for receive
"""
    },
    {
        "id": "06_audio_publish",
        "title": "音声トラック公開",
        "prompt": """Create an audio track publishing diagram.

VISUAL ELEMENTS:
- Left: Microphone icon with sound waves
- Center: Widget processing audio
- Right: SFU distributing to listeners
- Audio codec info box (Opus, 48kHz)
- Producer ID label
- Track visualization (waveform)

FLOW:
1. Capture audio from microphone
2. send-track to SFU
3. Get producerId back
4. Track ready for distribution

TEXT LABELS (Japanese):
- "音声トラック公開" as title
- "マイク入力"
- "Opusコーデック (48kHz)"
- "send-track"
- "producerId取得"
- "cam-audio タグ"

MOOD: Audio streaming, technical
COLORS: Purple for audio, orange accents
"""
    },
    {
        "id": "07_agents_join",
        "title": "AIエージェント参加",
        "prompt": """Create a diagram showing VAPI agents joining the call.

VISUAL ELEMENTS:
- Central meeting room visualization (circular table metaphor)
- Three participants around the table:
  - User (human stick figure, left)
  - Vapi Speaker (robot icon with mouth, top right)
  - Vapi Listener (robot icon with ear, bottom right)
- sig-presence arrows showing each joining
- "accepting-calls" status badges
- SFU in background orchestrating

AGENT INFO:
- Vapi Speaker: generates voice responses
- Vapi Listener: processes user speech

TEXT LABELS (Japanese):
- "AIエージェント参加" as title
- "ユーザー"
- "Vapi Speaker"
- "Vapi Listener"
- "sig-presence"
- "通話受付中"
- "参加者: 3名"

MOOD: Meeting room, collaborative
COLORS: Blue for user, Purple for Speaker, Green for Listener
"""
    },
    {
        "id": "08_voice_loop",
        "title": "音声会話ループ",
        "prompt": """Create a voice conversation loop diagram.

VISUAL ELEMENTS:
- Circular flow diagram showing the conversation loop
- User speaking (microphone icon with waves)
- Arrow to Vapi Listener (processing icon)
- Arrow to VAPI cloud (brain/AI icon)
- Arrow to Vapi Speaker (speaker icon)
- Arrow back to User (headphone icon)
- RTP packets visualization on each arrow
- Loop indicator (circular arrow)

LOOP STEPS:
1. User speaks into microphone
2. Audio RTP to SFU
3. SFU forwards to Vapi Listener
4. VAPI processes speech (STT → LLM → TTS)
5. Vapi Speaker sends response audio
6. SFU forwards to Widget
7. User hears response

TEXT LABELS (Japanese):
- "音声会話ループ" as title
- "話す" (speak)
- "聴く" (listen)
- "処理" (process)
- "応答生成" (generate response)
- "RTPパケット"
- "双方向ストリーミング"

MOOD: Dynamic, continuous flow
COLORS: Rainbow gradient following the loop
"""
    },
    {
        "id": "09_token_refresh",
        "title": "トークン更新",
        "prompt": """Create a token refresh mechanism diagram.

VISUAL ELEMENTS:
- Timeline at bottom showing ~45 second intervals
- Widget box on left
- Clerk server on right
- Repeating pattern of token refresh arrows
- Clock icon showing timing
- Old token (faded) being replaced by new token (bright)
- JWT token icons (golden keys)

FLOW:
- Every ~45 seconds
- POST /sessions/{id}/tokens
- Receive new JWT token
- Session remains valid

TEXT LABELS (Japanese):
- "トークン自動更新" as title
- "~45秒間隔"
- "POST /sessions/{id}/tokens"
- "新しいJWT"
- "セッション継続"
- "セキュリティ維持"

MOOD: Automatic, secure, reliable
COLORS: Gold for tokens, green for security
"""
    },
    {
        "id": "10_session_end",
        "title": "セッション終了",
        "prompt": """Create a session end/cleanup diagram.

VISUAL ELEMENTS:
- User clicking "End Call" button (red)
- Disconnect arrow to SFU
- Room being deleted (X mark or trash icon)
- Clean disconnect visualization
- All connections closing gracefully
- "roomDeleteOnUserLeaveEnabled: true" indicator

CLEANUP STEPS:
1. User clicks End Call
2. Widget disconnects from SFU
3. WebSocket connection closed
4. Room automatically deleted

TEXT LABELS (Japanese):
- "セッション終了" as title
- "通話終了"
- "切断"
- "ルーム自動削除"
- "クリーンアップ完了"
- "接続終了"

MOOD: Clean ending, graceful shutdown
COLORS: Red for end, gray for cleanup
"""
    }
]


def generate_slide(slide_info: dict, index: int, total: int) -> bool:
    """Generate a single slide image"""
    print(f"\n{'='*50}")
    print(f"Generating Slide {index + 1}/{total}: {slide_info['title']}")
    print(f"{'='*50}")

    full_prompt = STYLE_PREFIX + slide_info['prompt']

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[full_prompt],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE', 'TEXT'],
            )
        )

        image_saved = False
        for part in response.parts:
            if hasattr(part, 'text') and part.text:
                print(f"  Text: {part.text[:80]}...")

            if hasattr(part, 'inline_data') and part.inline_data:
                output_path = OUTPUT_DIR / f"protocol_{slide_info['id']}.png"

                if hasattr(part, 'as_image'):
                    image = part.as_image()
                    image.save(str(output_path))
                else:
                    import base64
                    data = part.inline_data.data
                    if isinstance(data, str):
                        data = base64.b64decode(data)
                    with open(output_path, 'wb') as f:
                        f.write(data)

                file_size = output_path.stat().st_size / 1024
                print(f"  ✅ Saved: {output_path.name} ({file_size:.1f} KB)")
                image_saved = True

        if not image_saved:
            print(f"  ❌ No image in response")
            return False

        return True

    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("omakase.ai Protocol Flow Slides Generator")
    print(f"Model: {MODEL} (Nano Banana Pro)")
    print("Based on: omakase-ai-protocol.puml")
    print("=" * 60)

    results = []
    total = len(SLIDES)

    for i, slide in enumerate(SLIDES):
        success = generate_slide(slide, i, total)
        results.append(success)

    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} slides generated")
    print(f"Output: {OUTPUT_DIR.absolute()}")
    print("=" * 60)

    print("\nGenerated files:")
    for f in sorted(OUTPUT_DIR.glob("*.png")):
        print(f"  - {f.name} ({f.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
