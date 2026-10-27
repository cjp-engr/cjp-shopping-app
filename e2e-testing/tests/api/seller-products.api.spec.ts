// TC coverage: TC-304 (create: name, description, price and category are required)
//              TC-305 (create: optional fields, defaults, read-only fields ignored)
//              TC-306 (create: values outside the allowed range)
//              TC-307 (update: no field required, a changed field must stay valid)
//              TC-308 (update: unknown, malformed or someone else's id)
//              TC-309 (malformed JSON in a product field → 400)
//              TC-310 (empty strings for number fields are never turned into 0)
//              TC-311 (leading and trailing spaces are trimmed before saving)
//
// Route under test: /api/seller/products, the route both apps use. Shipping settings (TC-303) are valid in every
// request here so only the field under test can fail. A fresh seller account is created per worker (a second one for
// TC-308 only); every product a test creates is removed in afterAll. A rejected request is checked by looking for its
// unique product name in the seller's list, so the tests do not depend on each other and can run in parallel.

import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import { authHeaders, signupFreshUser } from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';
const REQUIRED_MESSAGE = 'name, description, price, and category are required';
const TAGS = ['@api', '@seller-products', '@validation'];

type Fields = Record<string, string | undefined>;

let sellerA: { token: string; userId: string };
let sellerB: { token: string; userId: string };   // only created for TC-308
const created: string[] = [];   // ids of products owned by seller A, removed in afterAll

let counter = 0;
const uniqueName = (label: string) => `SP ${label} ${Date.now()}-${++counter}`;

/** A request body that passes every rule. Tests change one field at a time. */
function validFields(name: string, extra: Fields = {}): Fields {
  return {
    name,
    description: 'Seller products API test, safe to delete',
    price: '20',
    category: 'Electronics',
    stock: '5',
    shippingOptions: JSON.stringify(['standard']),
    shippingFee: 'free',
    ...extra,
  };
}

function multipart(fields: Fields): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as Record<string, string>;
}

async function postProduct(request: APIRequestContext, fields: Fields, token = sellerA.token) {
  return request.post('/api/seller/products', { multipart: multipart(fields), headers: authHeaders(token) });
}

async function putProduct(request: APIRequestContext, id: string, fields: Fields, token = sellerA.token) {
  return request.put(`/api/seller/products/${id}`, { multipart: multipart(fields), headers: authHeaders(token) });
}

async function createProduct(request: APIRequestContext, label: string, extra: Fields = {}) {
  const name = uniqueName(label);
  const res = await postProduct(request, validFields(name, extra));
  const body = await res.json();
  expect(res.status(), JSON.stringify(body)).toBe(201);
  created.push(body.product._id);
  return body.product as Record<string, any>;
}

async function sellerProducts(request: APIRequestContext, token = sellerA.token): Promise<Array<Record<string, any>>> {
  const res = await request.get('/api/seller/products', { headers: authHeaders(token) });
  expect(res.status()).toBe(200);
  return (await res.json()).products;
}

async function storedProduct(request: APIRequestContext, id: string) {
  const found = (await sellerProducts(request)).find(p => p._id === id);
  expect(found, `product ${id} should exist`).toBeDefined();
  return found!;
}

async function expectNoProductNamed(request: APIRequestContext, name: string) {
  expect((await sellerProducts(request)).some(p => p.name === name), `"${name}" must not have been created`).toBe(false);
}

async function expectRejected(res: import('@playwright/test').APIResponse, message: string | RegExp, code?: string) {
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.success).toBe(false);
  if (typeof message === 'string') expect(body.message).toBe(message);
  else expect(body.message).toMatch(message);
  if (code) expect(body.code).toBe(code);
  else expect(body.code).toBeUndefined();
}

/** The prefix carries the worker index and a random part: workers that start in the same millisecond must not share an email. */
async function newSeller(request: APIRequestContext, prefix: string, workerIndex: number) {
  const user = await signupFreshUser(request, `${prefix}_w${workerIndex}_${Math.random().toString(36).slice(2, 8)}`);
  const res = await request.put('/api/auth/profile', { data: { role: 'seller' }, headers: authHeaders(user.token) });
  expect(res.ok(), 'promote to seller').toBe(true);
  return user;
}

