import { schemas, ref, type Schema } from './swaggerSchemas.js';
import { requestExamples } from './swaggerExamples.js';

const json = (description: string, schema: Schema) => ({ description, content: { 'application/json': { schema } } });
const body = (name: string, media = 'application/json', required = true) => ({ required, content: { [media]: { schema: ref(name), ...(requestExamples[name] ? { example: requestExamples[name] } : {}) } } });
const pathParam = (name = 'id') => ({ name, in: 'path', required: true, description: 'MongoDB resource ID', schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } });
const query = (name: string, description: string, schema: Schema = { type: 'string' }, required = false) => ({ name, in: 'query', required, description, schema });
const pagination = (limit: number) => [
  query('page', 'Page number, starting at 1.', { type: 'integer', minimum: 1, default: 1 }),
  query('limit', 'Items per page.', { type: 'integer', minimum: 1, default: limit }),
];
const responseRef = (name: string) => ({ $ref: `#/components/responses/${name}` });
const errorNames: Record<string, string> = { '400': 'BadRequest', '401': 'Unauthorized', '402': 'PaymentRequired', '403': 'Forbidden', '404': 'NotFound', '409': 'Conflict', '426': 'UpdateRequired', '429': 'TooManyRequests', '500': 'ServerError' };
type ErrorCodeMap = Partial<Record<string, string[]>>;
type OperationOptions = {
  auth?: boolean; seller?: boolean; status?: number; errors?: number[];
  paymentErrors?: boolean; description?: string; requestBody?: object; parameters?: object[];
  /** Checkout handlers send `{ success, error: { code } }` for 4xx responses, not the shared Error envelope. */
  structured?: boolean;
  /** Machine-readable error codes per status, published as `x-error-codes` and checked by the contract test. */
  errorCodes?: ErrorCodeMap;
};
function op(operationId: string, tag: string, summary: string, response: string, options: OperationOptions = {}) {
  const { auth, seller, status = 200, errors = [], paymentErrors, structured, errorCodes, ...details } = options;
  const responses: Record<string, object> = { [status]: json(summary, ref(response)), '500': responseRef('ServerError') };
  for (const code of errors) {
    const isSharedEnvelope = ['401', '429', '500'].includes(String(code));
    responses[code] = structured && !isSharedEnvelope
      ? json(`Checkout error. Codes: ${(errorCodes?.[String(code)] ?? []).join(', ')}`, ref('StructuredError'))
      : responseRef(errorNames[code]);
  }
  if (auth || seller) responses['401'] = responseRef('Unauthorized');
  if (seller) responses['403'] = responseRef('Forbidden');
  // These groups are mounted behind authLimiter/apiLimiter in server.ts.
  if (tag !== 'Payments') responses['429'] = responseRef('TooManyRequests');
  if (paymentErrors) for (const code of ['400', '404', '500']) {
    if (responses[code]) responses[code] = json(code === '500' ? 'Server or payment service failure' : code === '404' ? 'User or saved card not found' : 'Invalid payment input or Stripe failure', ref('PaymentErrorResponse'));
  }
  return {
    operationId, tags: [tag], summary, ...details,
    ...(seller ? { description: `Requires an authenticated seller account. ${details.description ?? ''}`.trim() } : {}),
    ...((auth || seller) ? { security: [{ bearerAuth: [] }] } : {}),
    ...(errorCodes ? { 'x-error-codes': errorCodes } : {}),
    responses,
  };
}
const ids = [pathParam()];
const checkoutSessionCreate = op('postCheckoutSessions', 'Checkout', 'Create a card checkout session that reserves stock and coupons and creates per-seller drafts', 'CheckoutSessionResponse', {
  auth: true, status: 201, errors: [400, 402, 403, 409], requestBody: body('CheckoutSessionCreateInput'), structured: true,
  errorCodes: {
    '400': ['idempotency_key_required', 'invalid_request', 'unsupported_payment_method', 'product_not_found', 'variant_not_found', 'product_has_no_seller'],
    '402': ['authorization_rejected'],
    '403': ['saved_card_not_owned'],
    '409': ['checkout_flow_disabled', 'idempotency_conflict', 'insufficient_stock', 'coupon_unavailable', 'authorization_in_progress', 'authorization_unresolved', 'session_closed', 'session_expired', 'session_placed', 'finalization_in_progress'],
  },
  parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, description: 'Unique per checkout attempt (8-128 characters). Replaying the same key and body returns the existing session with 200; reusing it with a different body returns 409 idempotency_conflict.', schema: { type: 'string', minLength: 8, maxLength: 128 } }],
  description: 'Requires CHECKOUT_FLOW=manual_capture; otherwise returns 409 checkout_flow_disabled. Prices are computed on the server. Stock, coupon capacity and per-seller draft orders are reserved in one transaction. Then one manual-capture PaymentIntent is created per seller; the response carries each seller’s client secret. A 402 authorization_rejected means a seller payment could not be created: the checkout is failed and every hold obtained for it is released and its stock and coupons restored. 409 authorization_in_progress is retryable; authorization_unresolved means Stripe’s outcome is unknown and needs support review, and the session stays open.',
});
checkoutSessionCreate.responses['200'] = json('Existing session returned for a replayed Idempotency-Key', ref('CheckoutSessionResponse'));
const sellerOrderStatusUpdate = op('putSellerOrdersByIdStatus', 'Seller', 'Update an owned seller order', 'OrderResponse', {
  seller: true, errors: [400, 404, 409], parameters: ids, requestBody: body('SellerOrderStatusInput'),
  errorCodes: {
    '403': ['not_order_seller'],
    '404': ['order_not_found'],
    '409': ['acceptance_deadline_passed', 'order_not_pending', 'payment_reference_missing', 'capture_failed', 'authorization_expired', 'cancellation_unavailable'],
  },
  description: 'Allowed transitions: pending → preparing → processing → shipped → delivered. Any nonterminal status except shipped can become cancelled. Delivered and cancelled are terminal. The order must contain the seller’s product. Moving a pending order to preparing is the seller’s acceptance: a card order placed under the manual-capture flow is captured first, and the order becomes preparing only when the full amount is captured. 200 means the transition completed. 202 means a capture the seller started is still settling (for example a repeat accept while it is in flight); the order stays pending with paymentStatus capture_pending, so read the order again until it reaches preparing. 409 acceptance_deadline_passed means the order is past acceptBy; authorization_expired means the card hold lapsed and the order was cancelled with no new charge; capture_failed means the hold is still valid and accepting can be retried. Cancelling a manual-capture order returns 409 cancellation_unavailable for now. Errors keep the { success, message, code } envelope.',
});
sellerOrderStatusUpdate.responses['202'] = json('Acceptance accepted; the capture is still resolving', ref('SellerOrderAcceptingResponse'));
const imageDescription = 'JPG/JPEG, PNG or WebP; maximum 5 MiB per file. Multer/Cloudinary upload failures currently use the server error response.';

