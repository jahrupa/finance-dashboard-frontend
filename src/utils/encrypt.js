import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;

// Encrypt
export const encryptData = (data) => {
  if (!data) return null;

  return CryptoJS.AES.encrypt(
    JSON.stringify(data),
    SECRET_KEY
  ).toString();
};

// Decrypt
export const decryptData = (cipherText) => {
  try {
    if (!cipherText) return null;

    const bytes = CryptoJS.AES.decrypt(
      cipherText,
      SECRET_KEY
    );

    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    return decrypted ? JSON.parse(decrypted) : null;
  } catch (error) {
    console.error("Decrypt Error:", error);
    return null;
  }
};