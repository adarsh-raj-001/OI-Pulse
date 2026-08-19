// Dhan option chain source. Requires DHAN_CLIENT_ID / DHAN_ACCESS_TOKEN in .env.
// Symbol config shape: { name, dhan: { securityId, segment } }

import { secrets } from '../config.js';

const DHAN_BASE = 'https://api.dhan.co/v2';
const headers = {
  'Content-Type': 'application/json',
  'access-token': secrets.dhanAccessToken,
  'client-id': secrets.dhanClientId,
};

const expiryCache = {};

async function fetchExpiry(sym) {
  const res = await fetch(`${DHAN_BASE}/optionchain/expirylist`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ UnderlyingScrip: sym.dhan.securityId, UnderlyingSeg: sym.dhan.segment }),
  });
  if (!res.ok) throw new Error(`expirylist ${sym.name}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const dates = data?.data || [];
  if (!dates.length) throw new Error(`no expiries returned for ${sym.name}`);
  return dates[0];
}

export async function fetchSnapshot(sym) {
  if (!expiryCache[sym.name]) expiryCache[sym.name] = await fetchExpiry(sym);

  const res = await fetch(`${DHAN_BASE}/optionchain`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      UnderlyingScrip: sym.dhan.securityId,
      UnderlyingSeg: sym.dhan.segment,
      Expiry: expiryCache[sym.name],
    }),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) expiryCache[sym.name] = null; // expiry may have rolled
    throw new Error(`optionchain ${sym.name}: ${res.status} ${await res.text()}`);
  }
  const raw = await res.json();

  const oc = raw?.data?.oc || {};
  const strikes = {};
  for (const [strikeStr, legs] of Object.entries(oc)) {
    strikes[Number(strikeStr)] = { ce: legs?.ce?.oi ?? 0, pe: legs?.pe?.oi ?? 0 };
  }
  return { underlyingPrice: raw?.data?.last_price ?? null, strikes };
}

export const label = 'Dhan (official)';
