# Omakase AI

AI-powered conversational commerce platform with Voice & Chat agents for websites.

## Features

- **Voice Agents**: Real-time voice conversations powered by OpenAI Realtime API
- **5 Agent Types**: Shopping Guide, Product Sales, FAQ Support, Onboarding, Robotics
- **Multi-language**: Japanese, English, Korean support
- **E-commerce Integration**: Product catalog, shopping cart, order management
- **Web Scraping**: Import products from existing EC sites

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start development server
npm run dev
```

Server runs at http://localhost:3000

## Architecture

```
omakase_ai/
├── src/
│   ├── server/           # Express + WebSocket server
│   │   ├── routes/       # REST API endpoints
│   │   ├── services/     # Business logic
│   │   └── websocket/    # OpenAI Realtime API bridge
│   ├── agents/           # Agent prompt templates
│   └── types/            # TypeScript definitions
└── frontend/             # React + Vite dashboard
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/products` | List products |
| `POST /api/voice/session` | Create voice session |
| `GET /api/agents` | List agent types |
| `POST /api/prompts/generate` | Generate agent prompt |

## Agent Types

| Agent | Purpose |
|-------|---------|
| **Shopping Guide** | Brand-safe greetings, catalog recommendations |
| **Product Sales** | Product specs, inventory, upselling |
| **FAQ Support** | Knowledge base Q&A |
| **Onboarding** | Voice-guided welcome tours |
| **Robotics** | Vision + Voice for physical spaces |

## Development

```bash
npm run dev          # Start server with hot reload
npm run build        # Build TypeScript
npm test             # Run tests
npm run lint         # Lint code
npm run typecheck    # Type check
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required) |
| `PORT` | Server port (default: 3000) |

## License

MIT
