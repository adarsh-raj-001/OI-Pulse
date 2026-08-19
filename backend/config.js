// Single place that assembles config: tunables from config.json,
// secrets from .env. Nothing else in the app should read process.env
// or config.json directly — import from here instead.

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from this file's own folder (backend/), not from wherever
// the process happens to be started — so `npm start` works the same
// whether run from backend/ or from the project root.
dotenv.config({ path: path.join(__dirname, '.env') });

const tunables = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  return v;
}

const dataSource = tunables.dataSource;

export const secrets = {
  // Only required when actually using the Dhan source — the free NSE
  // source needs no credentials at all.
  dhanClientId: dataSource === 'dhan' ? required('DHAN_CLIENT_ID') : process.env.DHAN_CLIENT_ID || null,
  dhanAccessToken: dataSource === 'dhan' ? required('DHAN_ACCESS_TOKEN') : process.env.DHAN_ACCESS_TOKEN || null,
  // VAPID keys power push notifications. Optional — notifications just
  // stay disabled until both are set. Generate with: npx web-push generate-vapid-keys
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || null,
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
};

export const config = {
  port: Number(process.env.PORT) || 8787,
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',

  dataSource,
  symbols: tunables.symbolsBySource[dataSource],
  strikesEachSide: tunables.strikesEachSide,
  pollIntervalMs: tunables.pollIntervalMs,
  ssePushIntervalMs: tunables.ssePushIntervalMs,
  historyMaxMs: tunables.historyMaxMs,
  thresholds: tunables.thresholds,
  notifyCooldownMs: tunables.notifyCooldownMs,
};

export const notificationsEnabled = !!(secrets.vapidPublicKey && secrets.vapidPrivateKey);
