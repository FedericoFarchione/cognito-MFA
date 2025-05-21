const { checkUsers } = require("../../check-mfa");
const { generateRandomPassword } = require("../../helpers/generate-pass");
const { generateQRCode } = require("../../helpers/generate-qr");
const XLSX = require("xlsx");
const pMap = require("p-map");
const {
  getUserEmail,
  enableUser,
  associateSoftwareToken,
  verifyOTPCode,
  setMFAPreference,
  authtenticateWithTemporaryPass,
  forcePasswordReset,
  verifyUserEmail,
  setMFAconfig,
} = require("../../helpers/cognito-utils");

const activateMFAForUser = async (user) => {
  const username = user.Username;
  const tempPass = generateRandomPassword();
  const newPassword = generateRandomPassword();

  // Controlla se l'utente ha già MFA attivo
  if (user?.UserMFASettingList?.length > 0) {
    console.log(`MFA already active for ${username}`);
    return null;
  }

  try {
    // Abilita l'utente se necessario
    if (!user.Enabled) {
      await enableUser(username);
    }
    console.log("✅ Verify email...");
    await verifyUserEmail(username);
    await forcePasswordReset(username, tempPass);
    const { Session } = await authtenticateWithTemporaryPass(
      username,
      tempPass,
      newPassword
    );
    console.log("✅ Login completed", Session);

    if (!Session) {
      throw new Error("Sessione missing!");
    }

    console.log("Associating software token.......................");
    const codeResponse = await associateSoftwareToken(Session);
    const secretKey = codeResponse.SecretCode;
    console.log(`🔑 Secret Key per ${username}: ${secretKey}`);

    console.log("Veryfing OTP.......................");
    await verifyOTPCode(codeResponse.Session, secretKey);

    console.log("Setting MFA preferencies.......................");
    await setMFAPreference(username);

    console.log("Generating QRCODE.......................");
    const qrCode = await generateQRCode(secretKey, username);
    const email = await getUserEmail(username);

    await forcePasswordReset(username, newPassword);

    console.log("✅ State FORCE_CHANGE_PASSWORD success!");
    return {
      email,
      password: newPassword,
      qrCode,
      secretKey,
    };
  } catch (error) {
    console.error(`Error on activation MFA for ${username}:`, error);
    return null;
  }
};

const run = async () => {
  try {
    const users = await checkUsers();
    await setMFAconfig("OFF");
    const userData = await pMap(
      users,
      async (user) => {
        try {
          const result = await activateMFAForUser(user);
          if (result !== null) {
            return result;
          }
        } catch (err) {
          console.error(`❌ Failed ${user.Username}:`, err.message);
          return null;
        }
      },
      { concurrency: 5 }
    );
    const filteredData = userData.filter((user) => user !== null);
    await setMFAconfig("ON");
    if (filteredData.length > 0) {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(filteredData, {
        fields: ["email", "password", "qrCode", "secretKey"],
      });
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users MFA");
      XLSX.writeFile(workbook, "users-mfa.xlsx");
      console.log(
        "📄 File XLXS created: Users enabled for MFA ... FILE NAME: users-mfa.xlxs"
      );
    } else {
      console.log("No users need MFA!");
    }
  } catch (error) {
    console.error("Errore:", error);
  }
};
run();
