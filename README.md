# Script for massive activation of MFA to cognito users pool

### Prerequisites

Below the base technologies used in this script, read documentation to know the proper use.

- [node](https://nodejs.org/en/download)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Guide to launch

#### ❗️ READ WITH ATTENTION ONCE START THE SCRIPT YOU CAN GO BACK ❗️

Launch the following command:

```
$ npm install
```

After you have installed all the modules, you need to check few important things pointed below.

- 1 Make sure in your cognito user-pool the multi-factor authentication and email authentication are checked on and required. Also you can choose optional the files inside the project have **optional** in their name. If tou need only 1 check like only TOTP at the end of files name you can read **TOTP** for the check to authenticator apps or **TOTP-OTP** for both box checked on cognito. In this flow the mail is not conteplated yet. Examples --> **activation-mfa-TOTP-OTP.js** or **activation-mfa-TOTP.js**
- 2 Make sure in your app-client information is checked the voice **ALLOW_ADMIN_USER_PASSWORD_AUTH**
- 3 Change the file **config.js** with your user pool info in PATH:--> **src/config/config.js**
- 4 Make sure in your credential file under **.aws/credentials** you have aws_access_key_id aws_secret_access_key aws_session_token, you can find this info you your access key in your account AWS. If you don't have .aws/credential file you have to launch in the terminal the 2 export command you find in the **config.js** file: export AWS_ACCESS_KEY_ID="your id" and AWS_SECRET_ACCESS_KEY="your access key", you find this information in the section **IAM -> Users -> SecurityCredentials-> Access Key**.

- 5 If you want to be sure which users you want to change after changing variables in config.js, so you can be sure you are changing the right pool, if you are sure you can skip this point! **at your risk!**

```
$ npm run check
```

- 6 If the point 1 2 3 and 4 are verified, in the root project folder, you can run the scripts written in the **package.json** under the section scripts.

After the success of the script will be create a **.xlsx** file in the root of the project, you can open with excel, inside you'll find the username the temporary password, the qr-code (in base64) and the secret.

There are script for massive MFA activation of single user MFA activation. In the last case you have to change the sample mail of the variable **USER_MAIL** in the file **config/config.js**.
