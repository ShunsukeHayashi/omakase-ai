#!/usr/bin/env python3
"""
omakase.ai Business Plan Slide Generator
Using Google Gemini 3 Pro Image Preview (Nano Banana Pro)
"""

import os
from pathlib import Path

# Use the new google-genai SDK
from google import genai
from google.genai import types

# Configuration
OUTPUT_DIR = Path("/Users/shunsuke/Dev/omakase_ai/docs/slides/images")
OUTPUT_DIR.mkdir(exist_ok=True)

# Configure client
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

client = genai.Client(api_key=GOOGLE_API_KEY)

# Model - using Gemini 3 Pro Image Preview
MODEL = "models/gemini-2.0-flash-exp-image-generation"  # Fallback model if 3 not available

# Try to use Gemini 3 Pro Image if available
try:
    # Check available models
    models = client.models.list()
    for m in models:
        if 'gemini-3-pro-image' in m.name.lower() or 'gemini-2.5-flash-image' in m.name.lower():
            MODEL = m.name
            break
except:
    pass

print(f"Using model: {MODEL}")

# Global style prefix
STYLE_PREFIX = """Create a hand-drawn whiteboard-style infographic illustration.

STYLE REQUIREMENTS:
- Hand-drawn sketch aesthetic with marker pen and crayon textures
- Black marker outlines with yellow, orange, blue, green, purple color accents
- Friendly, approachable startup pitch deck visual style
- Simple stick figures for people characters
- White paper texture background
- NOT polished digital art - embrace imperfections and human touch
- ALL visible text labels MUST be in JAPANESE

"""

