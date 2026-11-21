// ฝั่งเซิร์ฟเวอร์: ส่ง Web Push ตามมาตรฐาน RFC 8291 (เข้ารหัส aes128gcm) + RFC 8292 (VAPID)
// เขียนด้วย node:crypto ล้วน ไม่ต้องลงไลบรารีเพิ่ม
import crypto from "node:crypto";

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const fromB64u = (s) => Buffer.from(String(s), "base64url");

// ปลายทางของบริการแจ้งเตือนที่ยอมให้ส่งไป (กันไม่ให้เซิร์ฟเวอร์ถูกใช้ยิงเว็บอื่น)
export const PUSH_HOST_OK = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

function vapidKey() {
  const pub = fromB64u(process.env.VAPID_PUBLIC_KEY);
  if (pub.length !== 65) throw new Error("VAPID_PUBLIC_KEY ไม่ถูกต้อง");
  return crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: process.env.VAPID_PRIVATE_KEY },
    format: "jwk",
  });
}

export function vapidJwt(audience, key = vapidKey()) {
  const head = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64u(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || "https://tamha-nong.vercel.app",
  }));
  const input = `${head}.${claims}`;
  const sig = crypto.sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });
  return `${input}.${b64u(sig)}`;
}

export function encryptPayload(p256dh, auth, plaintext, opts = {}) {
  const uaPub = fromB64u(p256dh);
  const authSecret = fromB64u(auth);
  const ecdh = crypto.createECDH("prime256v1");
  if (opts.asPrivate) ecdh.setPrivateKey(opts.asPrivate); else ecdh.generateKeys(); // opts ใช้ตอนทดสอบเท่านั้น
  const asPub = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPub);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub]);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const salt = opts.salt || crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const data = Buffer.concat([Buffer.from(plaintext, "utf8"), Buffer.from([2])]);
  const enc = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, enc]);
}

export async function sendPush(sub, payload) {
  if (!PUSH_HOST_OK.test(sub.endpoint)) return { endpoint: sub.endpoint, status: 0 };
  const aud = new URL(sub.endpoint).origin;
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: "86400",
      Urgency: "high",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${vapidJwt(aud)}, k=${process.env.VAPID_PUBLIC_KEY}`,
    },
    body: encryptPayload(sub.p256dh, sub.auth, payload),
  });
  return { endpoint: sub.endpoint, status: res.status };
}
