import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hashValue, encryptUserContact } from './userConsent'

describe('encrypt / decrypt', () => {
  it('roundtrips a plain string', () => {
    const plaintext = 'hello@example.com'
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })

  it('roundtrips an empty string', () => {
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('roundtrips unicode and special characters', () => {
    const text = 'José García +1 (555) 123-4567 🐾'
    expect(decrypt(encrypt(text))).toBe(text)
  })

  it('produces different ciphertext each call (random IV)', () => {
    expect(encrypt('test')).not.toBe(encrypt('test'))
  })

  it('output format is iv:ciphertext separated by exactly one colon', () => {
    expect(encrypt('test').split(':')).toHaveLength(2)
  })

  it('throws on malformed encrypted input', () => {
    expect(() => decrypt('notvalidformat')).toThrow()
  })
})

describe('hashValue', () => {
  it('produces a 64-char hex string (SHA-256)', () => {
    const hash = hashValue('hello')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic — same input always yields same hash', () => {
    expect(hashValue('phone-number')).toBe(hashValue('phone-number'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashValue('a')).not.toBe(hashValue('b'))
  })
})

describe('encryptUserContact', () => {
  it('returns encryptedPhone, encryptedEmail, and phoneHash', () => {
    const result = encryptUserContact('+15551234567', 'owner@example.com')
    expect(result).toHaveProperty('encryptedPhone')
    expect(result).toHaveProperty('encryptedEmail')
    expect(result).toHaveProperty('phoneHash')
  })

  it('phoneHash is consistent across calls', () => {
    const a = encryptUserContact('+15551234567', 'owner@example.com')
    const b = encryptUserContact('+15551234567', 'owner@example.com')
    expect(a.phoneHash).toBe(b.phoneHash)
  })

  it('encrypted values differ between calls (random IV)', () => {
    const a = encryptUserContact('+15551234567', 'owner@example.com')
    const b = encryptUserContact('+15551234567', 'owner@example.com')
    expect(a.encryptedPhone).not.toBe(b.encryptedPhone)
  })
})
