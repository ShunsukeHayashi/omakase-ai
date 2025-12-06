/**
 * API Client for Omakase AI Backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
  isActive: boolean;
}

export interface AgentConfig {
  avatarUrl: string | null;
  name: string;
  personality: string;
  language: 'Japanese' | 'English' | 'Korean';
  voice: string;
  voiceOn: boolean;
  speechSpeed: number;
  startMessage: string;
  endMessage: string;
}

export interface AgentType {
  id: string;
  name: string;
  role: {
    title: string;
    purpose: string;
  };
  personality: {
    traits: string[];
    tone: string;
  };
  voices: string[];
  defaultVoice: string;
}

// Products API
export const productsApi = {
  async getAll(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();
    return data.products;
  },

  async scrape(url: string, maxProducts = 50): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, maxProducts }),
    });
    const data = await res.json();
    return data.products;
  },

  async bulkAdd(products: Partial<Product>[]): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    });
    const data = await res.json();
    return data.products;
  },

  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
  },
};

// Agents API
export const agentsApi = {
  async getAll(): Promise<AgentType[]> {
    const res = await fetch(`${API_BASE}/agents`);
    const data = await res.json();
    return data.agents;
  },

  async get(id: string): Promise<AgentType> {
    const res = await fetch(`${API_BASE}/agents/${id}`);
    const data = await res.json();
    return data.agent;
  },

  async getPrompt(id: string): Promise<string> {
    const res = await fetch(`${API_BASE}/agents/${id}/prompt`);
    const data = await res.json();
    return data.prompt;
  },
};

// Voice API
export const voiceApi = {
  async getConfig() {
    const res = await fetch(`${API_BASE}/voice/config`);
    return res.json();
  },

  async createSession() {
    const res = await fetch(`${API_BASE}/voice/session`, { method: 'POST' });
    return res.json();
  },
};

// Knowledge Import API
export interface ImportProgress {
  id: string;
  source: {
    type: 'csv' | 'json' | 'shopify' | 'url';
    name: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  startedAt: string;
  completedAt?: string;
  errors: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  isActive: boolean;
  createdAt: string;
}

export interface KnowledgeSummary {
  store: {
    name: string;
    url?: string;
    categories: string[];
  };
  products: {
    total: number;
    active: number;
    withImages: number;
    priceStats: {
      min: number;
      max: number;
      avg: number;
    } | null;
  };
  faqs: {
    total: number;
    categories: Record<string, number>;
  };
  recentImports: {
    id: string;
    source: { type: string; name: string };
    status: string;
    items: number;
    startedAt: string;
  }[];
}

export const knowledgeApi = {
  // Import APIs
  async importCSV(file: File, clearExisting = false): Promise<{ success: boolean; progressId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clearExisting', clearExisting.toString());

    const res = await fetch(`${API_BASE}/knowledge/import/csv`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async importJSON(data: unknown, clearExisting = false): Promise<{ success: boolean; progressId: string }> {
    const res = await fetch(`${API_BASE}/knowledge/import/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, clearExisting }),
    });
    return res.json();
  },

  async importShopify(config: {
    shopDomain: string;
    accessToken: string;
    apiVersion?: string;
    clearExisting?: boolean;
    limit?: number;
  }): Promise<{ success: boolean; progressId: string }> {
    const res = await fetch(`${API_BASE}/knowledge/import/shopify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async importURL(url: string, maxProducts = 50, clearExisting = false): Promise<{
    success: boolean;
    progressId: string;
    storeContext: unknown;
    productsCount: number;
    products: Product[];
  }> {
    const res = await fetch(`${API_BASE}/knowledge/import/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, maxProducts, clearExisting }),
    });
    return res.json();
  },

  // Progress APIs
  async getProgress(progressId: string): Promise<{ success: boolean; progress: ImportProgress }> {
    const res = await fetch(`${API_BASE}/knowledge/import/progress/${progressId}`);
    return res.json();
  },

  async getHistory(limit = 10): Promise<{ success: boolean; count: number; history: ImportProgress[] }> {
    const res = await fetch(`${API_BASE}/knowledge/import/history?limit=${limit}`);
    return res.json();
  },

  // FAQ APIs
  async getFAQs(): Promise<{ success: boolean; count: number; faqs: FAQ[] }> {
    const res = await fetch(`${API_BASE}/knowledge/faqs`);
    return res.json();
  },

  async addFAQ(faq: { question: string; answer: string; category?: string; keywords?: string[] }): Promise<{ success: boolean; faq: FAQ }> {
    const res = await fetch(`${API_BASE}/knowledge/faqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(faq),
    });
    return res.json();
  },

  async generateFAQs(): Promise<{ success: boolean; count: number; faqs: FAQ[] }> {
    const res = await fetch(`${API_BASE}/knowledge/faqs/generate`, { method: 'POST' });
    return res.json();
  },

  async searchFAQs(query: string): Promise<{ success: boolean; query: string; count: number; results: FAQ[] }> {
    const res = await fetch(`${API_BASE}/knowledge/faqs/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  // Summary API
  async getSummary(): Promise<{ success: boolean; summary: KnowledgeSummary }> {
    const res = await fetch(`${API_BASE}/knowledge/summary`);
    return res.json();
  },

  // Clear API
  async clear(options: { products?: boolean; faqs?: boolean; storeContext?: boolean }): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    if (options.products) params.append('products', 'true');
    if (options.faqs) params.append('faqs', 'true');
    if (options.storeContext) params.append('storeContext', 'true');

    const res = await fetch(`${API_BASE}/knowledge/clear?${params.toString()}`, { method: 'DELETE' });
    return res.json();
  },
};

// WebSocket Client
export class VoiceWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, (data: unknown) => void> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use localhost:3000 for WebSocket (not proxied by Vite)
      const host = import.meta.env.VITE_WS_HOST || 'localhost:3000';
      const wsUrl = host ? `${protocol}//${host}` : `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handler = this.handlers.get(data.type);
          if (handler) handler(data);
          // Also call 'all' handler
          const allHandler = this.handlers.get('all');
          if (allHandler) allHandler(data);
        } catch {
          // Binary data
          const binaryHandler = this.handlers.get('binary');
          if (binaryHandler) binaryHandler(event.data);
        }
      };
    });
  }

  on(type: string, handler: (data: unknown) => void): void {
    this.handlers.set(type, handler);
  }

  send(type: string, data?: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  updateConfig(config: Partial<AgentConfig>): void {
    this.send('update_config', { config });
  }

  startVoiceSession(): void {
    this.send('start_voice_session');
  }

  endVoiceSession(): void {
    this.send('end_voice_session');
  }

  sendAudio(base64Audio: string): void {
    this.send('input_audio_buffer.append', { audio: base64Audio });
  }

  commitAudio(): void {
    this.send('input_audio_buffer.commit');
  }

  createResponse(): void {
    this.send('response.create');
  }

  sendTextMessage(text: string): void {
    this.send('conversation.item.create', {
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this.createResponse();
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const voiceWs = new VoiceWebSocket();
