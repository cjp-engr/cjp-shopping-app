const bearer = [{ bearerAuth: [] }];

const json = (description: string, schema: object = { $ref: '#/components/schemas/ApiResponse' }) => ({
  description,
  content: { 'application/json': { schema } },
});

const body = (schema: object, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});

const pathParam = (name: string, description = 'Resource ID') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});

const queryParam = (name: string, description: string) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema: { type: 'string' },
});

const errors = {
  '400': { $ref: '#/components/responses/BadRequest' },
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
};

const authOp = (op: object) => ({ security: bearer, responses: errors, ...op });

const sellerOp = <T extends { responses: Record<string, object>; description?: string }>(op: T) => authOp({
  ...op,
  description: op.description ?? 'Requires an authenticated seller account.',
  responses: { ...op.responses, '403': errors['403'] },
});

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TokoMart API',
    version: '1.0.0',
    description: 'Backend API for the TokoMart e-commerce app (web and mobile).',
  },
  servers: [{ url: '/api', description: 'API base path' }],
  tags: [
    { name: 'Auth', description: 'Signup, login, profile, saved cards and addresses' },
    { name: 'Products', description: 'Product catalog and seller product management' },
    { name: 'Orders', description: 'Buyer orders' },
    { name: 'Seller', description: 'Seller dashboard endpoints' },
    { name: 'Cart', description: 'Server-side cart sync' },
    { name: 'Reviews', description: 'Product reviews and ratings' },
    { name: 'Users', description: 'User search, profiles and follows' },
    { name: 'Coupons', description: 'Promo codes' },
    { name: 'Payments', description: 'Stripe payment intents, saved cards and webhook' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object', additionalProperties: true },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Something went wrong' },
        },
      },
      SavedPaymentMethod: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          brand: { type: 'string', example: 'visa' },
          last4: { type: 'string', example: '4242' },
          expiryMonth: { type: 'integer', example: 12 },
          expiryYear: { type: 'integer', example: 2030 },
          isDefault: { type: 'boolean' },
        },
      },
      SavedAddress: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zipCode: { type: 'string' },
          country: { type: 'string' },
          isDefault: { type: 'boolean' },
        },
      },
    },
    responses: {
      BadRequest: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Unauthorized: { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden: { description: 'Seller account required or access to this resource is denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
  paths: {
    '/health': {
      servers: [{ url: '/', description: 'Server root (health check is outside /api)' }],
      get: { tags: ['Auth'], summary: 'Health check', responses: { '200': json('Server is running') } },
    },

    // ── Auth ───────────────────────────────────────────────────────────────
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new account',
        requestBody: body({
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password'],
          properties: {
            firstName: { type: 'string', minLength: 1 },
            lastName: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        }),
        responses: { '201': json('Account created'), '400': errors['400'] },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT',
        requestBody: body({
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        }),
        responses: { '200': json('Logged in, token returned'), '400': errors['400'], '401': errors['401'] },
      },
    },
    '/auth/me': {
      get: authOp({ tags: ['Auth'], summary: 'Get the current user', responses: { '200': json('Current user'), '401': errors['401'] } }),
    },
    '/auth/profile': {
      put: authOp({
        tags: ['Auth'],
        summary: 'Update profile',
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '200': json('Profile updated'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/auth/avatar': {
      post: authOp({
        tags: ['Auth'],
        summary: 'Upload profile avatar',
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } },
        },
        responses: { '200': json('Avatar uploaded'), '401': errors['401'] },
      }),
    },
    '/auth/payment-methods': {
      get: authOp({
        tags: ['Auth'],
        summary: 'List saved cards',
        responses: { '200': json('Saved cards', { type: 'object', properties: { paymentMethods: { type: 'array', items: { $ref: '#/components/schemas/SavedPaymentMethod' } } } }), '401': errors['401'] },
      }),
      post: authOp({
        tags: ['Auth'],
        summary: 'Save card details to the user profile',
        description: 'Optionally attach the card to the Stripe customer by providing stripePaymentMethodId.',
        requestBody: body({
          type: 'object',
          required: ['type', 'last4', 'expiryMonth', 'expiryYear'],
          properties: {
            type: { type: 'string', enum: ['credit-card', 'debit-card', 'paypal'] },
            brand: { type: 'string', example: 'visa' },
            last4: { type: 'string', example: '4242' },
            cardHolder: { type: 'string', example: 'John Doe' },
            expiryMonth: { type: 'string', example: '12' },
            expiryYear: { type: 'string', example: '2030' },
            setAsDefault: { type: 'boolean', example: false },
            stripePaymentMethodId: { type: 'string', example: 'pm_...' },
          },
        }),
        responses: { '201': json('Card saved'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/auth/payment-methods/{id}': {
      delete: authOp({
        tags: ['Auth'],
        summary: 'Delete a saved card',
        parameters: [pathParam('id')],
        responses: { '200': json('Card deleted'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/auth/payment-methods/{id}/default': {
      patch: authOp({
        tags: ['Auth'],
        summary: 'Set a saved card as default',
        parameters: [pathParam('id')],
        responses: { '200': json('Default card updated'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/auth/saved-addresses': {
      get: authOp({ tags: ['Auth'], summary: 'List saved addresses', responses: { '200': json('Saved addresses'), '401': errors['401'] } }),
      post: authOp({
        tags: ['Auth'],
        summary: 'Add a saved address',
        requestBody: body({ $ref: '#/components/schemas/SavedAddress' }),
        responses: { '201': json('Address added'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/auth/saved-addresses/{id}': {
      put: authOp({
        tags: ['Auth'],
        summary: 'Update a saved address',
        parameters: [pathParam('id')],
        requestBody: body({ $ref: '#/components/schemas/SavedAddress' }),
        responses: { '200': json('Address updated'), '400': errors['400'], '401': errors['401'], '404': errors['404'] },
      }),
      delete: authOp({
        tags: ['Auth'],
        summary: 'Delete a saved address',
        parameters: [pathParam('id')],
        responses: { '200': json('Address deleted'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/auth/saved-addresses/{id}/default': {
      put: authOp({
        tags: ['Auth'],
        summary: 'Set a saved address as default',
        parameters: [pathParam('id')],
        responses: { '200': json('Default address updated'), '401': errors['401'], '404': errors['404'] },
      }),
    },

    // ── Products ───────────────────────────────────────────────────────────
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        parameters: [
          queryParam('category', 'Filter by category'),
          queryParam('search', 'Search by name'),
          queryParam('page', 'Page number'),
          queryParam('limit', 'Items per page'),
        ],
        responses: { '200': json('Product list') },
      },
      post: sellerOp({
        tags: ['Products'],
        summary: 'Create a product (seller)',
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '201': json('Product created'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/products/categories/all': {
      get: { tags: ['Products'], summary: 'List product categories', responses: { '200': json('Categories') } },
    },
    '/products/seller/{sellerId}': {
      get: {
        tags: ['Products'],
        summary: 'Public seller profile and products',
        parameters: [pathParam('sellerId', 'Seller user ID')],
        responses: { '200': json('Seller profile'), '404': errors['404'] },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get one product',
        parameters: [pathParam('id', 'Product ID')],
        responses: { '200': json('Product'), '404': errors['404'] },
      },
      put: sellerOp({
        tags: ['Products'],
        summary: 'Update a product (seller)',
        parameters: [pathParam('id', 'Product ID')],
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '200': json('Product updated'), '400': errors['400'], '401': errors['401'], '404': errors['404'] },
      }),
      delete: sellerOp({
        tags: ['Products'],
        summary: 'Delete a product (seller)',
        parameters: [pathParam('id', 'Product ID')],
        responses: { '200': json('Product deleted'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/products/{id}/image': {
      post: sellerOp({
        tags: ['Products'],
        summary: 'Upload a product image (seller)',
        parameters: [pathParam('id', 'Product ID')],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } },
        },
        responses: { '200': json('Image uploaded'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/products/variant-image': {
      post: sellerOp({
        tags: ['Products'],
        summary: 'Upload a variant image (seller)',
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } },
        },
        responses: { '200': json('Image uploaded'), '401': errors['401'] },
      }),
    },

    // ── Orders ─────────────────────────────────────────────────────────────
    '/orders': {
      get: authOp({ tags: ['Orders'], summary: "List the current user's orders", responses: { '200': json('Orders'), '401': errors['401'] } }),
      post: authOp({
        tags: ['Orders'],
        summary: 'Place an order',
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '201': json('Order created'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/orders/{id}': {
      get: authOp({
        tags: ['Orders'],
        summary: 'Get one order',
        parameters: [pathParam('id', 'Order ID')],
        responses: { '200': json('Order'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/orders/{id}/status': {
      put: authOp({
        tags: ['Orders'],
        summary: 'Update order status',
        parameters: [pathParam('id', 'Order ID')],
        requestBody: body({ type: 'object', required: ['status'], properties: { status: { type: 'string' } } }),
        responses: { '200': json('Status updated'), '400': errors['400'], '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/orders/{id}/confirm-received': {
      put: authOp({
        tags: ['Orders'],
        summary: 'Buyer confirms an order was received',
        parameters: [pathParam('id', 'Order ID')],
        responses: { '200': json('Order confirmed'), '401': errors['401'], '404': errors['404'] },
      }),
    },

    // ── Seller ─────────────────────────────────────────────────────────────
    '/seller/products': {
      get: sellerOp({ tags: ['Seller'], summary: "List the seller's products", responses: { '200': json('Products'), '401': errors['401'] } }),
      post: sellerOp({
        tags: ['Seller'],
        summary: 'Create a product with images',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', additionalProperties: true } } } },
        responses: { '201': json('Product created'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/seller/products/{id}': {
      put: sellerOp({
        tags: ['Seller'],
        summary: 'Update a product with images',
        parameters: [pathParam('id', 'Product ID')],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', additionalProperties: true } } } },
        responses: { '200': json('Product updated'), '401': errors['401'], '404': errors['404'] },
      }),
      delete: sellerOp({
        tags: ['Seller'],
        summary: 'Delete a product',
        parameters: [pathParam('id', 'Product ID')],
        responses: { '200': json('Product deleted'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/seller/orders': {
      get: sellerOp({ tags: ['Seller'], summary: "List orders containing the seller's products", responses: { '200': json('Orders'), '401': errors['401'] } }),
    },
    '/seller/orders/{id}/status': {
      put: sellerOp({
        tags: ['Seller'],
        summary: 'Update status of a seller order',
        parameters: [pathParam('id', 'Order ID')],
        requestBody: body({ type: 'object', required: ['status'], properties: { status: { type: 'string' } } }),
        responses: { '200': json('Status updated'), '400': errors['400'], '401': errors['401'], '404': errors['404'] },
      }),
    },

    // ── Cart ───────────────────────────────────────────────────────────────
    '/cart': {
      get: authOp({ tags: ['Cart'], summary: 'Get the saved cart', responses: { '200': json('Cart'), '401': errors['401'] } }),
      put: authOp({
        tags: ['Cart'],
        summary: 'Replace the saved cart (sync)',
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '200': json('Cart synced'), '400': errors['400'], '401': errors['401'] },
      }),
      delete: authOp({ tags: ['Cart'], summary: 'Clear the cart', responses: { '200': json('Cart cleared'), '401': errors['401'] } }),
    },

    // ── Reviews ────────────────────────────────────────────────────────────
    '/reviews/product/{productId}': {
      get: {
        tags: ['Reviews'],
        summary: 'List reviews for a product',
        parameters: [pathParam('productId', 'Product ID')],
        responses: { '200': json('Reviews') },
      },
    },
    '/reviews': {
      post: authOp({
        tags: ['Reviews'],
        summary: 'Create a review',
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '201': json('Review created'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/reviews/{id}': {
      put: authOp({
        tags: ['Reviews'],
        summary: 'Update a review',
        parameters: [pathParam('id', 'Review ID')],
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '200': json('Review updated'), '400': errors['400'], '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/reviews/check/{productId}': {
      get: authOp({
        tags: ['Reviews'],
        summary: 'Check whether the current user already reviewed a product',
        parameters: [pathParam('productId', 'Product ID')],
        responses: { '200': json('Review status'), '401': errors['401'] },
      }),
    },

    // ── Users ──────────────────────────────────────────────────────────────
    '/users': {
      get: authOp({
        tags: ['Users'],
        summary: 'Search users',
        parameters: [queryParam('q', 'Search text')],
        responses: { '200': json('Users'), '401': errors['401'] },
      }),
    },
    '/users/{id}': {
      get: authOp({
        tags: ['Users'],
        summary: 'Get a user profile',
        parameters: [pathParam('id', 'User ID')],
        responses: { '200': json('User profile'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/users/{id}/follow': {
      post: authOp({
        tags: ['Users'],
        summary: 'Follow a user',
        parameters: [pathParam('id', 'User ID')],
        responses: { '200': json('Followed'), '401': errors['401'], '404': errors['404'] },
      }),
      delete: authOp({
        tags: ['Users'],
        summary: 'Unfollow a user',
        parameters: [pathParam('id', 'User ID')],
        responses: { '200': json('Unfollowed'), '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/users/{id}/followers': {
      get: authOp({
        tags: ['Users'],
        summary: 'List followers',
        parameters: [pathParam('id', 'User ID')],
        responses: { '200': json('Followers'), '401': errors['401'] },
      }),
    },
    '/users/{id}/following': {
      get: authOp({
        tags: ['Users'],
        summary: 'List users this user follows',
        parameters: [pathParam('id', 'User ID')],
        responses: { '200': json('Following'), '401': errors['401'] },
      }),
    },

    // ── Coupons ────────────────────────────────────────────────────────────
    '/coupons': {
      get: authOp({ tags: ['Coupons'], summary: 'List available coupons', responses: { '200': json('Coupons'), '401': errors['401'] } }),
    },
    '/coupons/validate': {
      post: authOp({
        tags: ['Coupons'],
        summary: 'Validate a promo code',
        requestBody: body({ type: 'object', required: ['code'], properties: { code: { type: 'string', example: 'SAVE10' } } }),
        responses: { '200': json('Coupon is valid'), '400': errors['400'], '401': errors['401'], '404': errors['404'] },
      }),
    },
    '/coupons/seller': {
      get: sellerOp({ tags: ['Coupons'], summary: "List the seller's coupons", responses: { '200': json('Coupons'), '401': errors['401'] } }),
      post: sellerOp({
        tags: ['Coupons'],
        summary: 'Create a coupon (seller)',
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '201': json('Coupon created'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/coupons/seller/{id}': {
      put: sellerOp({
        tags: ['Coupons'],
        summary: 'Update a coupon (seller)',
        parameters: [pathParam('id', 'Coupon ID')],
        requestBody: body({ type: 'object', additionalProperties: true }),
        responses: { '200': json('Coupon updated'), '400': errors['400'], '401': errors['401'], '404': errors['404'] },
      }),
      delete: sellerOp({
        tags: ['Coupons'],
        summary: 'Delete a coupon (seller)',
        parameters: [pathParam('id', 'Coupon ID')],
        responses: { '200': json('Coupon deleted'), '401': errors['401'], '404': errors['404'] },
      }),
    },

    // ── Payments ───────────────────────────────────────────────────────────
    '/payments/create-intent': {
      post: authOp({
        tags: ['Payments'],
        summary: 'Create a Stripe PaymentIntent for checkout',
        requestBody: body({
          type: 'object',
          required: ['amountInCents'],
          properties: {
            amountInCents: { type: 'integer', minimum: 1, description: 'Payment amount in USD cents', example: 1500 },
            stripePaymentMethodId: { type: 'string', description: 'Optional Stripe PaymentMethod to use for payment', example: 'pm_...' },
          },
        }),
        responses: { '200': json('Client secret returned'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/payments/save-card': {
      post: authOp({
        tags: ['Payments'],
        summary: 'Attach a Stripe PaymentMethod to the customer',
        requestBody: body({ type: 'object', required: ['stripePaymentMethodId'], properties: { stripePaymentMethodId: { type: 'string', example: 'pm_...' } } }),
        responses: { '200': json('Card saved'), '400': errors['400'], '401': errors['401'] },
      }),
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe webhook (signature-verified, raw body)',
        requestBody: body({ type: 'string' }),
        responses: { '200': json('Event received'), '400': errors['400'] },
      },
    },
  },
};
