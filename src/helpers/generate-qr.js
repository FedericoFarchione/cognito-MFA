const qrcode = require("qrcode");
const { ISSUER_NAME } = require("../config/config");
const generateQRCode = async (secretKey, username) => {
  // ✅ Genera QR Code (URL per Google Authenticator)
  const otpAuthUrl = `otpauth://totp/${username}?secret=${secretKey}&issuer=${ISSUER_NAME}`;
  const qrCode = await qrcode.toDataURL(otpAuthUrl);
  console.log(`📷 QR Code for ${username}:`);
  return qrCode;
};

module.exports = { generateQRCode };
