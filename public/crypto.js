// Cryptography module for end-to-end encryption
class CryptoManager {
    constructor() {
        this.encryptionKey = null;
    }

    // Derive encryption key from passphrase using PBKDF2
    async deriveKey(passphrase, salt) {
        try {
            const encoder = new TextEncoder();
            
            // Import passphrase as key material
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(passphrase),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );
            
            // Derive AES-256-GCM key
            this.encryptionKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode(salt),
                    iterations: 100000, // High iteration count for security
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            
            return true;
        } catch (error) {
            console.error('Key derivation failed:', error);
            return false;
        }
    }

    // Encrypt a message
    async encrypt(plaintext) {
        try {
            if (!this.encryptionKey) {
                throw new Error('Encryption key not initialized');
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            
            // Generate random initialization vector (IV)
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt the data
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                data
            );

            // Return encrypted data and IV as arrays (for JSON serialization)
            return {
                ciphertext: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                algorithm: 'AES-256-GCM'
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    // Decrypt a message
    async decrypt(encryptedData) {
        try {
            if (!this.encryptionKey) {
                throw new Error('Encryption key not initialized');
            }

            // Reconstruct Uint8Arrays from arrays
            const ciphertext = new Uint8Array(encryptedData.ciphertext);
            const iv = new Uint8Array(encryptedData.iv);
            
            // Decrypt the data
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                ciphertext
            );
            
            // Decode to string
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '[Decryption failed - wrong passphrase or corrupted message]';
        }
    }

    // Generate a hash of a string (for verification)
    async hash(data) {
        try {
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest(
                'SHA-256',
                encoder.encode(data)
            );
            
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Hashing failed:', error);
            throw error;
        }
    }

    // Verify Web Crypto API support
    static isSupported() {
        return typeof crypto !== 'undefined' && 
               typeof crypto.subtle !== 'undefined';
    }

    // Clear encryption key from memory
    clear() {
        this.encryptionKey = null;
    }
}

// Export for use in app.js
window.CryptoManager = CryptoManager;
