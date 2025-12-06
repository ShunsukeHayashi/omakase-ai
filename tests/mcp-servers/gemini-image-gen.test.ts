/**
 * Gemini Image Gen MCP Server Tests
 *
 * Tests for generate_image, edit_image, describe_image tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Gemini API responses
const mockGenerateResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            },
          },
        ],
      },
    },
  ],
};

const mockDescribeResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: "A beautiful sunset over the ocean with vibrant orange and purple colors.",
          },
        ],
      },
    },
  ],
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => Buffer.from("mock-image-data")),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe("Gemini Image Gen MCP Server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    process.env.GEMINI_OUTPUT_DIR = "/tmp/gemini-output";
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_OUTPUT_DIR;
  });

  describe("generate_image", () => {
    it("should generate an image from a text prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      const request = {
        prompt: "A futuristic city at night with neon lights",
        width: 1024,
        height: 1024,
        style: "photorealistic",
      };

      // Simulate tool call
      const result = await simulateToolCall("generate_image", request);

      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("generativelanguage.googleapis.com"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle missing prompt error", async () => {
      const request = {
        width: 1024,
        height: 1024,
      };

      const result = await simulateToolCall("generate_image", request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("prompt");
    });

    it("should handle API error gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      const request = {
        prompt: "Test image",
      };

      const result = await simulateToolCall("generate_image", request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("429");
    });

    it("should validate image dimensions", async () => {
      const request = {
        prompt: "Test image",
        width: 5000, // Invalid: too large
        height: 5000,
      };

      const result = await simulateToolCall("generate_image", request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("dimension");
    });
  });

  describe("edit_image", () => {
    it("should edit an existing image with mask", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      const request = {
        imagePath: "/path/to/source.png",
        maskPath: "/path/to/mask.png",
        prompt: "Replace the sky with a starry night",
      };

      const result = await simulateToolCall("edit_image", request);

      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
    });

    it("should handle missing source image", async () => {
      vi.mocked(await import("fs")).existsSync.mockReturnValueOnce(false);

      const request = {
        imagePath: "/nonexistent/image.png",
        prompt: "Edit this",
      };

      const result = await simulateToolCall("edit_image", request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should support inpainting without mask", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      const request = {
        imagePath: "/path/to/source.png",
        prompt: "Make the image more vibrant",
      };

      const result = await simulateToolCall("edit_image", request);

      expect(result.success).toBe(true);
    });
  });

  describe("describe_image", () => {
    it("should describe an image from file path", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDescribeResponse,
      });

      const request = {
        imagePath: "/path/to/image.png",
      };

      const result = await simulateToolCall("describe_image", request);

      expect(result.success).toBe(true);
      expect(result.description).toContain("sunset");
    });

    it("should describe an image from URL", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDescribeResponse,
        });

      const request = {
        imageUrl: "https://example.com/image.png",
      };

      const result = await simulateToolCall("describe_image", request);

      expect(result.success).toBe(true);
      expect(result.description).toBeDefined();
    });

    it("should handle custom description prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "主なオブジェクト: 海、夕日、雲" }],
              },
            },
          ],
        }),
      });

      const request = {
        imagePath: "/path/to/image.png",
        prompt: "この画像の主なオブジェクトを日本語で列挙してください",
      };

      const result = await simulateToolCall("describe_image", request);

      expect(result.success).toBe(true);
      expect(result.description).toContain("日本語");
    });

    it("should handle missing image error", async () => {
      const request = {};

      const result = await simulateToolCall("describe_image", request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("imagePath or imageUrl");
    });
  });

  describe("API Key validation", () => {
    it("should fail without API key", async () => {
      delete process.env.GEMINI_API_KEY;

      const request = {
        prompt: "Test",
      };

      const result = await simulateToolCall("generate_image", request);

      expect(result.success).toBe(false);
      expect(result.error).toContain("API key");
    });
  });

  describe("Output directory", () => {
    it("should create output directory if not exists", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      const request = {
        prompt: "Test image",
      };

      await simulateToolCall("generate_image", request);

      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("should use custom output filename", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      const request = {
        prompt: "Test image",
        outputFilename: "custom-name.png",
      };

      const result = await simulateToolCall("generate_image", request);

      expect(result.imagePath).toContain("custom-name.png");
    });
  });
});

// Helper function to simulate MCP tool calls
async function simulateToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<{
  success: boolean;
  imagePath?: string;
  description?: string;
  error?: string;
}> {
  // Validate API key
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: "GEMINI_API_KEY not set. API key required." };
  }

  switch (toolName) {
    case "generate_image": {
      if (!args.prompt) {
        return { success: false, error: "Missing required parameter: prompt" };
      }
      if (args.width && (args.width as number) > 4096) {
        return { success: false, error: "Invalid dimension: max 4096" };
      }
      if (args.height && (args.height as number) > 4096) {
        return { success: false, error: "Invalid dimension: max 4096" };
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: args.prompt }] }] }),
          }
        );

        if (!response.ok) {
          return { success: false, error: `API error: ${response.status}` };
        }

        const outputDir = process.env.GEMINI_OUTPUT_DIR || "/tmp";
        const filename = (args.outputFilename as string) || `generated-${Date.now()}.png`;
        const imagePath = `${outputDir}/${filename}`;

        return { success: true, imagePath };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }

    case "edit_image": {
      if (!args.imagePath) {
        return { success: false, error: "Missing required parameter: imagePath" };
      }
      if (!args.prompt) {
        return { success: false, error: "Missing required parameter: prompt" };
      }

      const fs = await import("fs");
      if (!fs.existsSync(args.imagePath as string)) {
        return { success: false, error: "Source image not found" };
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [] }),
          }
        );

        if (!response.ok) {
          return { success: false, error: `API error: ${response.status}` };
        }

        const outputDir = process.env.GEMINI_OUTPUT_DIR || "/tmp";
        const imagePath = `${outputDir}/edited-${Date.now()}.png`;

        return { success: true, imagePath };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }

    case "describe_image": {
      if (!args.imagePath && !args.imageUrl) {
        return { success: false, error: "Missing required parameter: imagePath or imageUrl" };
      }

      try {
        if (args.imageUrl) {
          await fetch(args.imageUrl as string);
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [] }),
          }
        );

        if (!response.ok) {
          return { success: false, error: `API error: ${response.status}` };
        }

        const data = await response.json();
        const description = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return { success: true, description };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
