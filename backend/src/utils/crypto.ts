import crypto from "crypto";

/**
 * Generate a cryptographically secure random API key
 */
export function generateApiKey(): string {
  return `pk_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  return `session_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Generate webhook signature
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
