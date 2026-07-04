import crypto from 'crypto';

export interface VerificationPayload {
  uid: string;
  email: string;
  iat: number;
  exp: number;
  continue?: string;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(input: string): Buffer {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function getSecret(): string {
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret) {
    throw new Error('EMAIL_VERIFICATION_SECRET environment variable is not set');
  }
  return secret;
}

function computeSignature(payloadSegment: string, secret: string): string {
  return base64urlEncode(
    crypto.createHmac('sha256', secret).update(payloadSegment).digest()
  );
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface GenerateOptions {
  uid: string;
  email: string;
  continueUrl?: string;
}

/**
 * Generate a signed email-verification token.
 * Format: base64url(payload) + '.' + base64url(HMAC-SHA256 signature)
 * Token expires in 24 hours.
 * Throws if EMAIL_VERIFICATION_SECRET is unset.
 * Throws if continueUrl is provided but does not start with '/'.
 */
export function generateVerificationToken({
  uid,
  email,
  continueUrl,
}: GenerateOptions): string {
  const secret = getSecret();

  if (continueUrl !== undefined && !continueUrl.startsWith('/')) {
    throw new Error('continueUrl must be a relative path starting with /');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: VerificationPayload = {
    uid,
    email,
    iat: now,
    exp: now + 24 * 60 * 60, // 24 hours
    ...(continueUrl !== undefined ? { continue: continueUrl } : {}),
  };

  const payloadSegment = base64urlEncode(JSON.stringify(payload));
  const signature = computeSignature(payloadSegment, secret);

  return `${payloadSegment}.${signature}`;
}

export type ValidateResult =
  | { valid: true; payload: VerificationPayload }
  | { valid: false; reason: 'invalid' | 'expired' };

/**
 * Validate a signed email-verification token.
 * Returns { valid: true, payload } on success.
 * Returns { valid: false, reason: 'invalid' } for bad format/signature/parse errors.
 * Returns { valid: false, reason: 'expired' } when the token is past its exp.
 * Uses crypto.timingSafeEqual for the signature comparison.
 */
export function validateVerificationToken(token: string): ValidateResult {
  try {
    const secret = getSecret();

    const dotIndex = token.lastIndexOf('.');
    if (dotIndex <= 0) {
      return { valid: false, reason: 'invalid' };
    }

    const payloadSegment = token.slice(0, dotIndex);
    const providedSig = token.slice(dotIndex + 1);

    if (!payloadSegment || !providedSig) {
      return { valid: false, reason: 'invalid' };
    }

    const expectedSig = computeSignature(payloadSegment, secret);

    // Guard length mismatch before calling timingSafeEqual (it requires equal lengths)
    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);

    if (providedBuf.length !== expectedBuf.length) {
      return { valid: false, reason: 'invalid' };
    }

    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false, reason: 'invalid' };
    }

    // Signature is valid — parse and check expiry
    const payloadJson = base64urlDecode(payloadSegment).toString('utf8');
    const payload = JSON.parse(payloadJson) as VerificationPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'invalid' };
  }
}
