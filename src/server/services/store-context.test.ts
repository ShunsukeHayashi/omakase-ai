/**
 * StoreContextStore Unit Tests
 */

import { storeContextStore, type StoreContext } from './store-context.js';

describe('StoreContextStore', () => {
  beforeEach(() => {
    storeContextStore.clear();
  });

  describe('set and get', () => {
    it('should set and get context for default workspace', () => {
      const context: StoreContext = {
        storeName: 'Test Store',
        storeDescription: 'A test store',
      };

      storeContextStore.set(context);
      const result = storeContextStore.get();

      expect(result).toEqual(context);
    });

    it('should set and get context for specific workspace', () => {
      const context: StoreContext = {
        storeName: 'Workspace Store',
      };

      storeContextStore.set(context, 'workspace-1');
      const result = storeContextStore.get('workspace-1');

      expect(result).toEqual(context);
    });

    it('should return null for non-existent workspace', () => {
      const result = storeContextStore.get('non-existent');

      expect(result).toBeNull();
    });

    it('should isolate contexts by workspace', () => {
      const context1: StoreContext = { storeName: 'Store 1' };
      const context2: StoreContext = { storeName: 'Store 2' };

      storeContextStore.set(context1, 'workspace-1');
      storeContextStore.set(context2, 'workspace-2');

      expect(storeContextStore.get('workspace-1')?.storeName).toBe('Store 1');
      expect(storeContextStore.get('workspace-2')?.storeName).toBe('Store 2');
    });
  });

  describe('clear', () => {
    it('should clear specific workspace', () => {
      storeContextStore.set({ storeName: 'Store 1' }, 'workspace-1');
      storeContextStore.set({ storeName: 'Store 2' }, 'workspace-2');

      storeContextStore.clear('workspace-1');

      expect(storeContextStore.get('workspace-1')).toBeNull();
      expect(storeContextStore.get('workspace-2')).not.toBeNull();
    });

    it('should clear all workspaces when no id provided', () => {
      storeContextStore.set({ storeName: 'Store 1' }, 'workspace-1');
      storeContextStore.set({ storeName: 'Store 2' }, 'workspace-2');

      storeContextStore.clear();

      expect(storeContextStore.get('workspace-1')).toBeNull();
      expect(storeContextStore.get('workspace-2')).toBeNull();
    });
  });
});
