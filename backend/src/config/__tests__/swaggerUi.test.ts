import express from 'express';
import helmet from 'helmet';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountApiDocs } from '../swaggerUi.js';

const servers: Server[] = [];
async function start(mode?: string) {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  mountApiDocs(app, mode);
  app.get('/health', (_req, res) => res.json({ success: true }));
  const server = createServer(app);
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
});

describe('Swagger HTTP integration', () => {
  it.each(['development', 'test', undefined])('serves protected documentation in %s', async mode => {
    if (mode === undefined) vi.stubEnv('NODE_ENV', undefined);
    const base = await start(mode);
    for (const path of ['/api-docs/', '/api-docs/swagger-ui.css', '/api-docs/swagger-ui-init.js', '/api-docs.json']) {
      const response = await fetch(base + path);
      expect(response.status, path).toBe(200);
      expect(response.headers.get('x-content-type-options'), path).toBe('nosniff');
      expect(response.headers.get('x-frame-options'), path).toBe('SAMEORIGIN');
      const csp = response.headers.get('content-security-policy')!;
      expect(csp, path).toContain("script-src 'self'");
      expect(csp, path).not.toMatch(/script-src[^;]*unsafe-inline/);
      if (path !== '/api-docs.json') expect(csp, path).not.toContain('upgrade-insecure-requests');
    }
    const init = await (await fetch(base + '/api-docs/swagger-ui-init.js')).text();
    let options: Record<string, unknown> = {};
    const bundle = Object.assign((value: Record<string, unknown>) => { options = value; return {}; }, { presets: { apis: {} }, plugins: { DownloadUrl: {} } });
    const window = { location: { origin: base, search: '?url=https://example.com/untrusted.json' }, onload: () => {} };
    runInNewContext(init, { window, SwaggerUIBundle: bundle, SwaggerUIStandalonePreset: {} });
    window.onload();
    expect(options.url).toBe('/api-docs.json');
    expect(options.validatorUrl).toBeNull();
    expect(options.persistAuthorization).toBe(false);
    expect(options.queryConfigEnabled).toBe(false);
    const spec = await (await fetch(base + '/api-docs.json')).json() as { openapi: string };
    expect(spec.openapi).toBe('3.0.3');
    const health = await fetch(base + '/health');
    expect(health.headers.get('content-security-policy')).toContain('upgrade-insecure-requests');
  });

  it('does not expose documentation or assets in production', async () => {
    const base = await start('production');
    for (const path of ['/api-docs', '/api-docs/', '/api-docs.json', '/api-docs/swagger-ui-init.js']) expect((await fetch(base + path)).status, path).toBe(404);
    expect((await fetch(base + '/health')).status).toBe(200);
  });
});
