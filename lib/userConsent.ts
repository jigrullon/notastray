import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase"; // <-- pulls in your existing firebase.ts
import crypto from "crypto";

// --- Config ---
const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = process.env.ENCRYPTION_KEY!; // 32-byte hex string, in your .env.local
const IV_LENGTH = 16;

// --- Encryption Helpers ---
function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, "hex"), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, "hex"), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

function hashValue(text: string): string {
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
export async function saveUserConsent({ userId, phone, email, consentIp }: SaveConsentParams): Promise<void> {
    const docRef = doc(db, "users", userId); // matches your existing "users" collection

    await setDoc(docRef, {
        encryptedPhone: encrypt(phone),
        encryptedEmail: encrypt(email),
        phoneHash: hashValue(phone),
        consent: {
            smsOptIn: true,
            consentTimestamp: new Date().toISOString(),
            consentIp: consentIp || null,
            consentMethod: "checkbox",
        },
        updatedAt: new Date().toISOString(),
    }, { merge: true }); // merge: true so it doesn't wipe other fields on the doc
}

// --- Retrieve & Decrypt by User ID ---
export async function getUserContact(userId: string): Promise<UserContact | null> {
    const docRef = doc(db, "users", userId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return {
        userId,
        phone: decrypt(data.encryptedPhone),
        email: decrypt(data.encryptedEmail),
        consent: data.consent,
    };
}

// --- Lookup by Phone (e.g. when QR code is scanned) ---
export async function getUserByPhone(phone: string): Promise<UserContact | null> {
    const hash = hashValue(phone);
    const q = query(collection(db, "users"), where("phoneHash", "==", hash));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    return {
        userId: docSnap.id,
        phone: decrypt(data.encryptedPhone),
        email: decrypt(data.encryptedEmail),
        consent: data.consent,
    };
}