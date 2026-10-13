import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { configureTrustProxy } from '../deployment.js';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.close(() => resolve());
    server.closeAllConnections();
  })));
});

describe('deployment proxy configuration', () => {
  it.each([
    [undefined, '127.0.0.1'],
    ['0', '127.0.0.1'],
    ['1', '203.0.113.7'],
  ])('resolves client IP with TRUST_PROXY_HOPS=%s', async (hops, expected) => {
    const app = express();
    configureTrustProxy(app, hops);
    app.get('/', (req, res) => res.json({ ip: req.ip }));
    const server = createServer(app);
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, {
      headers: { 'X-Forwarded-For': '198.51.100.99, 203.0.113.7' },
    });
    expect(await response.json()).toEqual({ ip: expected });
  });

  it.each(['true', '-1', '1.5', '1oops', ''])('rejects unsafe or malformed hop setting %s', value => {
    expect(() => configureTrustProxy(express(), value)).toThrow(/TRUST_PROXY_HOPS/);
  });
});