# Slide prompts
SLIDES = [
    {
        "id": "01_title",
        "title": "タイトル",
        "prompt": """Create a title slide for a voice AI shopping assistant called "omakase.ai"

VISUAL ELEMENTS:
- Large smartphone illustration in center with colorful sound waves (purple/blue gradients) emanating from screen
- Speech bubbles around phone with Japanese text: "カートに入れて" and "おすすめ教えて"
- Small floating icons: shopping cart, clothing items, shoes, food products
- Happy stick figure person talking to the smartphone

TEXT LABELS (Japanese, hand-written style):
- "omakase.ai" as large hand-drawn logo at top
- "声で買い物、新体験" as subtitle in center
- "EC向け音声AIショッピングアシスタント" at bottom

MOOD: Exciting, innovative, welcoming, tech-forward
"""
    },
    {
        "id": "02_problem",
        "title": "課題",
        "prompt": """Create a problem visualization slide showing e-commerce business owner pain points.

VISUAL ELEMENTS:
- Stressed stick figure store owner holding head, worried expression
- Large heavy boulders/rocks crushing down on the person
- Downward red arrow graph on left side (declining sales)
- Upward red arrow graph on right side (rising costs)
- Stack of email/message icons in background (support requests piling up)
- Dark cloudy atmosphere, grayish mood

TEXT LABELS on rocks (Japanese):
- "CVR向上の限界"
- "カゴ落ち率70%"
- "サポート人件費↑"
- "広告費高騰"

ANNOTATION at bottom: "従来の施策では限界..."

MOOD: Stressful, pressured, seeking solution
COLORS: Gray, red tones for negative feeling
"""
    },
    {
        "id": "03_solution",
        "title": "解決策",
        "prompt": """Create a solution slide showing AI solving business problems.

VISUAL ELEMENTS:
- Friendly robot character (stick figure style) wearing superhero cape
- Robot shooting bright light rays that shatter dark problem rocks
- From shattered rocks, sparkling colorful crystals emerge
- The previously stressed store owner now happy with thumbs up gesture
- Bright yellow sunburst effect in background

TEXT LABELS on crystals (Japanese):
- "CVR +35%向上" (green crystal)
- "カゴ落ち回収" (blue crystal)
- "24時間AI対応" (purple crystal)
- "5分で導入" (orange crystal)

ANNOTATION: "音声AIで、お客様の「欲しい」を逃さない"

MOOD: Hopeful, powerful, triumphant, problem-solved
COLORS: Bright yellows, positive greens and blues
"""
    },
    {
        "id": "04_market",
        "title": "市場機会",
        "prompt": """Create a blue ocean market opportunity slide.

VISUAL ELEMENTS:
- Blue wavy ocean illustration (hand-drawn waves)
- Treasure island in center with palm trees
- Flag planted on island with "omakase.ai" written on it (first mover!)
- Small competitor ships far away in ocean, haven't reached island yet
- Upward growth arrow showing market size trajectory
- Golden treasure chest on island, gold coins scattered
- Pie chart or circle showing market segment nearby

TEXT LABELS (Japanese):
- "日本市場: 競合0社" above island with red star marker
- "2030年 $9.9B市場" at growth arrow tip
- "CAGR 28.3%" as growth rate badge
- "今がチャンス！" in orange near the flag

ANNOTATION: "完全なブルーオーシャン"

MOOD: Expansive, full of possibility, first-mover advantage
COLORS: Blue ocean gradients, gold/treasure accents
"""
    },
    {
        "id": "05_business",
        "title": "ビジネスモデル",
        "prompt": """Create a business model revenue pie chart slide.

VISUAL ELEMENTS:
- Large hand-drawn pie chart in center with 4 colored sections
- Three pricing plan boxes below the chart
- Coins falling from top of image (revenue illustration)
- Stick figures representing different customer types below each plan

PIE CHART SECTIONS:
- Blue 70% labeled "SaaS月額"
- Green 15% labeled "従量課金"
- Yellow 10% labeled "カスタマイズ"
- Red 5% labeled "成果報酬"

PRICING BOXES (Japanese):
- "Starter ¥3万"
- "Growth ¥8万"
- "Business ¥20万"

BADGES (Japanese):
- "LTV/CAC 16.7倍" in gold badge, top right
- "Payback 2ヶ月" as metric

ANNOTATION: "高収益率 × 低解約率 = 持続的成長"

MOOD: Professional, clear, stable business
COLORS: Professional blue/green tones
"""
    },
    {
        "id": "06_roadmap",
        "title": "成長ロードマップ",
        "prompt": """Create a 3-year growth roadmap slide.

VISUAL ELEMENTS:
- Road/path stretching from left to right (hand-drawn)
- Road gradually widens and goes uphill (showing growth)
- Three milestone flags planted along the road
- Final goal flag at the end of road
- Green hills and landscape background
- Small cars or figures progressing along road

MILESTONE FLAGS (left to right, Japanese):
- Flag 1: "Year 1: ¥97M" with "50社" below
- Flag 2: "Year 2: ¥560M" with "200社" below
- Flag 3: "Year 3: ¥1.8B" with "500社" below

ROAD LABELS: "PMF → 成長 → スケール"
GOAL FLAG: "市場リーダー"

ANNOTATION: "着実に、しかし大胆に成長"

MOOD: Dynamic, ambitious, goal-oriented journey
COLORS: Green for growth, gold for milestones
"""
    },
    {
        "id": "07_moat",
        "title": "競争優位",
        "prompt": """Create a competitive moat castle defense slide.

VISUAL ELEMENTS:
- Medieval castle in center (hand-drawn, friendly style)
- Four concentric water moats/rings surrounding the castle
- Each moat has distinct color and label
- Small boats outside trying to approach but blocked by moats
- Castle tower with flags flying

MOAT LABELS (outer to inner, Japanese):
- Outermost moat (blue): "データモート"
- Second moat (green): "ネットワーク効果"
- Third moat (purple): "ブランド信頼"
- Innermost moat (orange): "スイッチングコスト"

CASTLE FLAGS: "日本品質", "EC特化"

ANNOTATION: "模倣困難な資産を構築"

MOOD: Secure, protected, sustainable advantage
STYLE: Medieval fantasy but friendly and approachable
COLORS: Blue glowing moats, warm castle tones
"""
    },
    {
        "id": "08_closing",
        "title": "まとめ",
        "prompt": """Create a closing call-to-action slide with the main tagline.

VISUAL ELEMENTS:
- Large megaphone in center (purple/indigo brand color)
- From megaphone: coins, products, hearts flying out energetically
- Happy stick figures around: store owner celebrating, satisfied customer
- Rising graph line, stars, sparkle effects scattered in background
- Orange button-shaped element for CTA

MAIN TEXT (large, center, Japanese hand-written):
「その声が、売上になる。」

OTHER LABELS (Japanese):
- "omakase.ai" as logo at bottom
- "無料トライアル実施中" on orange CTA button
- "5分で導入、成果を実感" as sub-message

ANNOTATION: "日本のECを、音声AIで変える"

MOOD: Celebratory, positive energy, inspiring action
COLORS: Purple brand accent, bright celebratory colors
"""
    }
]


def generate_slide(slide_info: dict, index: int) -> bool:
    """Generate a single slide image"""
    print(f"\n{'='*50}")
    print(f"Generating Slide {index + 1}/8: {slide_info['title']}")
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

        # Process response
        image_saved = False
        for part in response.parts:
            if hasattr(part, 'text') and part.text:
                print(f"  Text: {part.text[:100]}...")

            if hasattr(part, 'inline_data') and part.inline_data:
                # Save image
                output_path = OUTPUT_DIR / f"slide_{slide_info['id']}.png"

                # Get image data
                if hasattr(part, 'as_image'):
                    image = part.as_image()
                    image.save(str(output_path))
                else:
                    # Raw bytes
                    import base64
                    data = part.inline_data.data
                    if isinstance(data, str):
                        data = base64.b64decode(data)
                    with open(output_path, 'wb') as f:
                        f.write(data)

                print(f"  ✅ Saved: {output_path.name}")
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
    print("omakase.ai Business Plan Slide Generator")
    print(f"Model: {MODEL}")
    print("=" * 60)

    results = []
    for i, slide in enumerate(SLIDES):
        success = generate_slide(slide, i)
        results.append(success)

    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} slides generated")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    # List generated files
    print("\nGenerated files:")
    for f in sorted(OUTPUT_DIR.glob("*.png")):
        print(f"  - {f.name} ({f.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
