#!/usr/bin/env node

import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import { resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index];
  const value = process.argv[index + 1];
  if (!name?.startsWith("--") || !value) {
    throw new Error(`Expected --name value arguments; received ${name ?? "nothing"}.`);
  }
  args.set(name.slice(2), value);
}

const teamId = args.get("team-id") ?? process.env.APPLE_MUSIC_TEAM_ID;
const keyId = args.get("key-id") ?? process.env.APPLE_MUSIC_KEY_ID;
const privateKeyPath = args.get("private-key") ?? process.env.APPLE_MUSIC_PRIVATE_KEY_PATH;
const envPath = resolve(args.get("write-env") ?? ".env.local");
const requestedDays = Number(args.get("days") ?? "180");

if (!teamId || !/^[A-Z0-9]{10}$/.test(teamId)) {
  throw new Error("Provide a 10-character Apple Team ID with --team-id.");
}
if (!keyId || !/^[A-Z0-9]{10}$/.test(keyId)) {
  throw new Error("Provide a 10-character Apple Key ID with --key-id.");
}
if (!privateKeyPath || !existsSync(privateKeyPath)) {
  throw new Error("Provide the existing .p8 path with --private-key.");
}
if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 182) {
  throw new Error("--days must be an integer from 1 to 182.");
}

const base64urlJson = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + requestedDays * 24 * 60 * 60;
const header = base64urlJson({ alg: "ES256", kid: keyId });
const payload = base64urlJson({ iss: teamId, iat: issuedAt, exp: expiresAt });
const signingInput = `${header}.${payload}`;
const privateKey = createPrivateKey(readFileSync(privateKeyPath, "utf8"));
if (privateKey.asymmetricKeyType !== "ec") {
  throw new Error("The supplied .p8 file is not an elliptic-curve private key.");
}

const signature = sign("sha256", Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: "ieee-p1363",
});
const signatureIsValid = verify(
  "sha256",
  Buffer.from(signingInput),
  { key: createPublicKey(privateKey), dsaEncoding: "ieee-p1363" },
  signature,
);
if (!signatureIsValid) throw new Error("Local signature verification failed.");

const token = `${signingInput}.${signature.toString("base64url")}`;
const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const tokenLine = `APPLE_MUSIC_DEVELOPER_TOKEN=${token}`;
const next = /^APPLE_MUSIC_DEVELOPER_TOKEN=.*$/m.test(existing)
  ? existing.replace(/^APPLE_MUSIC_DEVELOPER_TOKEN=.*$/m, tokenLine)
  : `${existing.trimEnd()}${existing.trim() ? "\n" : ""}${tokenLine}\n`;

writeFileSync(envPath, next, { encoding: "utf8", mode: 0o600 });
chmodSync(envPath, 0o600);

process.stdout.write(
  `Apple Music developer token written to ${envPath}. Expires ${new Date(expiresAt * 1000).toISOString()}.\n`,
);
