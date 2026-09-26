import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config({ path: ".env.local", quiet: true });

const token = process.argv[2];
if (!token) {
  console.error("Использование: npm run decrypt <password_enc из БД>");
  console.error('Пример: npm run decrypt "eKsi2b4Qf6RpIVsx...:TGYz...:VnJhbGRvbQ=="');
  process.exit(1);
}

const keyHex = process.env.APP_PASSWORD_KEY;
if (!keyHex) {
  console.error("APP_PASSWORD_KEY не найден в .env.local");
  process.exit(1);
}

const [ivB64, tagB64, dataB64] = token.split(":");
if (!ivB64 || !tagB64 || !dataB64) {
  console.error("Некорректный токен — ожидается формат iv:tag:data (base64)");
  process.exit(1);
}

try {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    console.error("APP_PASSWORD_KEY должен быть 32 байта (64 hex-символа)");
    process.exit(1);
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  console.log("Пароль:", decrypted.toString("utf8"));
} catch (e) {
  console.error("Не удалось расшифровать:", e.message);
  process.exit(1);
}
