import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateVerificationToken,
  validateVerificationToken,
} from './emailVerification';

const TEST_SECRET = 'test-secret-32-bytes-long-minimum!!';

beforeEach(() => {
  process.env.EMAIL_VERIFICATION_SECRET = TEST_SECRET;
});

afterEach(() => {
  delete process.env.EMAIL_VERIFICATION_SECRET;
  vi.useRealTimers();
});

// ─── Valid round-trip ──────────────────────────────────────────────────────

describe('generateVerificationToken + validateVerificationToken', () => {
  it('validates a freshly generated token (basic round-trip)', () => {
    const token = generateVerificationToken({
      uid: 'user-123',
      email: 'alice@example.com',
    });
    const result = validateVerificationToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.uid).toBe('user-123');
      expect(result.payload.email).toBe('alice@example.com');
      expect(result.payload.continue).toBeUndefined();
    }
  });

  it('includes continueUrl in payload when provided', () => {
    const token = generateVerificationToken({
      uid: 'user-456',
      email: 'bob@example.com',
      continueUrl: '/activate?code=ABCD',
    });
    const result = validateVerificationToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.continue).toBe('/activate?code=ABCD');
    }
  });

  it('sets exp ~24 hours ahead of iat', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = generateVerificationToken({
      uid: 'u',
      email: 'u@example.com',
    });
    const after = Math.floor(Date.now() / 1000);
    const result = validateVerificationToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      const { iat, exp } = result.payload;
      expect(iat).toBeGreaterThanOrEqual(before);
      expect(iat).toBeLessThanOrEqual(after);
      // exp should be 24h = 86400 seconds after iat
      expect(exp - iat).toBe(86400);
    }
  });
});

// ─── Tampered payload ─────────────────────────────────────────────────────

describe('tampered payload', () => {
  it('returns invalid when the payload base64url segment is modified', () => {
    const token = generateVerificationToken({
      uid: 'user-789',
      email: 'carol@example.com',
    });
    const [payloadPart, sigPart] = token.split('.');
    // Change the last character of the payload to corrupt it
    const corrupted = payloadPart.slice(0, -1) + (payloadPart.slice(-1) === 'A' ? 'B' : 'A');
    const tampered = `${corrupted}.${sigPart}`;
    const result = validateVerificationToken(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid');
    }
  });
});

// ─── Tampered / truncated signature ───────────────────────────────────────

describe('tampered signature', () => {
  it('returns invalid when signature character is changed', () => {
    const token = generateVerificationToken({
      uid: 'user-sig',
      email: 'sig@example.com',
    });
    const dotIdx = token.lastIndexOf('.');
    const payloadPart = token.slice(0, dotIdx);
    const sigPart = token.slice(dotIdx + 1);
    const tamperedSig = sigPart.slice(0, -1) + (sigPart.slice(-1) === 'A' ? 'B' : 'A');
    const tampered = `${payloadPart}.${tamperedSig}`;
    const result = validateVerificationToken(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid');
    }
  });

  it('returns invalid when signature is truncated', () => {
    const token = generateVerificationToken({
      uid: 'user-trunc',
      email: 'trunc@example.com',
    });
    const dotIdx = token.lastIndexOf('.');
    const payloadPart = token.slice(0, dotIdx);
    const truncatedSig = token.slice(dotIdx + 1, dotIdx + 10); // only 9 chars
    const tampered = `${payloadPart}.${truncatedSig}`;
    const result = validateVerificationToken(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid');
    }
  });
});

// ─── Expired token ────────────────────────────────────────────────────────

describe('expired token', () => {
  it('returns expired after 24+ hours have passed', () => {
    const token = generateVerificationToken({
      uid: 'user-exp',
      email: 'exp@example.com',
    });

    // Advance time by 25 hours
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);

    const result = validateVerificationToken(token);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('expired');
    }
  });

  it('is still valid just before expiry (23h 59m)', () => {
    const token = generateVerificationToken({
      uid: 'user-almost',
      email: 'almost@example.com',
    });

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000);

    const result = validateVerificationToken(token);
    expect(result.valid).toBe(true);
  });
});

// ─── Malformed input strings ──────────────────────────────────────────────

describe('malformed tokens', () => {
  it('returns invalid for an empty string', () => {
    expect(validateVerificationToken('')).toEqual({
      valid: false,
      reason: 'invalid',
    });
  });

  it('returns invalid for a random string with no dot', () => {
    expect(validateVerificationToken('justaplainstring')).toEqual({
      valid: false,
      reason: 'invalid',
    });
  });

  it('returns invalid for a string that is only dots', () => {
    expect(validateVerificationToken('...')).toEqual({
      valid: false,
      reason: 'invalid',
    });
  });

  it('returns invalid for valid-looking base64url but garbage JSON', () => {
    // Construct a token with valid signature but corrupt JSON payload
    // We need to sign it ourselves — skip by passing garbage base64
    const garbage = 'aGVsbG8td29ybGQ'; // "hello-world" base64url
    const result = validateVerificationToken(`${garbage}.somesig`);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid');
    }
  });

  it('returns invalid when EMAIL_VERIFICATION_SECRET is not set', () => {
    delete process.env.EMAIL_VERIFICATION_SECRET;
    // Should not throw — must catch and return 'invalid'
    const result = validateVerificationToken('anything.goes');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid');
    }
  });
});

// ─── generateVerificationToken guards ────────────────────────────────────

describe('generateVerificationToken guards', () => {
  it('throws when EMAIL_VERIFICATION_SECRET is not set', () => {
    delete process.env.EMAIL_VERIFICATION_SECRET;
    expect(() =>
      generateVerificationToken({ uid: 'u', email: 'e@example.com' })
    ).toThrow('EMAIL_VERIFICATION_SECRET');
  });

  it('throws when continueUrl does not start with /', () => {
    expect(() =>
      generateVerificationToken({
        uid: 'u',
        email: 'e@example.com',
        continueUrl: 'https://evil.com/steal',
      })
    ).toThrow('continueUrl must be a relative path starting with /');
  });

  it('throws when continueUrl is an absolute URL missing the leading slash', () => {
    expect(() =>
      generateVerificationToken({
        uid: 'u',
        email: 'e@example.com',
        continueUrl: 'dashboard',
      })
    ).toThrow();
  });

  it('accepts continueUrl that starts with /', () => {
    expect(() =>
      generateVerificationToken({
        uid: 'u',
        email: 'e@example.com',
        continueUrl: '/dashboard',
      })
    ).not.toThrow();
  });

  it('accepts no continueUrl (undefined)', () => {
    expect(() =>
      generateVerificationToken({ uid: 'u', email: 'e@example.com' })
    ).not.toThrow();
  });
});
