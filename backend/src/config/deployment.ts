import type { Express } from 'express';

// Trust only the known proxy chain. Never enable blanket `trust proxy: true`.
export function configureTrustProxy(app: Express, raw = process.env.TRUST_PROXY_HOPS): void {
  if (raw === undefined) {
    app.set('trust proxy', false);
    return;
  }
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }
  app.set('trust proxy', Number(raw));
}
