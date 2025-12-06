#!/usr/bin/env node
/**
 * Gemini Image Generation MCP Server
 * Provides image generation and editing capabilities using Google's Gemini API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  requests: [],
};

class GeminiImageGenServer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      console.error('Warning: GEMINI_API_KEY or GOOGLE_API_KEY not set');
    }

    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.outputDir = process.env.GEMINI_OUTPUT_DIR || path.join(__dirname, 'output');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    this.server = new Server(
      {
        name: 'gemini-image-gen-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  checkRateLimit() {
    const now = Date.now();
    // Remove old requests outside the window
    RATE_LIMIT.requests = RATE_LIMIT.requests.filter(
      (time) => now - time < RATE_LIMIT.windowMs
    );

    if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
      const oldestRequest = RATE_LIMIT.requests[0];
      const waitTime = Math.ceil((RATE_LIMIT.windowMs - (now - oldestRequest)) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before retrying.`);
    }

    RATE_LIMIT.requests.push(now);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_image',
          description: 'Generate an image from a text prompt using Gemini Imagen model',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Text description of the image to generate',
              },
              aspect_ratio: {
                type: 'string',
                description: 'Aspect ratio of the generated image',
                enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
                default: '1:1',
              },
              output_format: {
                type: 'string',
                description: 'Output format: base64 for inline data, url for file path',
                enum: ['base64', 'url'],
                default: 'base64',
              },
              negative_prompt: {
                type: 'string',
                description: 'Things to avoid in the generated image',
              },
              num_images: {
                type: 'number',
                description: 'Number of images to generate (1-4)',
                minimum: 1,
                maximum: 4,
                default: 1,
              },
            },
            required: ['prompt'],
          },
        },
        {
          name: 'edit_image',
          description: 'Edit an existing image based on a text prompt using Gemini',
          inputSchema: {
            type: 'object',
            properties: {
              image_source: {
                type: 'string',
                description: 'Base64 encoded image data or file path to the source image',
              },
              prompt: {
                type: 'string',
                description: 'Text description of the edits to make',
              },
              mask_source: {
                type: 'string',
                description: 'Optional: Base64 encoded mask or file path (white areas will be edited)',
              },
              output_format: {
                type: 'string',
                description: 'Output format: base64 for inline data, url for file path',
                enum: ['base64', 'url'],
                default: 'base64',
              },
            },
            required: ['image_source', 'prompt'],
          },
        },
        {
          name: 'describe_image',
          description: 'Get a detailed description of an image using Gemini Vision',
          inputSchema: {
            type: 'object',
            properties: {
              image_source: {
                type: 'string',
                description: 'Base64 encoded image data or file path to the image',
              },
              detail_level: {
                type: 'string',
                description: 'Level of detail in the description',
                enum: ['brief', 'detailed', 'comprehensive'],
                default: 'detailed',
              },
            },
            required: ['image_source'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check API key
        if (!this.genAI) {
          throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required');
        }

        // Check rate limit
        this.checkRateLimit();

        switch (name) {
          case 'generate_image':
            return await this.generateImage(args);
          case 'edit_image':
            return await this.editImage(args);
          case 'describe_image':
            return await this.describeImage(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return this.handleError(error);
      }
    });
  }

  handleError(error) {
    let errorMessage = error.message;
    let errorType = 'UNKNOWN_ERROR';

    // Categorize errors
    if (error.message.includes('Rate limit')) {
      errorType = 'RATE_LIMIT_ERROR';
    } else if (error.message.includes('API key') || error.message.includes('authentication')) {
      errorType = 'AUTH_ERROR';
    } else if (error.message.includes('Invalid') || error.message.includes('required')) {
      errorType = 'VALIDATION_ERROR';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      errorType = 'QUOTA_ERROR';
    } else if (error.message.includes('content') || error.message.includes('safety')) {
      errorType = 'CONTENT_FILTER_ERROR';
      errorMessage = 'The request was blocked due to content safety filters. Please modify your prompt.';
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              type: errorType,
              message: errorMessage,
              timestamp: new Date().toISOString(),
            },
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  async loadImageAsBase64(imageSource) {
    // Check if it's already base64
    if (imageSource.startsWith('data:image')) {
      // Extract base64 part from data URL
      const base64Part = imageSource.split(',')[1];
      return base64Part;
    }

    // Check if it's a file path
    if (fs.existsSync(imageSource)) {
      const buffer = fs.readFileSync(imageSource);
      return buffer.toString('base64');
    }

    // Assume it's raw base64
    return imageSource;
  }

  getMimeType(imageSource) {
    if (imageSource.startsWith('data:image/png')) return 'image/png';
    if (imageSource.startsWith('data:image/jpeg') || imageSource.startsWith('data:image/jpg')) return 'image/jpeg';
    if (imageSource.startsWith('data:image/webp')) return 'image/webp';
    if (imageSource.startsWith('data:image/gif')) return 'image/gif';

    // Check file extension
    const ext = path.extname(imageSource).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    return mimeTypes[ext] || 'image/png';
  }

  async generateImage(args) {
    const {
      prompt,
      aspect_ratio = '1:1',
      output_format = 'base64',
      negative_prompt,
      num_images = 1,
    } = args;

    // Use Gemini 2.0 Flash for image generation (Imagen 3 via Gemini)
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['image', 'text'],
      },
    });

    // Build the prompt
    let fullPrompt = prompt;
    if (negative_prompt) {
      fullPrompt += `. Avoid: ${negative_prompt}`;
    }
    fullPrompt += `. Aspect ratio: ${aspect_ratio}`;

    const results = [];

    for (let i = 0; i < num_images; i++) {
      try {
        const response = await model.generateContent(fullPrompt);
        const result = response.response;

        // Extract image from response
        for (const part of result.candidates[0].content.parts) {
          if (part.inlineData) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';

            if (output_format === 'url') {
              // Save to file and return path
              const filename = `generated_${Date.now()}_${i}.${mimeType.split('/')[1]}`;
              const filepath = path.join(this.outputDir, filename);
              fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));

              results.push({
                type: 'url',
                url: filepath,
                mimeType,
              });
            } else {
              results.push({
                type: 'base64',
                data: imageData,
                mimeType,
                dataUrl: `data:${mimeType};base64,${imageData}`,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error.message);
        results.push({
          type: 'error',
          error: error.message,
        });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            prompt,
            aspect_ratio,
            output_format,
            images: results,
            count: results.filter((r) => r.type !== 'error').length,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  async editImage(args) {
    const { image_source, prompt, mask_source, output_format = 'base64' } = args;

    // Load the source image
    const imageBase64 = await this.loadImageAsBase64(image_source);
    const imageMimeType = this.getMimeType(image_source);

    // Use Gemini 2.0 Flash for image editing
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['image', 'text'],
      },
    });

    // Build the edit request
    const parts = [
      {
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      },
      {
        text: `Edit this image: ${prompt}`,
      },
    ];

    // Add mask if provided
    if (mask_source) {
      const maskBase64 = await this.loadImageAsBase64(mask_source);
      const maskMimeType = this.getMimeType(mask_source);
      parts.push({
        inlineData: {
          mimeType: maskMimeType,
          data: maskBase64,
        },
      });
      parts[1].text += ' (Apply edits only to the white areas of the mask)';
    }

    const response = await model.generateContent(parts);
    const result = response.response;

    const editedImages = [];

    for (const part of result.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';

        if (output_format === 'url') {
          const filename = `edited_${Date.now()}.${mimeType.split('/')[1]}`;
          const filepath = path.join(this.outputDir, filename);
          fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));

          editedImages.push({
            type: 'url',
            url: filepath,
            mimeType,
          });
        } else {
          editedImages.push({
            type: 'base64',
            data: imageData,
            mimeType,
            dataUrl: `data:${mimeType};base64,${imageData}`,
          });
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            prompt,
            output_format,
            images: editedImages,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  async describeImage(args) {
    const { image_source, detail_level = 'detailed' } = args;

    // Load the image
    const imageBase64 = await this.loadImageAsBase64(image_source);
    const imageMimeType = this.getMimeType(image_source);

    // Use Gemini Pro Vision for description
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const detailPrompts = {
      brief: 'Provide a brief, one-sentence description of this image.',
      detailed: 'Provide a detailed description of this image, including main subjects, colors, composition, and mood.',
      comprehensive: 'Provide a comprehensive analysis of this image including: main subjects, background elements, colors, lighting, composition, artistic style, mood/atmosphere, and any text visible in the image.',
    };

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      },
      {
        text: detailPrompts[detail_level],
      },
    ]);

    const result = response.response;
    const description = result.text();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            detail_level,
            description,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gemini Image Generation MCP Server running on stdio');
  }
}

const server = new GeminiImageGenServer();
server.run().catch(console.error);
