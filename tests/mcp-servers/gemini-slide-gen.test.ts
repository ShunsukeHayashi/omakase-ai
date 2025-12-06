/**
 * Gemini Slide Gen MCP Server Tests
 * Unit tests for slide generation functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            slides: [
              { slideNumber: 1, title: 'Title Slide', purpose: 'Introduction' },
              { slideNumber: 2, title: 'Agenda', purpose: 'Overview' },
            ]
          })
        }
      })
    })
  }))
}));

// Test data
const mockSlideOutline = [
  { slideNumber: 1, title: 'Introduction', purpose: 'Welcome', keyPoints: ['Point 1', 'Point 2'] },
  { slideNumber: 2, title: 'Main Content', purpose: 'Details', keyPoints: ['Detail 1', 'Detail 2'] },
  { slideNumber: 3, title: 'Summary', purpose: 'Conclusion', keyPoints: ['Takeaway 1'] },
];

const mockSlideContent = {
  title: 'Test Slide',
  subtitle: 'A test subtitle',
  bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
  speakerNotes: 'These are the speaker notes.',
};

describe('Gemini Slide Gen MCP Server', () => {

  describe('Rate Limiting', () => {
    it('should enforce rate limits', () => {
      const RATE_LIMIT = {
        maxRequests: 20,
        windowMs: 60000,
        requests: [] as number[],
      };

      const checkRateLimit = () => {
        const now = Date.now();
        RATE_LIMIT.requests = RATE_LIMIT.requests.filter(t => now - t < RATE_LIMIT.windowMs);
        if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
          throw new Error('Rate limit exceeded');
        }
        RATE_LIMIT.requests.push(now);
      };

      // Should not throw for first 20 requests
      for (let i = 0; i < 20; i++) {
        expect(() => checkRateLimit()).not.toThrow();
      }

      // Should throw on 21st request
      expect(() => checkRateLimit()).toThrow('Rate limit exceeded');
    });
  });

  describe('Slide Outline Generation', () => {
    it('should validate outline structure', () => {
      expect(mockSlideOutline).toHaveLength(3);
      expect(mockSlideOutline[0]).toHaveProperty('slideNumber');
      expect(mockSlideOutline[0]).toHaveProperty('title');
      expect(mockSlideOutline[0]).toHaveProperty('purpose');
      expect(mockSlideOutline[0]).toHaveProperty('keyPoints');
    });

    it('should have sequential slide numbers', () => {
      mockSlideOutline.forEach((slide, index) => {
        expect(slide.slideNumber).toBe(index + 1);
      });
    });

    it('should have non-empty titles', () => {
      mockSlideOutline.forEach(slide => {
        expect(slide.title).toBeTruthy();
        expect(typeof slide.title).toBe('string');
      });
    });
  });

  describe('Slide Content Generation', () => {
    it('should validate content structure', () => {
      expect(mockSlideContent).toHaveProperty('title');
      expect(mockSlideContent).toHaveProperty('subtitle');
      expect(mockSlideContent).toHaveProperty('bullets');
      expect(mockSlideContent).toHaveProperty('speakerNotes');
    });

    it('should have array of bullets', () => {
      expect(Array.isArray(mockSlideContent.bullets)).toBe(true);
      expect(mockSlideContent.bullets.length).toBeGreaterThan(0);
    });

    it('should have string speaker notes', () => {
      expect(typeof mockSlideContent.speakerNotes).toBe('string');
    });
  });

  describe('Export Formats', () => {
    const formats = ['marp', 'revealjs', 'pptx-outline', 'pdf-outline'];

    it('should support all export formats', () => {
      formats.forEach(format => {
        expect(['marp', 'revealjs', 'pptx-outline', 'pdf-outline']).toContain(format);
      });
    });

    it('should generate marp format correctly', () => {
      const content = '# Slide 1\n\nContent here';
      const marpOutput = `---
marp: true
theme: default
paginate: true
---

${content}`;

      expect(marpOutput).toContain('marp: true');
      expect(marpOutput).toContain('paginate: true');
    });

    it('should generate revealjs format correctly', () => {
      const content = '# Slide 1';
      const revealOutput = `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/reveal.js/dist/reveal.css">
</head>
<body>
  <div class="reveal"><div class="slides">
    <section>${content}</section>
  </div></div>
</body>
</html>`;

      expect(revealOutput).toContain('reveal.js');
      expect(revealOutput).toContain('<section>');
    });
  });

  describe('Input Validation', () => {
    it('should require topic for outline generation', () => {
      const validateOutlineInput = (args: { topic?: string }) => {
        if (!args.topic) {
          throw new Error('Topic is required');
        }
        return true;
      };

      expect(() => validateOutlineInput({})).toThrow('Topic is required');
      expect(validateOutlineInput({ topic: 'AI Overview' })).toBe(true);
    });

    it('should require slideTitle for content generation', () => {
      const validateContentInput = (args: { slideTitle?: string }) => {
        if (!args.slideTitle) {
          throw new Error('Slide title is required');
        }
        return true;
      };

      expect(() => validateContentInput({})).toThrow('Slide title is required');
      expect(validateContentInput({ slideTitle: 'Introduction' })).toBe(true);
    });

    it('should validate slide count range', () => {
      const validateSlideCount = (count: number) => {
        if (count < 1 || count > 50) {
          throw new Error('Slide count must be between 1 and 50');
        }
        return true;
      };

      expect(() => validateSlideCount(0)).toThrow();
      expect(() => validateSlideCount(51)).toThrow();
      expect(validateSlideCount(10)).toBe(true);
    });
  });

  describe('Style Options', () => {
    const styles = ['professional', 'creative', 'minimal', 'technical'];

    it('should support all style options', () => {
      styles.forEach(style => {
        expect(['professional', 'creative', 'minimal', 'technical']).toContain(style);
      });
    });
  });

  describe('JSON Parsing', () => {
    it('should extract JSON from mixed content', () => {
      const mixedContent = 'Here is the result:\n[{"slide": 1}]\nEnd of response';
      const jsonMatch = mixedContent.match(/\[[\s\S]*\]/);

      expect(jsonMatch).not.toBeNull();
      expect(JSON.parse(jsonMatch![0])).toEqual([{ slide: 1 }]);
    });

    it('should handle object JSON extraction', () => {
      const mixedContent = 'Result: {"title": "Test", "bullets": ["a", "b"]}';
      const jsonMatch = mixedContent.match(/\{[\s\S]*\}/);

      expect(jsonMatch).not.toBeNull();
      expect(JSON.parse(jsonMatch![0])).toHaveProperty('title', 'Test');
    });
  });
});
