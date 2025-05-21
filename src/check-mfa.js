const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { USER_POOL_ID, REGION } = require("./config/config");

const client = new CognitoIdentityProviderClient({ region: REGION });

const checkMFAStatus = async (
  userPoolId,
  paginationToken = undefined,
  allUsers = []
) => {
  try {
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: userPoolId,
      Limit: 60,
      PaginationToken: paginationToken,
    });

    const listUsersResponse = await client.send(listUsersCommand);

    const usersWithDetails = await Promise.all(
      listUsersResponse.Users.map((user) =>
        checkUserMFADetails(userPoolId, user.Username)
      )
    );

    const updatedUsers = [...allUsers, ...usersWithDetails];

    if (listUsersResponse.PaginationToken) {
      return checkMFAStatus(
        userPoolId,
        listUsersResponse.PaginationToken,
        updatedUsers
      );
    } else {
      return updatedUsers;
    }
  } catch (error) {
    console.error("Errore nel recupero degli utenti:", error);
    return allUsers;
  }
};

const checkUserMFADetails = async (userPoolId, username) => {
  try {
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    });
    const userDetails = await client.send(getUserCommand);
    return userDetails;
    // return {
    //   username,
    //   email: getUserAttribute(userDetails.UserAttributes, "email"),
    //   mfaOptions: userDetails.MFAOptions || [],
    //   mfaEnabled: userDetails.UserMFASettingList || [],
    //   preferredMfaMethod:
    //     getUserAttribute(userDetails.UserAttributes, "preferred_mfa_setting") ||
    //     null,
    //   mfaVerified:
    //     getUserAttribute(userDetails.UserAttributes, "mfa_settings_verified") ||
    //     false,
    // };
  } catch (error) {
    console.error(`Errore nel recupero dettagli utente ${username}:`, error);
    return null;
  }
};

const checkUsers = async () => {
  return await checkMFAStatus(USER_POOL_ID);
};

module.exports = { checkUsers };
