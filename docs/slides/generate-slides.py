#!/usr/bin/env python3
"""
omakase.ai Business Plan Slide Generator
Using Google Gemini 3 Pro Image Generation
"""

import os
import base64
import json
from pathlib import Path
import google.generativeai as genai

# Configuration
OUTPUT_DIR = Path("/Users/shunsuke/Dev/omakase_ai/docs/slides/images")
OUTPUT_DIR.mkdir(exist_ok=True)

# Configure Gemini API
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

genai.configure(api_key=GOOGLE_API_KEY)

# Use Gemini 2.0 Flash for image generation (experimental)
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Global style prefix for all prompts
STYLE_PREFIX = """
Create a hand-drawn whiteboard-style infographic illustration with these characteristics:
- Art style: Graphic recording / whiteboard sketch with marker pen textures
- Colors: Black marker outlines, with yellow/orange, blue/green, and purple accents
- Feel: Friendly, approachable, like a startup pitch deck sketch
- Include Japanese text labels as specified
- Simple stick figures for people
- Hand-drawn arrows, boxes, and connectors
- Paper texture background
- NOT polished digital art - embrace imperfections
"""

# Slide prompts in order
SLIDES = [
    {
        "id": "01_title",
        "title": "omakase.ai - 声で買い物、新体験",
        "prompt": """
A title slide for "omakase.ai" - a voice AI shopping assistant.

Visual elements:
- Large smartphone in center with colorful sound waves emanating from it
- Speech bubbles saying "カートに入れて" and "おすすめ教えて"
- Small shopping cart icons, clothing, shoes, food items floating around
- Happy stick figure talking to the phone

Text labels (Japanese):
- "omakase.ai" (large hand-drawn logo style at top)
- "声で買い物、新体験" (subtitle, center)
- "EC向け音声AIショッピングアシスタント" (description, bottom)
- "「話すだけ」でショッピングが完結" (annotation)

Mood: Exciting, innovative, welcoming
"""
    },
    {
        "id": "02_problem",
        "title": "EC事業者の悩み",
        "prompt": """
A problem slide showing EC business owner's pain points.

Visual elements:
- Stressed stick figure store owner holding head, looking worried
- Heavy rocks/boulders crushing down on them labeled with problems
- Downward red graph on left (declining sales)
- Upward red graph on right (increasing costs)
- Stack of email icons in background (support requests)
- Dark cloudy atmosphere

Text labels (Japanese):
- "CVR向上の限界" (on rock 1)
- "カゴ落ち率70%" (on rock 2)
- "サポート人件費↑" (on rock 3)
- "広告費高騰" (on rising cost graph)
- "従来の施策では限界..." (annotation at bottom)

Mood: Stressful, pressured, seeking solution
Colors: More gray/red tones to show negativity
"""
    },
    {
        "id": "03_solution",
        "title": "omakase.aiが解決",
        "prompt": """
A solution slide showing omakase.ai solving problems.

Visual elements:
- Superhero-style friendly AI robot character (stick figure with cape)
- Shooting bright light rays that shatter the problem rocks
- From shattered rocks, sparkling crystals emerge with positive outcomes
- The previously stressed store owner now smiling with thumbs up
- Sunburst effect in background (yellow/orange)

Text labels (Japanese):
- "CVR +35%向上" (green sparkle crystal)
- "カゴ落ち回収" (blue sparkle crystal)
- "24時間AI対応" (purple sparkle crystal)
- "5分で導入" (orange sparkle crystal)
- "音声AIで、お客様の「欲しい」を逃さない" (annotation)

Mood: Hopeful, powerful, problem-solved
Colors: Bright yellows, positive greens and blues
"""
    },
    {
        "id": "04_market",
        "title": "巨大市場、競合ゼロ",
        "prompt": """
A market opportunity slide showing blue ocean strategy.

Visual elements:
- Blue ocean (hand-drawn wavy water)
- Treasure island in center with "日本EC×音声AI" label
- omakase.ai flag planted on island (first mover!)
- Small competitor ships far away, haven't reached island yet
- Growth arrow pointing up with market size numbers
- Pie chart showing market segments nearby

Text labels (Japanese):
- "日本市場: 競合0社" (above island, with red star)
- "2030年 $9.9B市場" (at arrow tip)
- "CAGR 28.3%" (growth rate badge)
- "今がチャンス！" (next to flag, orange)
- "完全なブルーオーシャン" (annotation)

Mood: Expansive, full of possibility, first-mover advantage
Colors: Blue ocean gradients, gold for treasure
"""
    },
    {
        "id": "05_business_model",
        "title": "シンプルな収益モデル",
        "prompt": """
A business model slide showing revenue structure.

Visual elements:
- Large hand-drawn pie chart in center
  - Blue 70% (SaaS)
  - Green 15% (usage-based)
  - Yellow 10% (customization)
  - Red 5% (performance-based)
- Three pricing plan boxes: Starter, Growth, Business
- Stick figures representing each plan's target customer
- Coins falling from top (revenue illustration)

Text labels (Japanese):
- "SaaS月額 70%" (pie chart blue section)
- "従量課金 15%" (pie chart green section)
- "Starter ¥3万" "Growth ¥8万" "Business ¥20万" (plan boxes)
- "LTV/CAC 16.7倍" (gold badge, top right)
- "Payback 2ヶ月" (metrics on right)
- "高収益率 × 低解約率 = 持続的成長" (annotation)

Mood: Clear, business-like, stable
Colors: Professional blue/green tones
"""
    },
    {
        "id": "06_roadmap",
        "title": "3年で市場リーダーへ",
        "prompt": """
A growth roadmap slide showing 3-year plan.

Visual elements:
- Road/path stretching from left to right (hand-drawn)
- Road gradually widens and goes uphill (growth)
- Three milestone flags on the road
- ARR numbers below each milestone
- Goal flag at the end "市場リーダー"
- Phase names along the road
- Green hills background, hopeful scenery

Text labels (Japanese):
- "Year 1: ¥97M ARR" (first flag)
- "Year 2: ¥560M ARR" (second flag)
- "Year 3: ¥1.8B ARR" (third flag, larger)
- "PMF → 成長 → スケール" (phase labels below road)
- "50社 → 200社 → 500社" (customer counts)
- "着実に、しかし大胆に成長" (annotation)

Mood: Dynamic, ambitious, goal-oriented
Colors: Green for growth, gold for milestones
"""
    },
    {
        "id": "07_moat",
        "title": "4つの防御壁",
        "prompt": """
A competitive moat slide showing defensive advantages.

Visual elements:
- Medieval castle in center (omakase.ai castle)
- Four concentric moats/rings surrounding castle
- Each moat labeled with defensive advantage
- Small competitor boats outside trying to attack but blocked
- Flags on castle: "日本品質" and "EC特化"
- Moat water glowing blue

Text labels (Japanese):
- "データモート" (outermost moat, blue)
- "ネットワーク効果" (second moat, green)
- "ブランド信頼" (third moat, purple)
- "スイッチングコスト" (innermost moat, orange)
- "会話×購買データで模倣困難な資産を構築" (annotation)

Mood: Secure, protected, sustainable
Colors: Blue moats, castle in warm tones
Style: Medieval fantasy but friendly/approachable
"""
    },
    {
        "id": "08_closing",
        "title": "その声が、売上になる",
        "prompt": """
A closing/CTA slide with main tagline.

Visual elements:
- Large megaphone (voice metaphor) in center
- Coins, products, hearts flying out of megaphone
- Megaphone colored in purple/indigo (brand color)
- Happy EC store owner and satisfied customer stick figures
- Rising graph, stars, sparkle effects in background
- CTA button-style elements

Text labels (Japanese):
- "「その声が、売上になる。」" (main tagline, large hand-drawn text, center)
- "omakase.ai" (logo, bottom)
- "無料トライアル実施中" (CTA button, orange)
- "5分で導入、成果を実感" (sub-message)
- "日本のECを、音声AIで変える" (final annotation)

Mood: Celebratory, positive, call to action
Colors: Bright, hopeful, purple brand accent
"""
    }
]


