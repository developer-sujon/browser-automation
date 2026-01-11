// Configuration for Deployment Tiers
// Change 'TIER' to 'PAID' when deploying to a paid Cloudflare Workers plan for higher limits.

export const CONFIG = {
  // Options: 'FREE' | 'PAID'
  TIER: "PAID",

  // Configuration map
  SETTINGS: {
    FREE: {
      RECURSIVE_THRESHOLD: 5, // Group 5 items per worker to save resources
      CONCURRENCY_LIMIT: 2, // Max 2 concurrent browsers (Safe limit for Free tier's 3 max)
      BATCH_SIZE: 5, // Process small batches
    },
    PAID: {
      RECURSIVE_THRESHOLD: 1, // STRICT 1-to-1: 1 Form = 1 Worker
      CONCURRENCY_LIMIT: 9999, // UNLIMITED: User requested strict simultaneous execution (High Cost accepted)
      BATCH_SIZE: 9999, // Load all items in one batch
    },
  },
};

export const GET_CONFIG = () => {
  return CONFIG.SETTINGS[CONFIG.TIER as keyof typeof CONFIG.SETTINGS];
};
