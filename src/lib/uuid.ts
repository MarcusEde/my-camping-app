export function generateId(): string {
  // SEC-004 FIX: Use standard native crypto module (available in CF Workers and Node.js)
  // Ensures cryptographically secure UUIDs without relying on weak Math.random() fallbacks.
  return crypto.randomUUID();
}