test.beforeAll(async ({}, testInfo) => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });
  sellerA = await newSeller(ctx, 'sp_seller_a', testInfo.parallelIndex);
  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });
  const failures: string[] = [];
  for (const id of created) {
    const res = await ctx.delete(`/api/seller/products/${id}`, { headers: authHeaders(sellerA.token) });
    if (!res.ok()) failures.push(`product ${id}`);
  }
  await ctx.dispose();
  expect(failures, 'cleanup should remove what the run created').toEqual([]);
});

// ── TC-304 ──────────────────────────────────────────────────────────────────

test.describe('TC-304: Creating a product needs a name, description, price and category', () => {
  test(
    'a request with all four fields and shipping settings creates the product',
    { tag: ['@TC-304', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-304 control');
      expect(product.sellerId).toBe(sellerA.userId);
      expect(product._id).toBeTruthy();
    },
  );

  for (const field of ['name', 'description', 'price', 'category']) {
    test(
      `leaving out ${field} returns 400 and creates nothing`,
      { tag: ['@TC-304', ...TAGS] },
      async ({ request }) => {
        const name = uniqueName(`TC-304 no ${field}`);
        const res = await postProduct(request, validFields(name, { [field]: undefined }));
        await expectRejected(res, REQUIRED_MESSAGE);
        if (field !== 'name') await expectNoProductNamed(request, name);
      },
    );
  }

  for (const field of ['name', 'description', 'category']) {
    test(
      `an empty ${field} returns 400 and creates nothing`,
      { tag: ['@TC-304', ...TAGS] },
      async ({ request }) => {
        const name = uniqueName(`TC-304 empty ${field}`);
        const res = await postProduct(request, validFields(name, { [field]: '' }));
        await expectRejected(res, REQUIRED_MESSAGE);
        if (field !== 'name') await expectNoProductNamed(request, name);
      },
    );
  }

  test(
    'a name of only spaces is rejected by the model',
    { tag: ['@TC-304', ...TAGS] },
    async ({ request }) => {
      const res = await postProduct(request, validFields('   '));
      await expectRejected(res, 'Path `name` is required.');
    },
  );

  test(
    'a category of only spaces is rejected by the model',
    { tag: ['@TC-304', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-304 spaces category');
      const res = await postProduct(request, validFields(name, { category: '   ' }));
      await expectRejected(res, /is not a valid enum value for path `category`/);
      await expectNoProductNamed(request, name);
    },
  );

  test(
    'a price of 0 is accepted (the check is "missing", not "falsy")',
    { tag: ['@TC-304', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-304 price 0', { price: '0' });
      expect(product.price).toBe(0);
    },
  );
});

// ── TC-305 ──────────────────────────────────────────────────────────────────

test.describe('TC-305: Optional product fields can be left out and get their defaults', () => {
  test(
    'only the required fields create a product with the defaults',
    { tag: ['@TC-305', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-305 minimal');
      const res = await postProduct(request, { ...validFields(name), stock: undefined });
      expect(res.status()).toBe(201);
      const { product } = await res.json();
      created.push(product._id);
      expect(product).toMatchObject({ stock: 0, image: '', images: [], condition: 'new', tags: [], variants: [], rating: 0, reviews: 0, soldCount: 0 });
      expect(product.discount).toBeUndefined();
    },
  );

  test(
    'every optional field is stored as sent',
    { tag: ['@TC-305', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-305 full', {
        stock: '7', tags: 'lamp', brand: 'Acme', condition: 'used', sku: 'SKU-305', discount: '10', image: IMAGE,
      });
      expect(product).toMatchObject({ stock: 7, tags: ['lamp'], brand: 'Acme', condition: 'used', sku: 'SKU-305', discount: 10, image: IMAGE });
    },
  );

  test(
    'a variant product keeps its variants and stores a single image as an image list',
    { tag: ['@TC-305', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-305 variants', {
        variantAttributes: JSON.stringify([{ name: 'Size', values: ['S', 'M'] }]),
        variants: JSON.stringify([{ attributes: { Size: 'M' }, price: 20, stock: 3, sku: 'V-M', discount: 5, image: IMAGE }]),
      });
      expect(product.variants).toHaveLength(1);
      expect(product.variants[0]).toMatchObject({ price: 20, stock: 3, sku: 'V-M', discount: 5, images: [IMAGE] });
    },
  );

  test(
    'a variant product still needs a top-level price on this route',
    { tag: ['@TC-305', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-305 variants no price');
      const res = await postProduct(request, validFields(name, {
        price: undefined,
        variantAttributes: JSON.stringify([{ name: 'Size', values: ['M'] }]),
        variants: JSON.stringify([{ attributes: { Size: 'M' }, price: 20, stock: 3 }]),
      }));
      await expectRejected(res, REQUIRED_MESSAGE);
      await expectNoProductNamed(request, name);
    },
  );

  test(
    'rating, soldCount and sellerId sent by the client are ignored',
    { tag: ['@TC-305', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-305 read-only', { rating: '5', soldCount: '99', sellerId: '000000000000000000000001' });
      expect(product.rating).toBe(0);
      expect(product.soldCount).toBe(0);
      expect(product.sellerId).toBe(sellerA.userId);
    },
  );
});

// ── TC-306 ──────────────────────────────────────────────────────────────────

const VARIANT_ATTR = JSON.stringify([{ name: 'Size', values: ['M'] }]);
const variantWith = (patch: Record<string, unknown>) =>
  ({ variantAttributes: VARIANT_ATTR, variants: JSON.stringify([{ attributes: { Size: 'M' }, price: 20, stock: 3, ...patch }]) });

const VALUE_RULES: Array<[string, Fields, string | RegExp]> = [
  ['price -1', { price: '-1' }, 'Path `price` (-1) is less than minimum allowed value (0).'],
  ['price "abc"', { price: 'abc' }, /Cast to Number failed/],
  ['stock -1', { stock: '-1' }, 'Path `stock` (-1) is less than minimum allowed value (0).'],
  ['stock "abc"', { stock: 'abc' }, /Cast to Number failed/],
  ['category "Toys"', { category: 'Toys' }, '`Toys` is not a valid enum value for path `category`.'],
  ['description of 201 characters', { description: 'x'.repeat(201) }, /is longer than the maximum allowed length \(200\)/],
  ['discount -1', { discount: '-1' }, 'Path `discount` (-1) is less than minimum allowed value (0).'],
  ['discount 101', { discount: '101' }, 'Path `discount` (101) is more than maximum allowed value (100).'],
  ['discount "abc"', { discount: 'abc' }, /Cast to Number failed/],
  ['condition "broken"', { condition: 'broken' }, '`broken` is not a valid enum value for path `condition`.'],
  ['a variant attribute without a name', { variantAttributes: JSON.stringify([{ values: ['M'] }]) }, /Path `name` is required/],
  ['a variant with price -1', variantWith({ price: -1 }), /Path `price` \(-1\) is less than minimum allowed value \(0\)/],
  ['a variant with stock -1', variantWith({ stock: -1 }), /Path `stock` \(-1\) is less than minimum allowed value \(0\)/],
  ['a variant with discount 101', variantWith({ discount: 101 }), /Path `discount` \(101\) is more than maximum allowed value \(100\)/],
];

test.describe('TC-306: Creating a product rejects values outside the allowed range', () => {
  for (const [label, patch, message] of VALUE_RULES) {
    test(
      `${label} returns 400 and creates nothing`,
      { tag: ['@TC-306', ...TAGS] },
      async ({ request }) => {
        const name = uniqueName(`TC-306 ${label}`);
        const res = await postProduct(request, validFields(name, patch));
        await expectRejected(res, message);
        await expectNoProductNamed(request, name);
      },
    );
  }

  test(
    'a description of exactly 200 characters is accepted',
    { tag: ['@TC-306', '@TC-058', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-306 description 200', { description: 'x'.repeat(200) });
      expect(product.description).toHaveLength(200);
    },
  );

  test(
    'two bad fields at once return one 400 that lists both problems',
    { tag: ['@TC-306', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-306 two errors');
      const res = await postProduct(request, validFields(name, { price: '-1', stock: '-1' }));
      await expectRejected(res, /Path `price` \(-1\).*Path `stock` \(-1\)|Path `stock` \(-1\).*Path `price` \(-1\)/);
      await expectNoProductNamed(request, name);
    },
  );
});

// ── TC-307 ──────────────────────────────────────────────────────────────────

test.describe('TC-307: Updating a product needs no field, but a changed field must stay valid', () => {
  test(
    'sending only the price updates it and keeps every other field',
    { tag: ['@TC-307', ...TAGS] },
    async ({ request }) => {
      const before = await createProduct(request, 'TC-307 price only', { image: IMAGE });
      const res = await putProduct(request, before._id, { price: '25' });
      expect(res.status()).toBe(200);
      const { product } = await res.json();
      expect(product).toMatchObject({ price: 25, name: before.name, stock: before.stock, image: IMAGE, category: before.category });
    },
  );

  test(
    'sending only the stock (0) updates it',
    { tag: ['@TC-307', ...TAGS] },
    async ({ request }) => {
      const before = await createProduct(request, 'TC-307 stock only');
      const res = await putProduct(request, before._id, { stock: '0' });
      expect(res.status()).toBe(200);
      expect((await res.json()).product).toMatchObject({ stock: 0, price: before.price });
    },
  );

  test(
    'an empty body changes nothing',
    { tag: ['@TC-307', ...TAGS] },
    async ({ request }) => {
      const before = await createProduct(request, 'TC-307 empty body');
      const res = await request.put(`/api/seller/products/${before._id}`, { data: {}, headers: authHeaders(sellerA.token) });
      expect(res.status()).toBe(200);
      expect(await storedProduct(request, before._id)).toMatchObject({ name: before.name, price: before.price, stock: before.stock });
    },
  );

  for (const [field, message] of [
    ['name', 'Path `name` is required.'],
    ['description', 'Path `description` is required.'],
    ['category', 'Path `category` is required.'],
  ] as const) {
    test(
      `an empty ${field} returns 400 and the stored product is unchanged`,
      { tag: ['@TC-307', ...TAGS] },
      async ({ request }) => {
        const before = await createProduct(request, `TC-307 empty ${field}`);
        await expectRejected(await putProduct(request, before._id, { [field]: '' }), message);
        expect((await storedProduct(request, before._id))[field]).toBe(before[field]);
      },
    );
  }

  test(
    'a name of only spaces returns 400 and the stored name is unchanged',
    { tag: ['@TC-307', ...TAGS] },
    async ({ request }) => {
      const before = await createProduct(request, 'TC-307 spaces name');
      await expectRejected(await putProduct(request, before._id, { name: '   ' }), 'Path `name` is required.');
      expect((await storedProduct(request, before._id)).name).toBe(before.name);
    },
  );

  for (const [label, patch, message] of VALUE_RULES.filter(([l]) =>
    ['price -1', 'stock -1', 'category "Toys"', 'description of 201 characters', 'discount 101', 'condition "broken"'].includes(l))) {
    test(
      `${label} returns 400 and the stored product is unchanged`,
      { tag: ['@TC-307', ...TAGS] },
      async ({ request }) => {
        const before = await createProduct(request, `TC-307 ${label}`);
        await expectRejected(await putProduct(request, before._id, patch), message);
        expect(await storedProduct(request, before._id)).toMatchObject({
          price: before.price, stock: before.stock, category: before.category, description: before.description,
        });
      },
    );
  }
});

// ── TC-308 ──────────────────────────────────────────────────────────────────

test.describe("TC-308: Updating a product with an unknown, malformed or someone else's id", () => {
  test.beforeAll(async ({}, testInfo) => {
    const ctx = await pwRequest.newContext({ baseURL: API_URL });
    sellerB = await newSeller(ctx, 'sp_seller_b', testInfo.parallelIndex);
    await ctx.dispose();
  });

  test(
    'a well-formed id that does not exist returns 404',
    { tag: ['@TC-308', ...TAGS] },
    async ({ request }) => {
      const res = await putProduct(request, '000000000000000000000000', { price: '25' });
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe('Product not found');
    },
  );

  test(
    'an id that is not an id returns 400',
    { tag: ['@TC-308', ...TAGS] },
    async ({ request }) => {
      await expectRejected(await putProduct(request, 'not-an-id', { price: '25' }), 'Invalid resource ID');
    },
  );

  for (const [label, patch] of [
    ['a valid body', { price: '25' }],
    ['an invalid price', { price: '-1' }],
    ['no delivery option', { shippingOptions: '[]' }],
  ] as Array<[string, Fields]>) {
    test(
      `another seller sending ${label} gets 403 and the product is unchanged`,
      { tag: ['@TC-308', '@security', ...TAGS] },
      async ({ request }) => {
        const before = await createProduct(request, `TC-308 foreign ${label}`);
        const res = await putProduct(request, before._id, patch, sellerB.token);
        expect(res.status()).toBe(403);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe('Not authorized to update this product');
        expect(await storedProduct(request, before._id)).toMatchObject({ price: before.price, shippingOptions: before.shippingOptions });
      },
    );
  }
});

// ── TC-309 ──────────────────────────────────────────────────────────────────

const JSON_FIELDS = ['shippingOptions', 'shippingFeeAmounts', 'variants', 'variantAttributes'];

test.describe('TC-309: Malformed JSON in a product field returns 400', () => {
  for (const field of JSON_FIELDS) {
    test(
      `creating with a malformed ${field} returns 400 invalid_product_json`,
      { tag: ['@TC-309', ...TAGS] },
      async ({ request }) => {
        const name = uniqueName(`TC-309 create ${field}`);
        const res = await postProduct(request, validFields(name, { [field]: '[{' }));
        await expectRejected(res, `${field} must be valid JSON.`, 'invalid_product_json');
        await expectNoProductNamed(request, name);
      },
    );

    test(
      `updating with a malformed ${field} returns 400 invalid_product_json and changes nothing`,
      { tag: ['@TC-309', ...TAGS] },
      async ({ request }) => {
        const before = await createProduct(request, `TC-309 update ${field}`);
        const res = await putProduct(request, before._id, { price: '30', [field]: '{' });
        await expectRejected(res, `${field} must be valid JSON.`, 'invalid_product_json');
        expect((await storedProduct(request, before._id)).price).toBe(before.price);
      },
    );
  }

  test(
    'a blank shippingOptions counts as not sent, so the shipping rule answers',
    { tag: ['@TC-309', '@TC-303', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-309 blank shippingOptions');
      const res = await postProduct(request, validFields(name, { shippingOptions: '' }));
      await expectRejected(res, 'At least one delivery option is required.', 'invalid_shipping_settings');
      await expectNoProductNamed(request, name);
    },
  );

  test(
    'a blank variants counts as not sent, so the product has no variants',
    { tag: ['@TC-309', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-309 blank variants', { variants: '' });
      expect(product.variants).toEqual([]);
    },
  );
});

// ── TC-310 ──────────────────────────────────────────────────────────────────

test.describe('TC-310: Empty strings for number fields are never turned into 0', () => {
  for (const price of ['', '   ']) {
    test(
      `creating with the price ${JSON.stringify(price)} returns 400 "required" and creates nothing`,
      { tag: ['@TC-310', ...TAGS] },
      async ({ request }) => {
        const name = uniqueName('TC-310 empty price');
        await expectRejected(await postProduct(request, validFields(name, { price })), REQUIRED_MESSAGE);
        await expectNoProductNamed(request, name);
      },
    );
  }

  test(
    'an empty stock on create is the default 0',
    { tag: ['@TC-310', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-310 empty stock', { stock: '' });
      expect(product.stock).toBe(0);
    },
  );

  test(
    'an empty discount on create means no discount',
    { tag: ['@TC-310', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-310 empty discount', { discount: '' });
      expect(product.discount).toBeUndefined();
    },
  );

  for (const field of ['price', 'stock']) {
    test(
      `updating with an empty ${field} returns 400 and keeps the stored value`,
      { tag: ['@TC-310', ...TAGS] },
      async ({ request }) => {
        const before = await createProduct(request, `TC-310 update empty ${field}`);
        await expectRejected(await putProduct(request, before._id, { [field]: '' }), `${field} cannot be empty.`, 'invalid_product_number');
        expect((await storedProduct(request, before._id))[field]).toBe(before[field]);
      },
    );
  }

  test(
    'updating with an empty discount is ignored and the stored discount stays',
    { tag: ['@TC-310', ...TAGS] },
    async ({ request }) => {
      const before = await createProduct(request, 'TC-310 update empty discount', { discount: '10' });
      const res = await putProduct(request, before._id, { discount: '' });
      expect(res.status()).toBe(200);
      expect((await storedProduct(request, before._id)).discount).toBe(10);
    },
  );

  test(
    'a description of only spaces is rejected',
    { tag: ['@TC-310', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-310 spaces description');
      await expectRejected(await postProduct(request, validFields(name, { description: '   ' })), 'Path `description` is required.');
      await expectNoProductNamed(request, name);
    },
  );
});

// ── TC-311 ──────────────────────────────────────────────────────────────────

const SPACED_VARIANTS = {
  variantAttributes: JSON.stringify([{ name: ' Size ', values: [' S ', ' M'] }]),
  variants: JSON.stringify([{ attributes: { ' Size ': ' M ' }, price: 20, stock: 3, sku: ' V-M ' }]),
};

test.describe('TC-311: Leading and trailing spaces are trimmed before saving', () => {
  test(
    'creating trims name, description, brand, sku and tags, and keeps spaces inside a value',
    { tag: ['@TC-311', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-311 text', {
        name: `  ${uniqueName('TC-311 text')}  x  y `,
        description: '  A  lamp ',
        brand: ' Acme ',
        sku: ' SKU-311 ',
        tags: ' lamp ',
      });
      expect(product.name).toMatch(/^SP TC-311 text \d+-\d+  x  y$/);
      expect(product).toMatchObject({ description: 'A  lamp', brand: 'Acme', sku: 'SKU-311', tags: ['lamp'] });
    },
  );

  test(
    'creating trims the variant attributes, their keys and values, and the variant sku',
    { tag: ['@TC-311', ...TAGS] },
    async ({ request }) => {
      const product = await createProduct(request, 'TC-311 variants', SPACED_VARIANTS);
      expect(product.variantAttributes[0]).toMatchObject({ name: 'Size', values: ['S', 'M'] });
      expect(product.variants[0].attributes).toEqual({ Size: 'M' });
      expect(product.variants[0].sku).toBe('V-M');
    },
  );

  test(
    'updating trims the same fields',
    { tag: ['@TC-311', ...TAGS] },
    async ({ request }) => {
      const before = await createProduct(request, 'TC-311 update', { variantAttributes: JSON.stringify([{ name: 'Size', values: ['M'] }]), variants: JSON.stringify([{ attributes: { Size: 'M' }, price: 20, stock: 3 }]) });
      const newName = `${before.name} renamed`;
      const res = await putProduct(request, before._id, { name: `  ${newName}  `, brand: ' Acme ', tags: ' lamp ', ...SPACED_VARIANTS });
      expect(res.status()).toBe(200);
      const { product } = await res.json();
      expect(product).toMatchObject({ name: newName, brand: 'Acme', tags: ['lamp'] });
      expect(product.variants[0].attributes).toEqual({ Size: 'M' });
      expect(product.variants[0].sku).toBe('V-M');
      expect(await storedProduct(request, before._id)).toMatchObject({ name: newName });
    },
  );

  test(
    'a category with a space around it is not trimmed and is rejected',
    { tag: ['@TC-311', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-311 category');
      await expectRejected(await postProduct(request, validFields(name, { category: ' Electronics' })), /is not a valid enum value for path `category`/);
      await expectNoProductNamed(request, name);
    },
  );

  test(
    'a delivery option with a space around it is not trimmed and is rejected',
    { tag: ['@TC-311', '@TC-303', ...TAGS] },
    async ({ request }) => {
      const name = uniqueName('TC-311 shippingOptions');
      const res = await postProduct(request, validFields(name, { shippingOptions: JSON.stringify([' standard ']) }));
      await expectRejected(res, 'Unknown delivery option " standard ". Use standard, express or pickup.', 'invalid_shipping_settings');
      await expectNoProductNamed(request, name);
    },
  );
});
