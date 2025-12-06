import type { StoreContext } from './prompt-generator.js';

// Re-export for convenience
export type { StoreContext };

const DEFAULT_WORKSPACE = 'default';

/**
 * Workspace-aware store context holder.
 */
class StoreContextStore {
  private contexts: Map<string, StoreContext | null> = new Map();

  set(context: StoreContext, workspaceId: string = DEFAULT_WORKSPACE): void {
    this.contexts.set(workspaceId, context);
  }

  get(workspaceId: string = DEFAULT_WORKSPACE): StoreContext | null {
    return this.contexts.get(workspaceId) ?? null;
  }

  clear(workspaceId?: string): void {
    if (workspaceId) {
      this.contexts.set(workspaceId, null);
    } else {
      this.contexts.clear();
    }
  }
}

export const storeContextStore = new StoreContextStore();