export const swaggerSpec = {
  openapi: '3.0.3',
  info: { title: 'TokoMart API', version: '1.0.0', description: 'Backend API for TokoMart web and mobile. Response envelopes are endpoint-specific: auth uses top-level token/user, checkout uses data (structured errors carry error.code), cart uses sellers, and payments/reviews use data. Monetary values are USD amounts except amountInCents. This specification describes existing behavior and does not enforce request validation.' },
  servers: [{ url: '/api', description: 'API base path' }],
  tags: [
    { name: 'Auth', description: 'Signup, login, profiles, saved cards and addresses. All auth routes share a rate limit: 10 requests per minute by default (RATE_LIMIT_AUTH_MAX; 0 disables).' },
    { name: 'Products', description: 'Catalog and seller product management. Public catalog excludes out-of-stock products.' },
    { name: 'Orders', description: 'Buyer checkout and order history; one order per seller.' },
    { name: 'Checkout', description: 'Card checkout sessions with manual-capture authorization (feature-flagged).' },
    { name: 'Seller', description: 'Seller products and fulfillment; seller role and ownership are required.' },
    { name: 'Cart', description: 'Replace, fetch and clear the server cart, grouped by seller.' },
    { name: 'Reviews', description: 'One review per buyer/product, from a delivered order.' },
    { name: 'Users', description: 'User search, public profiles and follows.' },
    { name: 'Coupons', description: 'Seller vouchers and buyer validation.' },
    { name: 'Payments', description: 'Stripe payment intents, saved cards and signed webhooks. These routes are not behind the API rate limiter.' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
    responses: {
      BadRequest: json('Invalid request, validation failure, stock shortage or invalid order transition. Validator middleware includes errors; other handlers return message.', { anyOf: [ref('Error'), ref('ValidationError')] }),
      Unauthorized: json('Missing, invalid or expired JWT; auth middleware uses success/message even on payment routes.', ref('Error')),
      PaymentRequired: json('The supplied Stripe PaymentIntent has not succeeded.', ref('Error')),
      Forbidden: json('Seller role required, ownership denied, or order is not eligible for review.', ref('Error')),
      NotFound: json('Resource does not exist or is not owned by the current user.', ref('Error')),
      Conflict: json('Duplicate review, coupon code or already-used payment intent.', ref('Error')),
      UpdateRequired: json('Card checkout moved to checkout sessions in this app version; update the app and use POST /api/checkout/sessions. Cash-on-delivery orders are unaffected. error.details.reason explains the rejection.', ref('StructuredError')),
      ServerError: json('Unexpected database, validation, upload or service error. Some handlers report model validation errors as 500.', ref('Error')),
      TooManyRequests: {
        ...json('Rate limit exceeded. Auth defaults to 10 requests/minute; other limited API groups default to 100/minute. RATE_LIMIT_AUTH_MAX and RATE_LIMIT_API_MAX override these; 0 disables limits.', ref('Error')),
        headers: {
          'Retry-After': { description: 'Seconds until retry is permitted.', schema: { type: 'integer' } },
          'RateLimit-Limit': { description: 'Request limit for this window.', schema: { type: 'integer' } },
          'RateLimit-Remaining': { description: 'Remaining requests.', schema: { type: 'integer' } },
          'RateLimit-Reset': { description: 'Seconds until the window resets.', schema: { type: 'integer' } },
          'RateLimit-Policy': { description: 'Configured policy, e.g. 100;w=60.', schema: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      servers: [{ url: '/', description: 'Health check is outside /api' }],
      get: { operationId: 'getHealth', tags: ['Auth'], summary: 'Health check', responses: { '200': json('Server is running', ref('HealthResponse')) } },
    },
    '/auth/signup': { post: op('postAuthSignup', 'Auth', 'Create a new account', 'AuthResponse', { status: 201, errors: [400], requestBody: body('SignupInput') }) },
    '/auth/login': { post: op('postAuthLogin', 'Auth', 'Log in and receive a JWT', 'AuthResponse', { errors: [400, 401], requestBody: body('LoginInput') }) },
    '/auth/me': { get: op('getAuthMe', 'Auth', 'Get the current user', 'UserResponse', { auth: true, errors: [404] }) },
    '/auth/profile': { put: op('putAuthProfile', 'Auth', 'Update profile', 'UserResponse', { auth: true, errors: [400, 404], requestBody: body('ProfileInput'), description: 'Only supplied fields change. role: seller promotes a buyer; demotion is not supported.' }) },
    '/auth/avatar': { post: op('postAuthAvatar', 'Auth', 'Upload profile avatar', 'UserResponse', { auth: true, errors: [400, 404], requestBody: body('AvatarUploadInput', 'multipart/form-data'), description: 'One JPG/JPEG, PNG or WebP avatar, maximum 2 MiB. Cloudinary crops to 200 × 200. Upload middleware errors currently return 500.' }) },
    '/auth/payment-methods': {
      get: op('getAuthPaymentMethods', 'Auth', 'List saved cards', 'SavedCardsResponse', { auth: true, errors: [404], paymentErrors: true }),
      post: op('postAuthPaymentMethods', 'Auth', 'Save card details to the user profile', 'SavedCardsResponse', { auth: true, status: 201, errors: [400, 404], paymentErrors: true, requestBody: body('SavedPaymentMethodInput'), description: 'Optionally attaches stripePaymentMethodId to Stripe. Duplicate last4/expiry combinations return the existing cards with 201. The first card becomes default.' }),
    },
    '/auth/payment-methods/{id}': { delete: op('deleteAuthPaymentMethodsById', 'Auth', 'Delete a saved card', 'SavedCardsResponse', { auth: true, errors: [404], paymentErrors: true, parameters: ids }) },
    '/auth/payment-methods/{id}/default': { patch: op('patchAuthPaymentMethodsByIdDefault', 'Auth', 'Set a saved card as default', 'SavedCardsResponse', { auth: true, errors: [404], paymentErrors: true, parameters: [{ name: 'id', in: 'path', required: true, description: 'Saved card MongoDB ID, legacy id, or Stripe PaymentMethod ID.', schema: { type: 'string' } }] }) },
    '/auth/saved-addresses': {
      get: op('getAuthSavedAddresses', 'Auth', 'List saved addresses', 'SavedAddressesResponse', { auth: true, errors: [404] }),
      post: op('postAuthSavedAddresses', 'Auth', 'Add a saved address', 'SavedAddressesResponse', { auth: true, status: 201, errors: [400, 404], requestBody: body('SavedAddressInput'), description: 'The first address becomes default; setAsDefault selects subsequent defaults.' }),
    },
    '/auth/saved-addresses/{id}': {
      put: op('putAuthSavedAddressesById', 'Auth', 'Replace a saved address', 'SavedAddressesResponse', { auth: true, errors: [400, 404], parameters: ids, requestBody: body('SavedAddressUpdate'), description: 'street and city are required; omitted optional fields are reset to defaults.' }),
      delete: op('deleteAuthSavedAddressesById', 'Auth', 'Delete a saved address', 'SavedAddressesResponse', { auth: true, errors: [404], parameters: ids }),
    },
    '/auth/saved-addresses/{id}/default': { put: op('putAuthSavedAddressesByIdDefault', 'Auth', 'Set a saved address as default', 'SavedAddressesResponse', { auth: true, errors: [404], parameters: ids, description: 'An unknown address ID currently clears existing defaults and returns 200.' }) },
    '/products': {
      get: op('getProducts', 'Products', 'List in-stock products', 'ProductListResponse', { parameters: [
        query('category', 'Filter by category.'), query('search', 'MongoDB text search across name and description.'),
        query('minPrice', 'Minimum product-level price.', { type: 'number' }), query('maxPrice', 'Maximum product-level price.', { type: 'number' }),
        query('rating', 'Minimum product rating.', { type: 'number' }), query('minReviews', 'Minimum review count.', { type: 'number' }),
        query('excludeSellerId', 'Exclude products belonging to this seller.'),
        query('sort', 'Ordering; unknown values fall back to newest.', { type: 'string', default: 'createdAt', enum: ['createdAt', 'newest', 'price-asc', 'price-desc', 'rating', 'name'] }),
        ...pagination(20),
      ], description: 'Includes products with positive base stock or at least one in-stock variant. page and limit are parsed as integers; invalid pagination can return 500.' }),
      post: op('postProducts', 'Products', 'Create a product using JSON', 'ProductResponse', { seller: true, status: 201, errors: [400], requestBody: body('ProductCreateInput'), description: 'Requires delivery options and fees, an image URL, and stock unless variants exist. This route currently validates image but does not persist it; use /seller/products for creation with stored images.' }),
    },
    '/products/categories/all': { get: op('getProductsCategoriesAll', 'Products', 'List product categories', 'CategoriesResponse') },
    '/products/seller/{sellerId}': { get: op('getProductsSellerBySellerId', 'Products', 'Public seller profile and products', 'SellerProfileResponse', { errors: [404], parameters: [pathParam('sellerId')] }) },
    '/products/{id}': {
      get: op('getProductsById', 'Products', 'Get one product', 'ProductResponse', { errors: [404], parameters: ids }),
      put: op('putProductsById', 'Products', 'Update a product using JSON', 'ProductResponse', { seller: true, errors: [400, 404], parameters: ids, requestBody: body('ProductUpdateInput'), description: 'Ownership required. Merged fields must satisfy image, delivery, price and stock validation. Use the dedicated image endpoint to persist a new image.' }),
      delete: op('deleteProductsById', 'Products', 'Delete a product', 'MessageResponse', { seller: true, errors: [404], parameters: ids, description: 'Ownership required.' }),
    },
    '/products/{id}/image': { post: op('postProductsByIdImage', 'Products', 'Upload a product image', 'ProductImageResponse', { seller: true, errors: [400, 404], parameters: ids, requestBody: body('ProductImageUploadInput', 'multipart/form-data'), description: `Ownership required. ${imageDescription}` }) },
    '/products/variant-image': { post: op('postProductsVariantImage', 'Products', 'Upload a variant image', 'ImageResponse', { seller: true, errors: [400], requestBody: body('ProductImageUploadInput', 'multipart/form-data'), description: imageDescription }) },
    '/orders': {
      get: op('getOrders', 'Orders', 'List the current buyer’s orders', 'OrderListResponse', { auth: true }),
      post: op('postOrders', 'Orders', 'Place orders grouped by seller', 'OrdersResponse', { auth: true, status: 201, errors: [400, 402, 404, 409, 426], requestBody: body('OrderCreateInput'), description: 'Creates one order per seller, snapshots product/variant pricing, validates stock, applies product/coupon discounts, 8% tax and shipping, and removes ordered products from the cart. Invalid/inactive coupons are ignored. Maps are keyed by seller ID. Supplied card payment intents are checked with Stripe; the saved/mock-card path permits omission.' }),
    },
    '/checkout/sessions': { post: checkoutSessionCreate },
    '/checkout/sessions/{id}/confirm': {
      post: op('postCheckoutSessionsByIdConfirm', 'Checkout', 'Verify every seller payment hold and place the orders', 'CheckoutConfirmResponse', {
        auth: true, errors: [404, 409], parameters: ids, structured: true,
        errorCodes: {
          '404': ['session_not_found'],
          '409': ['checkout_flow_disabled', 'finalization_in_progress', 'session_closed', 'session_expired', 'authorization_not_ready', 'authorization_canceled', 'authorization_deadline_invalid', 'authorization_mismatch', 'finalization_conflict'],
        },
        description: 'Owner-only. Verifies each seller’s PaymentIntent with Stripe: status requires_capture, manual capture, same customer, currency, amount, metadata and a known future authorization deadline. If every check passes, orders move to pending/authorized in one transaction and the checked-out cart lines are removed. Retrying a placed checkout returns the existing orders. 409 authorization_not_ready means the buyer has not finished payment yet and the session stays open; authorization_canceled, authorization_mismatch and authorization_deadline_invalid mark the session failed. Gated by CHECKOUT_FLOW=manual_capture.',
      }),
    },
    '/checkout/sessions/{id}': {
      get: op('getCheckoutSessionsById', 'Checkout', 'Get one owned checkout session', 'CheckoutSessionResponse', {
        auth: true, errors: [404], parameters: ids, structured: true,
        errorCodes: { '404': ['session_not_found'] },
        description: 'Owner-only. Another buyer’s session, or an unknown ID, returns 404. Sessions past expiresAt read as expired. Client secrets are included only for sellers whose payment is still awaiting buyer confirmation, and are read from Stripe on each request.',
      }),
    },
    '/orders/{id}': { get: op('getOrdersById', 'Orders', 'Get one owned order', 'OrderResponse', { auth: true, errors: [400, 403, 404], parameters: ids }) },
    '/orders/{id}/status': { put: op('putOrdersByIdStatus', 'Orders', 'Cancel a pending order as buyer', 'OrderResponse', { auth: true, errors: [400, 403, 404, 409], parameters: ids, requestBody: body('BuyerCancelInput', 'application/json', false), description: 'Only the buyer who owns a pending order may cancel it. Manual-capture orders release their hold and restore stock and coupon capacity once. Repeated cancellation returns the cancelled order. A competing acceptance/capture returns 409 cancellation_conflict. A successful cancellation may return paymentStatus release_pending while Stripe release is retried. Legacy behavior is unchanged. Cancellation reason is optional text of at most 500 characters.' }) },
    '/orders/{id}/confirm-received': { put: op('putOrdersByIdConfirmReceived', 'Orders', 'Buyer confirms receipt of a shipped order', 'OrderResponse', { auth: true, errors: [400, 403, 404], parameters: ids }) },
    '/seller/products': {
      get: op('getSellerProducts', 'Seller', 'List the seller’s products', 'ProductsResponse', { seller: true }),
      post: op('postSellerProducts', 'Seller', 'Create a product with images', 'ProductResponse', { seller: true, status: 201, errors: [400], requestBody: body('SellerProductCreateInput', 'multipart/form-data'), description: `Up to 10 images; ${imageDescription} JSON-encode shippingOptions, shippingFeeAmounts, variantAttributes, variants and imageUrls. Images and shipping settings are optional on this route.` }),
    },
    '/seller/products/{id}': {
      put: op('putSellerProductsById', 'Seller', 'Update a product with images', 'ProductResponse', { seller: true, errors: [400, 404], parameters: ids, requestBody: body('SellerProductUpdateInput', 'multipart/form-data'), description: `Ownership required. Up to 10 images; ${imageDescription} Omitted fields are preserved. Nonempty uploaded images/imageUrls replace the image list.` }),
      delete: op('deleteSellerProductsById', 'Seller', 'Delete an owned product', 'MessageResponse', { seller: true, errors: [400, 404], parameters: ids }),
    },
    '/seller/orders': { get: op('getSellerOrders', 'Seller', 'List orders containing the seller’s products', 'OrdersResponse', { seller: true, description: 'Items are filtered to the current seller’s products; order monetary totals remain the stored order totals.' }) },
    '/seller/orders/{id}/status': { put: sellerOrderStatusUpdate },
    '/cart': {
      get: op('getCart', 'Cart', 'Get the saved cart', 'CartResponse', { auth: true }),
      put: op('putCart', 'Cart', 'Replace the saved cart', 'CartResponse', { auth: true, requestBody: body('CartSyncInput'), description: 'Replaces the whole cart, groups items by product seller and filters non-positive quantities. Missing items is treated as empty. isSelected defaults to true; missing price falls back to product price.' }),
      delete: op('deleteCart', 'Cart', 'Clear the cart', 'SuccessResponse', { auth: true }),
    },
    '/reviews/product/{productId}': { get: op('getReviewsProductByProductId', 'Reviews', 'List reviews for a product', 'ReviewsResponse', { parameters: [pathParam('productId'), ...pagination(10)] }) },
    '/reviews': { post: op('postReviews', 'Reviews', 'Create a review', 'ReviewResponse', { auth: true, status: 201, errors: [400, 403, 409], requestBody: body('ReviewCreateInput'), description: 'Requires a delivered order owned by the current buyer containing the product. Only one review per buyer/product. Invalid model fields may return 500.' }) },
    '/reviews/{id}': { put: op('putReviewsById', 'Reviews', 'Update an owned review', 'ReviewResponse', { auth: true, errors: [400, 404], parameters: ids, requestBody: body('ReviewUpdateInput'), description: 'Provide rating or comment. A review owned by another user returns 404.' }) },
    '/reviews/check/{productId}': { get: op('getReviewsCheckByProductId', 'Reviews', 'Check whether the current user reviewed a product', 'ReviewCheckResponse', { auth: true, parameters: [pathParam('productId')] }) },
    '/users': { get: op('getUsers', 'Users', 'Search users', 'UsersResponse', { auth: true, parameters: [query('q', 'Case-insensitive first/last name search; empty query lists up to 30 other users.')] }) },
    '/users/{id}': { get: op('getUsersById', 'Users', 'Get a public user profile', 'PublicUserResponse', { auth: true, errors: [400, 404], parameters: ids }) },
    '/users/{id}/follow': {
      post: op('postUsersByIdFollow', 'Users', 'Follow a user', 'FollowResponse', { auth: true, errors: [400, 404], parameters: ids, description: 'Cannot follow yourself. Following an already-followed user is idempotent.' }),
      delete: op('deleteUsersByIdFollow', 'Users', 'Unfollow a user', 'FollowResponse', { auth: true, errors: [400], parameters: ids, description: 'Idempotent; a missing target may still return 200.' }),
    },
    '/users/{id}/followers': { get: op('getUsersByIdFollowers', 'Users', 'List followers', 'UsersResponse', { auth: true, errors: [400], parameters: ids }) },
    '/users/{id}/following': { get: op('getUsersByIdFollowing', 'Users', 'List followed users', 'UsersResponse', { auth: true, errors: [400, 404], parameters: ids }) },
    '/coupons': { get: op('getCoupons', 'Coupons', 'List available coupons for a seller', 'CouponsResponse', { auth: true, errors: [400], parameters: [query('sellerId', 'Seller ID; required.', { type: 'string' }, true), query('orderAmount', 'Filter by minimum order amount.', { type: 'number' })] }) },
    '/coupons/validate': { post: op('postCouponsValidate', 'Coupons', 'Validate a promo code for a seller', 'CouponValidationResponse', { auth: true, errors: [400, 404], requestBody: body('CouponValidateInput'), description: 'Checks active status, expiry, usage limit and minimum amount. Computes a discount preview; does not redeem or increment usage.' }) },
    '/coupons/seller': {
      get: op('getCouponsSeller', 'Coupons', 'List the seller’s coupons', 'CouponsResponse', { seller: true }),
      post: op('postCouponsSeller', 'Coupons', 'Create a coupon', 'CouponResponse', { seller: true, status: 201, errors: [400, 409], requestBody: body('CouponCreateInput'), description: 'Codes are normalized to uppercase and globally unique. Model validation failures currently return 500.' }),
    },
    '/coupons/seller/{id}': {
      put: op('putCouponsSellerById', 'Coupons', 'Update an owned coupon', 'CouponResponse', { seller: true, errors: [404], parameters: ids, requestBody: body('CouponUpdateInput'), description: 'Only documented update fields are applied; code and sellerId cannot change. A coupon belonging to another seller returns 404.' }),
      delete: op('deleteCouponsSellerById', 'Coupons', 'Delete an owned coupon', 'MessageResponse', { seller: true, errors: [404], parameters: ids }),
    },
    '/payments/create-intent': { post: op('postPaymentsCreateIntent', 'Payments', 'Create a Stripe PaymentIntent', 'PaymentIntentResponse', { auth: true, errors: [400, 404, 426], paymentErrors: true, requestBody: body('PaymentIntentInput'), description: 'Requires a saved server cart. Uses USD cents. Stripe/service failures return structured error.code, error.message and error.retryable; auth failures use success/message.' }) },
    '/payments/save-card': { post: op('postPaymentsSaveCard', 'Payments', 'Attach a Stripe PaymentMethod to the customer', 'SaveCardResponse', { auth: true, errors: [400, 404], paymentErrors: true, requestBody: body('SaveCardInput') }) },
    '/payments/webhook': {
      post: {
        operationId: 'postPaymentsWebhook', tags: ['Payments'], summary: 'Handle a signed Stripe webhook',
        description: 'Requires stripe-signature and STRIPE_WEBHOOK_SECRET. Send original raw application/json bytes. Events are durably recorded and processed under a lease. Processing failures return 500 and are automatically retried by the inbox worker, including after restart. Duplicate processed events are acknowledged without reprocessing. Stored snapshots exclude card details and client secrets.',
        parameters: [{ name: 'stripe-signature', in: 'header', required: true, description: 'Stripe-generated signature for the unmodified raw body.', schema: { type: 'string' } }],
        requestBody: body('StripeEvent'),
        responses: { '200': json('Event recorded or already processed', ref('WebhookResponse')), '400': json('Signature verification failed', ref('WebhookError')), '500': json('Event persistence or processing failed; retry required', ref('WebhookError')) },
      },
    },
  },
};
