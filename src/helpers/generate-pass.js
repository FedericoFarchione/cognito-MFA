const generateRandomPassword = (length = 8) => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specialChars = "!@#$%^&*()-_=+[]{}|;:'\",.<>?/";

  const allChars = uppercase + lowercase + numbers + specialChars;

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mischia la password per evitare che i caratteri obbligatori siano sempre all'inizio
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
};
module.exports = { generateRandomPassword };
