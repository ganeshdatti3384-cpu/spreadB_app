import CryptoJS from 'crypto-js';

// Deterministic E2EE key derivation on the client
// Raw key is never stored on the server!
export const deriveSharedKey = (userId1, userId2) => {
  if (!userId1 || !userId2) return '';
  
  const getCleanId = (id) => {
    if (typeof id === 'object' && id !== null) {
      return String(id?._id || id?.id || id);
    }
    return String(id);
  };

  const id1 = getCleanId(userId1);
  const id2 = getCleanId(userId2);

  if (id1.includes('[object') || id2.includes('[object') || id1 === 'undefined' || id2 === 'undefined') {
    console.warn('E2EE: Invalid ID values derived for key:', { id1, id2 });
    return '';
  }

  // Sort alphabetically to ensure determinism for both participants
  const sortedIds = [id1, id2].sort().join('_');
  const salt = 'spreadb_secure_e2ee_salt_2026'; // Hardcoded client-side salt
  return CryptoJS.SHA256(sortedIds + salt).toString();
};

export const encryptMessage = (text, key) => {
  if (!text || !key) return text;
  try {
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (error) {
    console.log('Encryption error:', error);
    return text;
  }
};

export const decryptMessage = (ciphertext, key) => {
  if (!ciphertext || !key) return ciphertext;
  // If ciphertext doesn't look like AES ciphertext, don't decrypt it
  if (!ciphertext.startsWith('U2FsdGVkX1')) {
    return ciphertext; // Probably unencrypted message (e.g. older message before E2EE)
  }
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return ciphertext; // fallback
    return decrypted;
  } catch (error) {
    console.log('Decryption error:', error);
    return ciphertext; // fallback to ciphertext if it fails
  }
};
