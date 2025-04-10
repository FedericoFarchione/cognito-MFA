const { generateRandomPassword } = require("../../helpers/generate-pass");
const { generateQRCode } = require("../../helpers/generate-qr");
const XLSX = require("xlsx");

const {
  enableUser,
  associateSoftwareToken,
  verifyOTPCode,
  setMFAPreference,
  authtenticateWithTemporaryPass,
  forcePasswordReset,
  verifyUserEmail,
  setMFAconfig,
  getUserEmail,
} = require("../../helpers/cognito-utils");
const { USER_EMAIL } = require("../../config/config");

const activateMFAForUser = async (mail) => {
  try {
    const user = await getUserEmail(mail, true);
    const tempPass = generateRandomPassword();
    const newPassword = generateRandomPassword();
    await setMFAconfig("OFF");
    // Check if user have MFA active
    if (user?.UserMFASettingList?.length > 0) {
      console.log(`MFA already active for ${mail}`);
      return null;
    }

    // Enable the user if needed
    if (!user.Enabled) {
      await enableUser(mail);
    }
    console.log("✅ Verify email...");
    await verifyUserEmail(user.Username);

    await forcePasswordReset(mail, tempPass);
    const authData = await authtenticateWithTemporaryPass(
      mail,
      tempPass,
      newPassword
    );
    console.log("✅ Login completato", authData);

    if (!authData?.Session) {
      throw new Error("No session received after login");
    }
    const session = authData?.Session;
    console.log("Associating software token.......................");
    const codeResponse = await associateSoftwareToken(session);
    console.log("Associated! ----->", codeResponse);
    const secretKey = codeResponse?.SecretCode;
    console.log(`🔑 Secret Key per ${mail}: ${secretKey}`);

    console.log("Verificando OTP.......................");
    await verifyOTPCode(codeResponse?.Session, secretKey);

    console.log("Set MFA preferences.......................");
    await setMFAPreference(mail);

    console.log("Generating QR Code.......................");
    const qrCode = await generateQRCode(secretKey, mail);
    await forcePasswordReset(mail, newPassword);
    await setMFAconfig("ON");

    console.log("✅ State FORCE_CHANGE_PASSWORD setted succesfully!");
    const result = {
      email: mail,
      password: newPassword,
      qrCode,
      secretKey,
    };
    console.log("Final result", result);
    return result;
  } catch (error) {
    console.error(`Error on activation MFA for ${username}:`, error);
    return null;
  }
};

const run = async () => {
  try {
    const userData = await activateMFAForUser(USER_EMAIL);
    if (userData) {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([userData], {
        fields: ["email", "password", "qrCode", "secretKey"],
      });

      XLSX.utils.book_append_sheet(workbook, worksheet, "User MFA");
      XLSX.writeFile(workbook, "user-mfa.xlsx");
      console.log("📄 File XLXS generated: user-mfa.xlsx");
    } else {
      console.log("MFA already active or error on activation.");
    }
  } catch (error) {
    console.error("Error on activation MFA for user:", error);
  }
};

run();
