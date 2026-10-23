import { createServer, type Server } from 'node:http';
import { once } from 'node:events';

/** Stateful provider simulator survives child-process crashes independently of MongoDB. */
export class PaymentProvider {
  intents = new Map<string, any>();
  refunds: any[] = [];
  captures: Array<{ id: string; key: string }> = [];
  releases: Array<{ id: string; key: string }> = [];
  refundCalls: string[] = [];
  private captureKeys = new Set<string>();
  private releaseKeys = new Set<string>();
  private blockedAction?: string;
  private actionReached?: () => void;
  private server?: Server;
  private counter = 0;

  create(params: any) {
    const id = `pi_flow_${++this.counter}`;
    this.intents.set(id, {
      id, status: 'requires_capture', capture_method: 'manual', livemode: false, amount: params.amountMinor,
      amount_capturable: params.amountMinor, amount_received: 0, currency: params.currency,
      customer: params.customerId, metadata: params.metadata, client_secret: `test_secret_${id}`,
      latest_charge: { id: `ch_${id}`, paid: true, amount: params.amountMinor, amount_refunded: 0,
        created: Math.floor(Date.now() / 1000), payment_method_details: { card: { capture_before: Math.floor((Date.now() + 7 * 86400000) / 1000) } } },
    });
    return { id, clientSecret: `test_secret_${id}`, status: 'requires_capture' };
  }
  retrieve(id: string) {
    const intent = this.intents.get(id);
    if (!intent) throw new Error(`Unknown test intent ${id}`);
    return structuredClone(intent);
  }
  capture(id: string, amount: number, key: string) {
    const intent = this.intents.get(id);
    if (!this.captureKeys.has(key)) {
      if (intent.status !== 'requires_capture' || amount !== intent.amount) throw new Error('Invalid test capture');
      this.captureKeys.add(key);
      this.captures.push({ id, key });
      Object.assign(intent, { status: 'succeeded', amount_capturable: 0, amount_received: amount });
    }
    return { id, status: intent.status, amountReceived: intent.amount_received };
  }
  release(id: string, key: string) {
    const intent = this.intents.get(id);
    if (!this.releaseKeys.has(key)) {
      if (intent.status === 'succeeded') throw new Error('Cannot release captured funds');
      this.releaseKeys.add(key);
      this.releases.push({ id, key });
      intent.status = 'canceled';
    }
    return { id, status: intent.status };
  }
  refund(id: string, amount: number, key: string, orderId: string, refundRequestId?: string) {
    this.refundCalls.push(key);
    const existing = this.refunds.find(refund => refund.metadata.operationKey === key);
    if (existing) return structuredClone(existing);
    const intent = this.intents.get(id);
    if (intent.status !== 'succeeded' || amount <= 0 || amount + intent.latest_charge.amount_refunded > intent.amount_received) throw new Error('Invalid test refund');
    const refund = { id: `re_flow_${this.refunds.length + 1}`, payment_intent: id, amount, currency: intent.currency,
      status: 'succeeded', metadata: { orderId, operationKey: key, ...(refundRequestId ? { refundRequestId } : {}) } };
    this.refunds.push(refund);
    intent.latest_charge.amount_refunded += amount;
    return structuredClone(refund);
  }
  blockResponseAfter(action: 'capture' | 'release' | 'refund'): Promise<void> {
    this.blockedAction = action;
    return new Promise(resolve => { this.actionReached = resolve; });
  }
  async listen(): Promise<string> {
    this.server = createServer(async (request, response) => {
      try {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const args = JSON.parse(Buffer.concat(chunks).toString()) as any[];
        const [id, amount, key, orderId, refundRequestId] = args;
        const action = request.url?.slice(1);
        let result;
        if (action === 'retrieve') result = this.retrieve(id);
        else if (action === 'capture') result = this.capture(id, amount, key);
        else if (action === 'release') result = this.release(id, amount);
        else if (action === 'refund') result = this.refund(id, amount, key, orderId, refundRequestId);
        else if (action === 'list-refunds') result = this.refunds.filter(refund => refund.payment_intent === id);
        else if (action === 'retrieve-refund') result = this.refunds.find(refund => refund.id === id);
        else { response.writeHead(404).end(); return; }
        if (action === this.blockedAction) { this.blockedAction = undefined; this.actionReached?.(); return; }
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify(result));
      } catch { response.writeHead(500).end(); }
    });
    this.server.listen(0, '127.0.0.1');
    await once(this.server, 'listening');
    const address = this.server.address();
    if (!address || typeof address === 'string') throw new Error('No test provider address');
    return `http://127.0.0.1:${address.port}/`;
  }
  async close() {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise<void>((resolve, reject) => this.server!.close(error => error ? reject(error) : resolve()));
  }
}
