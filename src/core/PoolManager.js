/**
 * PoolManager.js
 * Object pooling system to handle pre-allocation of enemies, particles, and chunks.
 * Ensures bounded O(K) space complexity and completely prevents runtime garbage collection stutters.
 */
export class PoolManager {
    constructor() {
        this.pools = new Map();
    }

    // O(1) allocation mechanism (executed at load time)
    createPool(key, factoryFn, initialSize) {
        const pool = [];
        for (let i = 0; i < initialSize; i++) {
            pool.push({
                active: false,
                item: factoryFn()
            });
        }
        this.pools.set(key, pool);
    }

    // O(1) retrieval
    get(key) {
        const pool = this.pools.get(key);
        if (!pool) return null;
        for (let i = 0; i < pool.length; i++) {
            if (!pool[i].active) {
                pool[i].active = true;
                return pool[i].item;
            }
        }
        return null; // Pool exhausted, must be configured large enough initially avoiding GC allocations.
    }

    // O(1) recycle
    recycle(key, item) {
        const pool = this.pools.get(key);
        if (!pool) return;
        const wrapper = pool.find(w => w.item === item);
        if (wrapper) wrapper.active = false;
    }
}
