import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Generate hash for the new password
async function main() {
  const hashedPassword = await hashPassword("Bobo19881");
  console.log("Hashed password:", hashedPassword);
}

main().catch(console.error);