def generate_slide(slide_info: dict, index: int):
    """Generate a single slide image using Gemini"""
    print(f"\n{'='*60}")
    print(f"Generating Slide {index + 1}: {slide_info['title']}")
    print(f"{'='*60}")

    full_prompt = STYLE_PREFIX + "\n\n" + slide_info['prompt']

    try:
        # Generate image
        response = model.generate_content(
            full_prompt,
            generation_config={
                "response_mime_type": "image/png"
            }
        )

        # Save the image
        if response.parts:
            for part in response.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_data = part.inline_data.data
                    output_path = OUTPUT_DIR / f"slide_{slide_info['id']}.png"

                    with open(output_path, 'wb') as f:
                        f.write(base64.b64decode(image_data) if isinstance(image_data, str) else image_data)

                    print(f"✅ Saved: {output_path}")
                    return True

        print(f"❌ No image data in response for slide {index + 1}")
        return False

    except Exception as e:
        print(f"❌ Error generating slide {index + 1}: {e}")
        return False


def main():
    print("="*60)
    print("omakase.ai Business Plan Slide Generator")
    print("Using Gemini 2.0 Flash Experimental")
    print("="*60)

    success_count = 0

    for i, slide in enumerate(SLIDES):
        if generate_slide(slide, i):
            success_count += 1

    print(f"\n{'='*60}")
    print(f"Generation Complete: {success_count}/{len(SLIDES)} slides generated")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
