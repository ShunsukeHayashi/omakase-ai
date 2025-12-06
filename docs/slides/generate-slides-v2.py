#!/usr/bin/env python3
"""
omakase.ai Business Plan Slide Generator v2
Using Google Gemini 2.0 Flash Image Generation
"""

import os
import base64
from pathlib import Path
import google.generativeai as genai
from PIL import Image
import io

# Configuration
OUTPUT_DIR = Path("/Users/shunsuke/Dev/omakase_ai/docs/slides/images")
OUTPUT_DIR.mkdir(exist_ok=True)

# Configure Gemini API
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

genai.configure(api_key=GOOGLE_API_KEY)

# Use image generation model
model = genai.GenerativeModel('gemini-2.0-flash-exp-image-generation')

# Global style prefix
STYLE_PREFIX = """Generate a hand-drawn whiteboard-style infographic illustration.

Style requirements:
- Hand-drawn sketch aesthetic with marker pen textures
- Black marker outlines with yellow, orange, blue, green, and purple accents
- Friendly, approachable startup pitch deck feel
- Simple stick figures for people
- Paper texture white background
- NOT polished digital art - embrace imperfections
- ALL text labels must be in JAPANESE

"""

# Slide prompts
SLIDES = [
    {
        "id": "01_title",
        "title": "タイトル",
        "prompt": """Create a title slide for "omakase.ai" voice AI shopping assistant.

Scene: Large smartphone in center with colorful sound waves coming out. Speech bubbles with Japanese text "カートに入れて" and "おすすめ教えて". Shopping cart icons, clothing, shoes floating around. Happy stick figure talking to phone.

Japanese text to include:
- "omakase.ai" (large logo at top)
- "声で買い物、新体験" (subtitle)
- "EC向け音声AIショッピングアシスタント" (bottom)

Style: Exciting, innovative, colorful sound waves in purple and blue
"""
    },
    {
        "id": "02_problem",
        "title": "課題",
        "prompt": """Create a problem visualization slide.

Scene: Stressed stick figure store owner holding head. Heavy rocks/boulders crushing down labeled with business problems. Downward red arrow graph (declining sales). Upward red arrow graph (rising costs). Dark cloudy mood.

Japanese text on rocks:
- "CVR向上の限界"
- "カゴ落ち率70%"
- "サポート人件費↑"
- "広告費高騰"

Bottom annotation: "従来の施策では限界..."

Style: Stressful mood, gray and red tones
"""
    },
    {
        "id": "03_solution",
        "title": "解決策",
        "prompt": """Create a solution slide showing AI solving problems.

Scene: Friendly robot character with superhero cape shooting light rays. Light rays shatter dark rocks into sparkling crystals. Previously stressed store owner now happy with thumbs up. Bright yellow sunburst background.

Japanese text on crystals:
- "CVR +35%向上" (green)
- "カゴ落ち回収" (blue)
- "24時間AI対応" (purple)
- "5分で導入" (orange)

Bottom: "音声AIで、お客様の「欲しい」を逃さない"

Style: Hopeful, bright, problem-solved feeling
"""
    },
    {
        "id": "04_market",
        "title": "市場機会",
        "prompt": """Create a blue ocean market opportunity slide.

Scene: Blue wavy ocean with treasure island in center. Flag with "omakase.ai" planted on island. Small competitor ships far away in ocean. Upward growth arrow showing "$9.9B" market. Golden treasure chest on island.

Japanese text:
- "日本市場: 競合0社" (above island with red star)
- "2030年 $9.9B市場" (on growth arrow)
- "CAGR 28.3%" (badge)
- "今がチャンス！" (orange, near flag)

Bottom: "完全なブルーオーシャン"

Style: Blue ocean gradients, gold accents, expansive feeling
"""
    },
    {
        "id": "05_business",
        "title": "ビジネスモデル",
        "prompt": """Create a business model revenue pie chart slide.

Scene: Large hand-drawn pie chart in center with 4 colored sections. Three pricing boxes below showing plans. Coins falling from top. Stick figures representing customers.

Pie chart sections:
- Blue 70%: "SaaS月額"
- Green 15%: "従量課金"
- Yellow 10%: "カスタマイズ"
- Red 5%: "成果報酬"

Pricing boxes:
- "Starter ¥3万"
- "Growth ¥8万"
- "Business ¥20万"

Badges: "LTV/CAC 16.7倍" (gold), "Payback 2ヶ月"

Style: Professional, clear business diagram
"""
    },
    {
        "id": "06_roadmap",
        "title": "成長ロードマップ",
        "prompt": """Create a 3-year growth roadmap slide.

Scene: Road/path from left to right, gradually widening and going uphill. Three milestone flags on road. Goal flag at end. Green hills background.

Milestone flags (left to right):
- "Year 1: ¥97M" with "50社"
- "Year 2: ¥560M" with "200社"
- "Year 3: ¥1.8B" with "500社"

Road labels: "PMF → 成長 → スケール"
Goal flag: "市場リーダー"

Bottom: "着実に、しかし大胆に成長"

Style: Dynamic, ambitious, hopeful green landscape
"""
    },
    {
        "id": "07_moat",
        "title": "競争優位",
        "prompt": """Create a competitive moat castle defense slide.

Scene: Medieval castle in center with 4 concentric water moats around it. Small boats outside trying to approach but blocked. Flags on castle tower.

Moat labels (outer to inner):
- "データモート" (blue)
- "ネットワーク効果" (green)
- "ブランド信頼" (purple)
- "スイッチングコスト" (orange)

Castle flags: "日本品質", "EC特化"

Bottom: "模倣困難な資産を構築"

Style: Medieval fantasy but friendly, blue glowing moats
"""
    },
    {
        "id": "08_closing",
        "title": "まとめ",
        "prompt": """Create a closing CTA slide with tagline.

Scene: Large purple megaphone in center. Coins, products, hearts flying out of megaphone. Happy stick figures around (store owner and customer). Rising graph, stars, sparkles in background. Orange CTA button shape.

Main text (large, center): 「その声が、売上になる。」

Other Japanese text:
- "omakase.ai" (logo at bottom)
- "無料トライアル実施中" (orange button)
- "5分で導入、成果を実感"

Bottom: "日本のECを、音声AIで変える"

Style: Celebratory, call to action, purple brand color accent
"""
    }
]


