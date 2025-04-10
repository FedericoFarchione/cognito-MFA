const {
  AdminSetUserMFAPreferenceCommand,
  AssociateSoftwareTokenCommand,
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  VerifySoftwareTokenCommand,
  AdminGetUserCommand,
  AdminRespondToAuthChallengeCommand,
  AdminEnableUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  SetUserPoolMfaConfigCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { authenticator } = require("otplib");
const {
  REGION,
  USER_POOL_ID,
  CLIENT_ID,
  CLIENT_SECRET,
} = require("../config/config");
const CryptoJS = require("crypto-js");
const client = new CognitoIdentityProviderClient({ region: REGION });

function generateSecretHash(clientId, clientSecret, username) {
  return CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA256(username + clientId, clientSecret)
  );
}

const setMFAconfig = async (type) => {
  const command = new SetUserPoolMfaConfigCommand({
    UserPoolId: USER_POOL_ID,
    MfaConfiguration: "ON",
    SoftwareTokenMfaConfiguration: {
      Enabled: true,
    },
    EmailMfaConfiguration:
      type === "ON"
        ? {
            Enabled: true,
          }
        : undefined,
  });
  await client.send(command);
  console.log(`MFA setted ${type}.`);
};

const verifyUserEmail = async (username) => {
  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    UserAttributes: [
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
  });
  await client.send(command);
};

const getUserEmail = async (username, single = false) => {
  const command = new AdminGetUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
  });

  const userDetails = await client.send(command);
  if (single) {
    return userDetails;
  }
  const emailAttr = userDetails.UserAttributes.find(
    (attr) => attr.Name === "email"
  );
  return emailAttr ? emailAttr.Value : "N/A";
};

const enableUser = async (username) => {
  try {
    const enableCommand = new AdminEnableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });
    await client.send(enableCommand);
    console.log(`✅ User ${username} enabled!`);
  } catch (error) {
    console.error(`Error on enable user ${username}:`, error);
    throw error;
  }
};

const associateSoftwareToken = async (session) => {
  try {
    const associateCode = new AssociateSoftwareTokenCommand({
      Session: session,
    });
    const codeResponse = await client.send(associateCode);
    console.log("✅ Assiciation complete!");
    return codeResponse;
  } catch (error) {
    console.error("Error on association:", error);
    throw error;
  }
};

const verifyOTPCode = async (session, secretKey) => {
  try {
    const otpCode = authenticator.generate(secretKey);
    const verifyCommand = new VerifySoftwareTokenCommand({
      Session: session,
      UserCode: otpCode,
    });

    const verifyResponse = await client.send(verifyCommand);
    console.log("✅ Verify of MFA completed");
    return verifyResponse;
  } catch (error) {
    console.error("Error on verify MFA:", error);
    throw error;
  }
};

const verifyOTPCodeAccessToken = async (token, secretKey) => {
  try {
    const otpCode = authenticator.generate(secretKey);
    const verifyCommand = new VerifySoftwareTokenCommand({
      AccessToken: token,
      UserCode: otpCode,
    });

    const verifyResponse = await client.send(verifyCommand);
    console.log("✅ verify MFA completed");
    return verifyResponse;
  } catch (error) {
    console.error("Errore nella verifica MFA:", error);
    throw error;
  }
};

const setMFAPreference = async (username) => {
  try {
    const command = new AdminSetUserMFAPreferenceCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      SoftwareTokenMfaSettings: {
        Enabled: true,
        PreferredMfa: false,
      },
    });
    const response = await client.send(command);
    console.log("✅ MFA succefully set!");
    return response;
  } catch (error) {
    console.error("Error on se preferences MFA:", error);
    throw error;
  }
};

const setMFAPreferenceSpecific = async (username, options) => {
  const { setSoftwareMFA, preferred } = options;
  const command = new AdminSetUserMFAPreferenceCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    SoftwareTokenMfaSettings: setSoftwareMFA
      ? {
          Enabled: true,
          PreferredMfa: preferred === "SOFTWARE_TOKEN",
        }
      : undefined,
  });

  const response = await client.send(command);
  console.log("MFA preferences setted:", response);
  return response;
};

const authtenticateWithTemporaryPass = async (
  username,
  temporaryPassword,
  newPassword
) => {
  try {
    const secretHash = generateSecretHash(CLIENT_ID, CLIENT_SECRET, username);
    const initiateAuthCommand = new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: temporaryPassword,
        SECRET_HASH: secretHash,
      },
    });
    const authResponse = await client.send(initiateAuthCommand);

    if (authResponse.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      const respondToAuthChallengeCommand =
        new AdminRespondToAuthChallengeCommand({
          UserPoolId: USER_POOL_ID,
          ClientId: CLIENT_ID,
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeResponses: {
            USERNAME: username,
            PASSWORD: temporaryPassword,
            NEW_PASSWORD: newPassword,
            SECRET_HASH: secretHash,
            ...authResponse.ChallengeParameters,
          },
          Session: authResponse.Session,
        });
      const challengeResponse = await client.send(
        respondToAuthChallengeCommand
      );
      return challengeResponse;
    }
    return authResponse;
  } catch (error) {
    console.error("Error during the change password:", error);
    throw error;
  }
};

const associateAccessToken = async (token) => {
  const command = new AssociateSoftwareTokenCommand({
    AccessToken: token,
  });
  const response = await client.send(command);
  return response;
};

const forcePasswordReset = async (username, newPassword) => {
  const command = new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    Password: newPassword,
    Permanent: false,
  });

  await client.send(command);
  console.log(
    `🔄 Temporary password setted for  ${username}:------> ${newPassword}`
  );
  return newPassword;
};

module.exports = {
  getUserEmail,
  enableUser,
  associateSoftwareToken,
  verifyOTPCode,
  setMFAPreference,
  authtenticateWithTemporaryPass,
  setMFAPreferenceSpecific,
  verifyUserEmail,
  forcePasswordReset,
  associateAccessToken,
  setMFAconfig,
  verifyOTPCodeAccessToken,
};
