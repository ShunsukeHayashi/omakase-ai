import type { StoreContext } from './prompt-generator.js';

/**
 * Simple in-memory store context holder.
 * Centralizes the context so voice sessions and prompt endpoints share the same state.
 */
class StoreContextStore {
  private context: StoreContext | null = null;

  set(context: StoreContext): void {
    this.context = context;
  }

  get(): StoreContext | null {
    return this.context;
  }

  clear(): void {
    this.context = null;
  }
}

export const storeContextStore = new StoreContextStore();