def generate_slide(slide_info: dict, index: int):
    """Generate a single slide image"""
    print(f"\nGenerating Slide {index + 1}/8: {slide_info['title']}")

    full_prompt = STYLE_PREFIX + slide_info['prompt']

    try:
        response = model.generate_content(full_prompt)

        # Check for image parts
        if response.candidates:
            for candidate in response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            mime_type = part.inline_data.mime_type
                            data = part.inline_data.data

                            # Decode if base64 string
                            if isinstance(data, str):
                                image_bytes = base64.b64decode(data)
                            else:
                                image_bytes = data

                            # Save image
                            output_path = OUTPUT_DIR / f"slide_{slide_info['id']}.png"
                            with open(output_path, 'wb') as f:
                                f.write(image_bytes)

                            print(f"  ✅ Saved: {output_path.name}")
                            return True

        # If no image, check for text response
        if response.text:
            print(f"  ℹ️ Text response: {response.text[:200]}...")

        print(f"  ❌ No image generated")
        return False

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def main():
    print("=" * 50)
    print("omakase.ai Slide Generator")
    print("Model: gemini-2.0-flash-exp-image-generation")
    print("=" * 50)

    results = []
    for i, slide in enumerate(SLIDES):
        success = generate_slide(slide, i)
        results.append(success)

    print("\n" + "=" * 50)
    print(f"Results: {sum(results)}/{len(results)} slides generated")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 50)


if __name__ == "__main__":
    main()
