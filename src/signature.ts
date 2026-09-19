import CryptoJS from "crypto-js";

export function generateSignature(
  appId: string,
  timestamp: string,
  path: string,
  appSecret: string,
): string {
  return CryptoJS.SHA256(appId + timestamp + path + appSecret).toString(
    CryptoJS.enc.Base64,
  );
}
