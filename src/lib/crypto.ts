// AES-256 Encryption utilities using Web Crypto API
// All encryption happens locally - no data leaves the device

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Generate a random encryption key
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export key for storage
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

// Import key from storage
export async function importKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
export async function encryptData(data: ArrayBuffer, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as Uint8Array<ArrayBuffer> },
    key,
    data
  );
  return { encrypted, iv };
}

// Decrypt data
export async function decryptData(encrypted: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as Uint8Array<ArrayBuffer> },
    key,
    encrypted
  );
}

// Encrypt string
export async function encryptString(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const dataBuffer = data.buffer as ArrayBuffer;
  const { encrypted, iv } = await encryptData(dataBuffer, key);
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return arrayBufferToBase64(combined.buffer as ArrayBuffer);
}

// Decrypt string
export async function decryptString(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await decryptData(encrypted.buffer as ArrayBuffer, key, iv);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Hash PIN for verification (never store plain PIN)
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hash);
}

// Derive key from PIN (for key encryption)
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}
