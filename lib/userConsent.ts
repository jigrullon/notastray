// Removed Firebase imports to make this a pure utility file
import crypto from "crypto";

// --- Config ---
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
    return Buffer.from(key, "hex");
}

// --- Encryption Helpers ---
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) throw new Error("Invalid encrypted format");
    const iv = Buffer.from(parts[0], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(parts[1], "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

export function hashValue(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
}

// --- Types ---
interface SaveConsentParams {
    userId: string;
    phone: string;
    email: string;
    consentIp?: string;
}

interface UserContact {
    userId: string;
    phone: string;
    email: string;
    consent: {
        smsOptIn: boolean;
        consentTimestamp: string;
        consentIp: string | null;
        consentMethod: string;
    };
}

// --- Save / Update User with Encrypted Fields + Consent ---
// --- Helper to Encrypt Data for Client-Side Save ---
export function encryptUserContact(phone: string, email: string) {
    return {
        encryptedPhone: encrypt(phone),
        encryptedEmail: encrypt(email),
        phoneHash: hashValue(phone),
    };
}

// --- Retrieve & Decrypt by User ID ---
// --- Deprecated: Client-side decryption must be handled via API to keep key secret ---
// These functions were removed as they required direct DB access which is not available in this context without Admin SDK.
// Future implementation: Create API endpoints to fetch and decrypt data for specific use cases.

// --- Lookup by Phone (e.g. when QR code is scanned) ---
// Remaining lookup logic removed for now. Scanner implementation requires Admin SDK or Cloud Functions.