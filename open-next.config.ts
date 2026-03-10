import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // This tells OpenNext to use your KV namespace for the Next.js Data Cache
  incrementalCache: kvIncrementalCache,
});
