import crypto from "node:crypto";
import bcrypt from "bcryptjs";

// RFC 4648 Base32 alphabet
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode buffer into RFC 4648 Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode RFC 4648 Base32 string into Buffer
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a random Base32 secret for TOTP (default 20 bytes = 160 bits)
 */
export function generateTotpSecret(byteLength: number = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return base32Encode(randomBytes);
}

/**
 * Generate 6-digit TOTP token for given secret and timestamp (RFC 6238)
 */
export function generateTotpToken(
  secret: string,
  timestampMs: number = Date.now(),
  timeStepSeconds: number = 30,
): { token: string; step: number } {
  const key = base32Decode(secret);
  const step = Math.floor(timestampMs / 1000 / timeStepSeconds);

  // 8-byte big-endian counter
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(step), 0);

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const tokenNumber = binary % 1000000;
  const token = tokenNumber.toString().padStart(6, "0");

  return { token, step };
}

/**
 * Verify TOTP token with clock drift tolerance (default window = 1 step before and after)
 */
export function verifyTotpToken(
  token: string,
  secret: string,
  options: {
    timestampMs?: number;
    timeStepSeconds?: number;
    window?: number;
    lastUsedStep?: number;
  } = {},
): { valid: boolean; matchedStep?: number } {
  const cleanedToken = token.trim();
  if (!/^\d{6}$/.test(cleanedToken)) {
    return { valid: false };
  }

  const {
    timestampMs = Date.now(),
    timeStepSeconds = 30,
    window = 1,
    lastUsedStep = -1,
  } = options;

  const currentStep = Math.floor(timestampMs / 1000 / timeStepSeconds);

  for (let offset = -window; offset <= window; offset++) {
    const candidateStep = currentStep + offset;
    // Prevent replay attacks (A14)
    if (candidateStep <= lastUsedStep) {
      continue;
    }

    const { token: candidateToken } = generateTotpToken(
      secret,
      candidateStep * timeStepSeconds * 1000,
      timeStepSeconds,
    );

    if (crypto.timingSafeEqual(Buffer.from(candidateToken), Buffer.from(cleanedToken))) {
      return { valid: true, matchedStep: candidateStep };
    }
  }

  return { valid: false };
}

/**
 * Generate standard otpauth URL for QR Code scanner
 */
export function generateOtpauthUri(params: {
  accountName: string;
  issuer: string;
  secret: string;
}): string {
  const { accountName, issuer, secret } = params;
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate cryptographically secure emergency backup codes (hashed with bcrypt)
 */
export async function generateBackupCodes(count: number = 8): Promise<{
  plainCodes: string[];
  hashedCodes: string[];
}> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    plainCodes.push(formatted);
    const hash = await bcrypt.hash(formatted, 10);
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
}
