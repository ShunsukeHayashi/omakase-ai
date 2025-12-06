#!/usr/bin/env node
/**
 * Gemini Slide Generation MCP Server
 * AI-powered slide/presentation generation using Google's Gemini API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Rate limiting
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60000,
  requests: [],
};

class GeminiSlideGenServer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      console.error('Warning: GEMINI_API_KEY or GOOGLE_API_KEY not set');
    }

    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.outputDir = process.env.GEMINI_SLIDE_OUTPUT_DIR || path.join(__dirname, 'output');

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    this.server = new Server(
      { name: 'gemini-slide-gen-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupToolHandlers();
  }

  checkRateLimit() {
    const now = Date.now();
    RATE_LIMIT.requests = RATE_LIMIT.requests.filter(t => now - t < RATE_LIMIT.windowMs);
    if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
      const wait = Math.ceil((RATE_LIMIT.windowMs - (now - RATE_LIMIT.requests[0])) / 1000);
      throw new Error(`Rate limit exceeded. Wait ${wait} seconds.`);
    }
    RATE_LIMIT.requests.push(now);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_slide_outline',
          description: 'Generate a structured slide outline from a topic or content',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string', description: 'Presentation topic or title' },
              audience: { type: 'string', description: 'Target audience (e.g., executives, developers)' },
              slideCount: { type: 'number', description: 'Number of slides (default: 10)' },
              style: { type: 'string', enum: ['professional', 'creative', 'minimal', 'technical'], description: 'Presentation style' },
            },
            required: ['topic'],
          },
        },
        {
          name: 'generate_slide_content',
          description: 'Generate detailed content for a specific slide',
          inputSchema: {
            type: 'object',
            properties: {
              slideTitle: { type: 'string', description: 'Title of the slide' },
              context: { type: 'string', description: 'Context or key points to include' },
              bulletPoints: { type: 'number', description: 'Number of bullet points (default: 4)' },
              includeNotes: { type: 'boolean', description: 'Include speaker notes' },
            },
            required: ['slideTitle'],
          },
        },
        {
          name: 'generate_full_presentation',
          description: 'Generate a complete presentation with all slides',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string', description: 'Presentation topic' },
              description: { type: 'string', description: 'Detailed description or requirements' },
              slideCount: { type: 'number', description: 'Number of slides (default: 10)' },
              format: { type: 'string', enum: ['markdown', 'json', 'html', 'marp'], description: 'Output format' },
              audience: { type: 'string', description: 'Target audience' },
              style: { type: 'string', enum: ['professional', 'creative', 'minimal', 'technical'] },
            },
            required: ['topic'],
          },
        },
        {
          name: 'improve_slide',
          description: 'Improve or refine existing slide content',
          inputSchema: {
            type: 'object',
            properties: {
              currentContent: { type: 'string', description: 'Current slide content' },
              improvementGoal: { type: 'string', description: 'What to improve (clarity, conciseness, impact)' },
            },
            required: ['currentContent'],
          },
        },
        {
          name: 'generate_slide_visuals',
          description: 'Suggest visual elements and diagrams for slides',
          inputSchema: {
            type: 'object',
            properties: {
              slideContent: { type: 'string', description: 'Slide content to visualize' },
              visualType: { type: 'string', enum: ['chart', 'diagram', 'icon', 'image', 'infographic'] },
            },
            required: ['slideContent'],
          },
        },
        {
          name: 'export_presentation',
          description: 'Export presentation to various formats',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Presentation content in markdown' },
              format: { type: 'string', enum: ['marp', 'revealjs', 'pptx-outline', 'pdf-outline'] },
              filename: { type: 'string', description: 'Output filename' },
            },
            required: ['content', 'format'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        this.checkRateLimit();

        if (!this.genAI) {
          throw new Error('Gemini API key not configured');
        }

        switch (name) {
          case 'generate_slide_outline':
            return await this.generateSlideOutline(args);
          case 'generate_slide_content':
            return await this.generateSlideContent(args);
          case 'generate_full_presentation':
            return await this.generateFullPresentation(args);
          case 'improve_slide':
            return await this.improveSlide(args);
          case 'generate_slide_visuals':
            return await this.generateSlideVisuals(args);
          case 'export_presentation':
            return await this.exportPresentation(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }], isError: true };
      }
    });
  }

  async generateSlideOutline(args) {
    const { topic, audience = 'general', slideCount = 10, style = 'professional' } = args;
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Create a ${slideCount}-slide presentation outline about "${topic}".
Target audience: ${audience}
Style: ${style}

Return a JSON array with this structure:
[
  { "slideNumber": 1, "title": "...", "purpose": "...", "keyPoints": ["...", "..."] }
]

Include: title slide, agenda, main content slides, summary, and Q&A.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let outline;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      outline = jsonMatch ? JSON.parse(jsonMatch[0]) : text;
    } catch {
      outline = text;
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, topic, slideCount, outline }, null, 2) }] };
  }

  async generateSlideContent(args) {
    const { slideTitle, context = '', bulletPoints = 4, includeNotes = true } = args;
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Create content for a presentation slide titled "${slideTitle}".
Context: ${context}

Provide:
1. ${bulletPoints} concise bullet points (max 10 words each)
2. A brief subtitle
${includeNotes ? '3. Speaker notes (2-3 sentences)' : ''}

Format as JSON: { "title": "...", "subtitle": "...", "bullets": [...], "speakerNotes": "..." }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let content;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      content = jsonMatch ? JSON.parse(jsonMatch[0]) : text;
    } catch {
      content = text;
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, slideTitle, content }, null, 2) }] };
  }

  async generateFullPresentation(args) {
    const { topic, description = '', slideCount = 10, format = 'markdown', audience = 'general', style = 'professional' } = args;
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const formatInstructions = {
      markdown: 'Use ## for slide titles, bullet points with -, and --- for slide separators',
      json: 'Return as JSON array of slide objects',
      html: 'Return as HTML with <section> tags for each slide',
      marp: 'Use Marp markdown format with --- separators and marp: true frontmatter',
    };

    const prompt = `Create a complete ${slideCount}-slide presentation about "${topic}".
Description: ${description}
Audience: ${audience}
Style: ${style}
Format: ${format}

${formatInstructions[format] || formatInstructions.markdown}

Include visually descriptive content suitable for slides. Keep bullet points concise (max 8 words).`;

    const result = await model.generateContent(prompt);
    const presentation = result.response.text();

    const filename = `presentation_${Date.now()}.${format === 'json' ? 'json' : 'md'}`;
    const filePath = path.join(this.outputDir, filename);
    fs.writeFileSync(filePath, presentation);

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, topic, slideCount, format, filePath, presentation }, null, 2) }] };
  }

  async improveSlide(args) {
    const { currentContent, improvementGoal = 'clarity and impact' } = args;
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Improve this slide content for better ${improvementGoal}:

${currentContent}

Provide:
1. Improved version
2. List of changes made
3. Why these changes help

Format as JSON: { "improved": "...", "changes": [...], "rationale": "..." }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let improvement;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      improvement = jsonMatch ? JSON.parse(jsonMatch[0]) : text;
    } catch {
      improvement = text;
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, improvement }, null, 2) }] };
  }

  async generateSlideVisuals(args) {
    const { slideContent, visualType = 'diagram' } = args;
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Suggest ${visualType} visualizations for this slide content:

${slideContent}

Provide:
1. 2-3 visual suggestions with descriptions
2. Mermaid diagram code if applicable
3. Icon suggestions (using common icon libraries)
4. Color palette recommendation

Format as JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let visuals;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      visuals = jsonMatch ? JSON.parse(jsonMatch[0]) : text;
    } catch {
      visuals = text;
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, visualType, visuals }, null, 2) }] };
  }

  async exportPresentation(args) {
    const { content, format, filename = `slides_${Date.now()}` } = args;

    let output;
    let ext;

    switch (format) {
      case 'marp':
        output = `---
marp: true
theme: default
paginate: true
---

${content}`;
        ext = 'md';
        break;

      case 'revealjs':
        output = `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/reveal.js/dist/reveal.css">
  <link rel="stylesheet" href="https://unpkg.com/reveal.js/dist/theme/white.css">
</head>
<body>
  <div class="reveal"><div class="slides">
${content.split('---').map(slide => `    <section>\n${slide.trim().split('\n').map(l => `      <p>${l}</p>`).join('\n')}\n    </section>`).join('\n')}
  </div></div>
  <script src="https://unpkg.com/reveal.js/dist/reveal.js"></script>
  <script>Reveal.initialize();</script>
</body>
</html>`;
        ext = 'html';
        break;

      case 'pptx-outline':
        output = `PowerPoint Export Outline\n${'='.repeat(30)}\n\n${content}`;
        ext = 'txt';
        break;

      default:
        output = content;
        ext = 'md';
    }

    const filePath = path.join(this.outputDir, `${filename}.${ext}`);
    fs.writeFileSync(filePath, output);

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, format, filePath, size: output.length }, null, 2) }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gemini Slide Gen MCP Server running');
  }
}

const server = new GeminiSlideGenServer();
server.run().catch(console.error);
