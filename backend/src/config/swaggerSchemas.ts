// Schemas describe the existing wire format; controllers intentionally use
// different response envelopes. Keep request fields separate from stored models.
import { refundSchemas } from './refundSchemas.js';
export type Schema = Record<string, unknown>;
export const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const str = { type: 'string' };
const num = { type: 'number' };
const money = { type: 'number', minimum: 0 };
const bool = { type: 'boolean' };
const date = { type: 'string', format: 'date-time' };
const id = { type: 'string', pattern: '^[a-fA-F0-9]{24}$', example: '507f1f77bcf86cd799439011' };
const strings = { type: 'array', items: str };
const stringMap = { type: 'object', additionalProperties: str };
const numberMap = { type: 'object', additionalProperties: num };
const arr = (items: Schema): Schema => ({ type: 'array', items });
const obj = (properties: Record<string, Schema>, required: string[] = []): Schema => ({
  type: 'object', properties, ...(required.length ? { required } : {}),
});
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: 'string', nullable: true, enum: [null] }] });
const related = (name: string): Schema => nullable({ anyOf: [id, ref(name)] });
const success = { type: 'boolean', enum: [true] };
const failure = { type: 'boolean', enum: [false] };
const response = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => obj({ success, ...properties }, ['success', ...required]);
// Checkout handlers use sendSuccess, which nests the payload under `data`.
const dataResponse = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => obj({ success, data: obj(properties, required) }, ['success', 'data']);
const timestamps = { createdAt: date, updatedAt: date };
const category = { type: 'string', enum: ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors'] };
const status = { type: 'string', enum: ['pending', 'preparing', 'processing', 'shipped', 'delivered', 'cancelled'] };
const discount = { type: 'number', minimum: 0, maximum: 100 };
const paymentType = { type: 'string', enum: ['credit-card', 'debit-card', 'paypal', 'cash-on-delivery'] };

const address = { street: str, city: str, state: str, zipCode: str, country: str };
const card = {
  type: { type: 'string', enum: ['credit-card', 'debit-card', 'paypal'] },
  brand: str, last4: str, cardHolder: str,
  expiryMonth: { type: 'string', example: '12' }, expiryYear: { type: 'string', example: '2030' },
  stripePaymentMethodId: { type: 'string', example: 'pm_...' },
};
const variant = {
  attributes: stringMap, price: money, stock: money, sku: str, images: strings, discount,
  image: { type: 'string', description: 'Legacy single image; normalized to images when supplied.' },
};
const productFields = {
  name: { type: 'string', minLength: 1 }, description: { type: 'string', minLength: 1, maxLength: 200 },
  price: money, category, stock: money, image: str, tags: strings, brand: str,
  condition: { type: 'string', enum: ['new', 'used'] }, sku: str, discount,
  shippingOptions: { type: 'array', items: str, description: 'Delivery option identifiers configured by the seller, e.g. standard, express, pickup.' },
  shippingFee: { type: 'string', enum: ['free', 'buyer_pays'] },
  shippingFeeAmounts: { ...numberMap, description: 'Fee per delivery option; provide every selected option when shippingFee is buyer_pays.' },
  variantAttributes: arr(ref('VariantAttribute')), variants: arr(ref('ProductVariantInput')),
};
const multipartFields = {
  ...productFields,
  tags: { type: 'array', items: str, description: 'Repeat the tags field for multiple tags.' },
  shippingOptions: { type: 'string', description: 'JSON-encoded delivery option array.', example: '["standard","express"]' },
  shippingFeeAmounts: { type: 'string', description: 'JSON-encoded fee map.', example: '{"standard":10,"express":15}' },
  variantAttributes: { type: 'string', description: 'JSON-encoded VariantAttribute array.', example: '[{"name":"Size","values":["M","L"]}]' },
  variants: { type: 'string', description: 'JSON-encoded ProductVariantInput array.', example: '[{"attributes":{"Size":"M"},"price":25,"stock":5,"images":[]}]' },
  imageUrls: { type: 'string', description: 'JSON-encoded existing image URL array, merged with uploaded images.', example: '["https://example.com/product.jpg"]' },
  images: { type: 'array', maxItems: 10, items: { type: 'string', format: 'binary' }, description: 'Up to 10 JPG/JPEG, PNG or WebP files; maximum 5 MiB per file. Images are optional on these seller routes.' },
};
const couponFields = {
  discountType: { type: 'string', enum: ['percentage', 'fixed'] },
  discountValue: { ...money, description: 'Percentage or fixed amount, depending on discountType.' },
  maxDiscount: nullable(money), minOrderAmount: money, expiresAt: nullable(date),
  usageLimit: nullable({ type: 'number', minimum: 1 }), description: str,
};
const orderItemInput = {
  productId: id, quantity: { type: 'integer', minimum: 1 }, variantId: id, selectedAttributes: stringMap,
};
const orderPaymentFields = {
  paymentFlowVersion: { type: 'string', enum: ['legacy', 'manual_capture'], description: 'manual_capture orders authorize the card at checkout and are charged when the seller accepts; legacy orders are unchanged.' },
  paymentStatus: { type: 'string', enum: ['awaiting_authorization', 'authorized', 'capture_pending', 'captured', 'release_pending', 'released', 'refund_pending', 'refunded', 'partially_refunded', 'failed', 'not_required'], description: 'Card payment progress for manual_capture orders.' },
  acceptBy: { ...date, description: 'Deadline for the seller to accept; unaccepted orders cancel after it.' },
  authorizationExpiresAt: { ...date, description: 'When the card authorization lapses at the payment provider.' },
  capturedAt: { ...date, description: 'When the full amount was captured.' },
  cancelledByRole: { type: 'string', enum: ['buyer', 'seller', 'system'], description: 'Who cancelled the order. system means the acceptance deadline or an expired card hold. Absent on older cancellations.' },
  cancelledById: { ...id, description: 'User who cancelled the order; absent when cancelledByRole is system.' },
  cancelledAt: { ...date, description: 'When the order was cancelled.' },
};
const pagination = { total: { type: 'integer', minimum: 0 }, page: { type: 'integer' }, pages: { type: 'integer', minimum: 0 } };

export const schemas: Record<string, Schema> = {
  ...refundSchemas,
  Error: obj({ success: failure, message: str, code: { type: 'string', description: 'Machine-readable error code, present on errors that carry one (for example seller order acceptance).' }, errors: arr(ref('ValidationIssue')), stack: { type: 'string', description: 'Development mode only.' } }, ['success', 'message']),
  ValidationIssue: obj({
    type: { type: 'string', enum: ['field', 'alternative', 'alternative_grouped', 'unknown_fields'] },
    msg: str, path: str, location: str,
    value: { description: 'Rejected input value; may be any JSON type.' },
    nestedErrors: { type: 'array', items: { description: 'Nested validation issues for alternatives.' } },
    fields: { type: 'array', items: obj({ path: str, location: str, value: {} }) },
  }, ['type', 'msg']),
  ValidationError: obj({ success: failure, message: str, errors: arr(ref('ValidationIssue')) }, ['success', 'message', 'errors']),
  StructuredError: obj({ success: failure, _requestId: str, error: obj({
    code: { type: 'string', description: 'Machine-readable error code, e.g. PAYMENT_FAILED, STRIPE_ERROR, USER_NOT_FOUND, CARD_NOT_FOUND.' },
    message: str, retryable: bool, retryAfterSeconds: num,
    details: { description: 'Optional error context; may be any JSON type.' },
  }, ['code', 'message', 'retryable']) }, ['success', 'error']),
  PaymentErrorResponse: { anyOf: [ref('Error'), ref('StructuredError')] },
  Address: obj(address),
  ShippingAddressInput: obj({ ...address, country: { type: 'string', default: 'PH' } }, ['street', 'city', 'state', 'zipCode']),
  SavedAddress: obj({ _id: id, label: str, ...address, isDefault: bool }, ['_id', 'label', 'street', 'city', 'state', 'zipCode', 'country', 'isDefault']),
  SavedAddressInput: obj({ label: str, street: { type: 'string', minLength: 1 }, city: { type: 'string', minLength: 1 }, state: str, zipCode: str, country: str, setAsDefault: bool }, ['street', 'city']),
  SavedAddressUpdate: obj({ label: str, street: { type: 'string', minLength: 1 }, city: { type: 'string', minLength: 1 }, state: str, zipCode: str, country: str }, ['street', 'city']),
  SavedPaymentMethod: obj({ _id: id, ...card, isDefault: bool }, ['_id', 'type', 'last4', 'expiryMonth', 'expiryYear', 'isDefault']),
  SavedPaymentMethodInput: obj({ ...card, setAsDefault: bool }, ['type', 'last4', 'expiryMonth', 'expiryYear']),
  User: obj({ id, email: { type: 'string', format: 'email' }, firstName: str, lastName: str, role: { type: 'string', enum: ['buyer', 'seller'] }, avatar: str, phone: str, address: ref('Address'), savedCards: arr(ref('SavedPaymentMethod')), savedAddresses: arr(ref('SavedAddress')), createdAt: date }, ['id', 'email', 'firstName', 'lastName', 'role', 'savedCards', 'savedAddresses']),
  UserSummary: obj({ _id: id, firstName: str, lastName: str, avatar: nullable(str), email: { type: 'string', format: 'email' } }, ['_id', 'firstName', 'lastName']),
  PublicUser: obj({ id, firstName: str, lastName: str, avatar: nullable(str), role: { type: 'string', enum: ['buyer', 'seller'] }, followersCount: num, followingCount: num, isFollowing: bool }, ['id', 'firstName', 'lastName', 'avatar', 'role', 'followersCount', 'followingCount', 'isFollowing']),
  SellerProfile: obj({ id, firstName: str, lastName: str, avatar: nullable(str), createdAt: date }, ['id', 'firstName', 'lastName', 'avatar', 'createdAt']),
  SignupInput: obj({ firstName: { type: 'string', minLength: 1 }, lastName: { type: 'string', minLength: 1 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6 } }, ['firstName', 'lastName', 'email', 'password']),
  LoginInput: obj({ email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 1 } }, ['email', 'password']),
  ProfileInput: obj({ firstName: { type: 'string', minLength: 1 }, lastName: { type: 'string', minLength: 1 }, email: { type: 'string', format: 'email' }, phone: str, avatar: str, address: ref('Address'), role: { type: 'string', enum: ['seller'], description: 'Promotes a buyer to seller; demotion is not supported.' } }),
  VariantAttribute: obj({ _id: id, name: { type: 'string', minLength: 1 }, values: strings }, ['name']),
  ProductVariantInput: obj(variant),
  ProductVariant: obj({ _id: id, ...variant }),
  Product: obj({ _id: id, ...productFields, images: strings, rating: { type: 'number', minimum: 0, maximum: 5 }, reviews: { type: 'number', minimum: 0 }, soldCount: { type: 'number', minimum: 0 }, specifications: stringMap, sellerId: related('UserSummary'), variants: arr(ref('ProductVariant')), ...timestamps }, ['_id', 'name', 'description', 'price', 'category', 'image', 'stock']),
  ProductCreateInput: {
    ...obj({ ...productFields, image: { type: 'string', minLength: 1 }, shippingOptions: { type: 'array', minItems: 1, items: str } }, ['name', 'description', 'price', 'category', 'image', 'shippingOptions', 'shippingFee']),
    description: 'JSON product creation requires an image URL and delivery settings. Stock is required without variants; price is always required by the Product model. The JSON route accepts image for validation but currently stores an empty image when no files are present; use /seller/products to persist image URLs.',
    anyOf: [{ required: ['stock'] }, { required: ['variants'], properties: { variants: { type: 'array', minItems: 1 } } }],
  },
  ProductUpdateInput: { ...obj(productFields), description: 'Omitted fields use existing values during validation. Without variants the merged product needs non-negative price and stock. Use the dedicated image upload route or seller product route to replace images.' },
  SellerProductCreateInput: { ...obj(multipartFields, ['name', 'description', 'price', 'category']), description: 'Seller route accepts file uploads, imageUrls, or image. Stock defaults to 0. Shipping options and images are optional on this route.' },
  SellerProductUpdateInput: { ...obj(multipartFields), description: 'Omitted fields are preserved. Uploaded images and imageUrls replace the image list when nonempty; an image URL alone replaces the primary image.' },
  AvatarUploadInput: obj({ avatar: { type: 'string', format: 'binary', description: 'One JPG/JPEG, PNG or WebP image; maximum 2 MiB.' } }, ['avatar']),
  ProductImageUploadInput: obj({ image: { type: 'string', format: 'binary', description: 'One JPG/JPEG, PNG or WebP image; maximum 5 MiB.' } }, ['image']),
  OrderItemInput: obj(orderItemInput, ['productId', 'quantity']),
  PaymentMethodInput: obj({ type: paymentType, last4: str, cardHolder: str }, ['type']),
  OrderCreateInput: obj({
    items: { type: 'array', minItems: 1, items: ref('OrderItemInput') }, shippingAddress: ref('ShippingAddressInput'), paymentMethod: ref('PaymentMethodInput'),
    sellerMessages: { ...stringMap, description: 'Message keyed by seller ID.' }, couponCodes: { ...stringMap, description: 'Coupon code keyed by seller ID.' },
    deliverySelections: { ...stringMap, description: 'Delivery option keyed by seller ID.' },
    paymentIntentId: { type: 'string', description: 'When supplied for a card payment, must identify a succeeded Stripe PaymentIntent and must not have been used for another order. The existing saved/mock-card path permits omission.', example: 'pi_...' },
  }, ['items', 'shippingAddress', 'paymentMethod']),
  BuyerCancelInput: { ...obj({ cancelReason: str, status: { type: 'string', enum: ['cancelled'], description: 'Optional; the controller always performs cancellation regardless of this field.' } }), description: 'Only cancellation of the current buyer’s pending order is supported.' },
  SellerOrderStatusInput: obj({ status: { type: 'string', enum: ['preparing', 'processing', 'shipped', 'delivered', 'cancelled'] }, cancelReason: str }, ['status']),
  OrderItem: obj({ _id: id, product: related('Product'), variantId: str, selectedAttributes: stringMap, productName: str, productPrice: num, productImage: str, variantImages: strings, variantSku: str, discountPercent: discount, variantDiscount: num, quantity: { type: 'number', minimum: 1 } }, ['product', 'productName', 'productPrice', 'productImage', 'quantity']),
  Order: obj({ _id: id, userId: related('UserSummary'), items: arr(ref('OrderItem')), shippingAddress: ref('ShippingAddressInput'), paymentMethod: ref('PaymentMethodInput'), subtotal: money, productDiscount: money, discount: money, tax: money, shipping: money, total: money, couponCode: str, paymentIntentId: str, status, estimatedDelivery: date, shippedAt: date, refundRequestedAt: date, cancelReason: str, sellerMessages: stringMap, deliverySelections: stringMap, selectedDeliveryOption: str, ...orderPaymentFields, ...timestamps }, ['_id', 'userId', 'items', 'shippingAddress', 'paymentMethod', 'subtotal', 'productDiscount', 'discount', 'tax', 'shipping', 'total', 'status']),
  CartItemInput: obj({ ...orderItemInput, quantity: { type: 'number', description: 'Non-positive quantities are filtered out during sync.' }, price: num, stock: num, image: str, sku: str, discount: num, isSelected: bool }, ['productId', 'quantity']),
  CartSyncInput: { ...obj({ items: arr(ref('CartItemInput')) }), description: 'Replaces the entire cart. Missing items clears it; non-positive quantities are filtered out. Unknown products may be retained with a null populated product.' },
  CartItem: obj({ product: nullable(ref('Product')), variantId: str, selectedAttributes: stringMap, price: num, stock: num, image: str, sku: str, discount: num, quantity: num, isSelected: bool }, ['product', 'price', 'quantity', 'isSelected']),
  CartSeller: obj({ sellerId: nullable(id), items: arr(ref('CartItem')) }, ['sellerId', 'items']),
  ReviewCreateInput: obj({ productId: id, orderId: id, rating: { type: 'number', minimum: 1, maximum: 5 }, comment: { type: 'string', minLength: 1, maxLength: 1000 } }, ['productId', 'orderId', 'rating', 'comment']),
  ReviewUpdateInput: { ...obj({ rating: { type: 'number', minimum: 1, maximum: 5 }, comment: { type: 'string', minLength: 1, maxLength: 1000 } }), anyOf: [{ required: ['rating'] }, { required: ['comment'] }] },
  Review: obj({ _id: id, userId: related('UserSummary'), productId: id, orderId: id, rating: { type: 'number', minimum: 1, maximum: 5 }, comment: str, ...timestamps }, ['_id', 'userId', 'productId', 'orderId', 'rating', 'comment']),
  CouponCreateInput: obj({ code: { type: 'string', minLength: 1 }, ...couponFields }, ['code', 'discountType', 'discountValue']),
  CouponUpdateInput: obj({ ...couponFields, isActive: bool }),
  CouponValidateInput: obj({ code: { type: 'string', minLength: 1, example: 'SAVE10' }, sellerId: id, orderAmount: { type: 'number', description: 'Subtotal used to check the minimum and calculate percentage discounts. Omission uses 0 for the calculation.' } }, ['code', 'sellerId']),
  Coupon: obj({ _id: id, code: str, sellerId: id, ...couponFields, usedCount: num, isActive: bool, ...timestamps }, ['_id', 'code', 'sellerId', 'discountType', 'discountValue', 'minOrderAmount', 'usedCount', 'isActive']),
  ValidatedCoupon: obj({ id, code: str, discountType: couponFields.discountType, discountValue: num, maxDiscount: nullable(num), description: str }, ['id', 'code', 'discountType', 'discountValue']),
  PaymentIntentInput: obj({ amountInCents: { type: 'integer', minimum: 1, description: 'Payment amount in USD cents.', example: 1500 }, stripePaymentMethodId: { type: 'string', example: 'pm_...' } }, ['amountInCents']),
  SaveCardInput: obj({ stripePaymentMethodId: { type: 'string', minLength: 1, example: 'pm_...' } }, ['stripePaymentMethodId']),
  StripeEvent: obj({ id: str, type: { type: 'string', description: 'payment_intent.succeeded and payment_intent.payment_failed are handled; other events are acknowledged.' }, data: obj({ object: obj({ id: str }, ['id']) }, ['object']) }, ['id', 'type', 'data']),
  WebhookResponse: obj({ received: { type: 'boolean', enum: [true] } }, ['received']),
  WebhookError: obj({ error: { type: 'string', example: 'Invalid signature' } }, ['error']),
  HealthResponse: response({ message: str, timestamp: date }),
  AuthResponse: response({ token: str, user: ref('User') }),
  UserResponse: response({ user: ref('User') }),
  SavedAddressesResponse: response({ savedAddresses: arr(ref('SavedAddress')) }),
  SavedCardsResponse: response({ data: obj({ paymentMethods: arr(ref('SavedPaymentMethod')) }, ['paymentMethods']), _requestId: str }, ['data']),
  ProductResponse: response({ product: ref('Product') }),
  ProductsResponse: response({ products: arr(ref('Product')) }),
  ProductListResponse: response({ products: arr(ref('Product')), count: { type: 'integer', minimum: 0 }, ...pagination }),
  CategoriesResponse: response({ categories: arr(category) }),
  SellerProfileResponse: response({ seller: ref('SellerProfile'), products: arr(ref('Product')) }),
  ProductImageResponse: response({ url: str, public_id: str, product: ref('Product') }),
  ImageResponse: response({ url: str }),
  OrderResponse: response({ order: ref('Order') }),
  OrdersResponse: response({ orders: arr(ref('Order')) }),
  SellerOrderAcceptingResponse: response({ order: ref('Order'), operation: obj({ status: { type: 'string', enum: ['resolving'] } }, ['status']) }),
  SellerOrder: { allOf: [ref('Order'), obj({ canSellerCancelPending: { ...bool, description: 'Server-derived: true only for a pending order this seller owns whose payment is an authorized hold or cash on delivery. The server still checks on submit.' } }, ['canSellerCancelPending'])] },
  SellerOrdersResponse: response({ orders: arr(ref('SellerOrder')) }),
  SellerOrderStatusResponse: response({
    order: ref('Order'),
    paymentOperation: obj({ status: { type: 'string', enum: ['pending', 'completed', 'needs_review'], description: 'Where the card hold release stands after a cancellation: pending while releasing, completed once released, needs_review when it is in support review.' } }, ['status']),
  }, ['order']),
  CheckoutSessionCreateInput: obj({
    items: { type: 'array', minItems: 1, items: ref('OrderItemInput') }, shippingAddress: ref('ShippingAddressInput'),
    paymentMethod: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['credit-card', 'debit-card'] }, last4: { type: 'string' }, cardHolder: { type: 'string' } } },
    sellerMessages: { ...stringMap, description: 'Message keyed by seller ID.' }, couponCodes: { ...stringMap, description: 'Coupon code keyed by seller ID.' },
    deliverySelections: { ...stringMap, description: 'Delivery option keyed by seller ID.' },
    savedPaymentMethodId: { type: 'string', pattern: '^pm_[A-Za-z0-9_]+$', description: 'Stripe PaymentMethod ID of a card saved to the authenticated buyer. Omit to enter a new card on the client.', example: 'pm_1Example' },
  }, ['items', 'shippingAddress', 'paymentMethod']),
  CheckoutSellerDraft: obj({
    sellerId: str, sellerName: { type: 'string', nullable: true, description: 'Seller display name; null if the seller account is missing.' }, draftOrderId: str, amountMinor: { type: 'integer', minimum: 1, description: 'Authorization amount in minor units of the currency.' },
    currency: { type: 'string', example: 'usd' }, status: { type: 'string', enum: ['awaiting_authorization', 'authorized', 'released', 'failed'] },
    clientSecret: { type: 'string', description: 'Owner-only PaymentIntent client secret for this seller. Confirm it with the Stripe SDK; the payment is held, not captured.' },
  }, ['sellerId', 'draftOrderId', 'amountMinor', 'currency', 'status']),
  CheckoutOrder: obj({
    id: str, sellerId: { ...str, nullable: true }, status: { type: 'string', enum: ['pending', 'awaiting_payment'] },
    paymentStatus: { type: 'string', nullable: true, example: 'authorized' }, total: { type: 'number' },
    placedAt: { type: 'string', format: 'date-time', nullable: true }, acceptBy: { type: 'string', format: 'date-time', nullable: true },
    authorizationExpiresAt: { type: 'string', format: 'date-time', nullable: true },
    shortAuthorization: { type: 'boolean', description: 'True when the seller acceptance window is shorter than 24 hours because the card authorization ends sooner. Show this to the buyer.' },
  }, ['id', 'status', 'total', 'shortAuthorization']),
  CheckoutConfirmResponse: dataResponse({
    id: str, status: { type: 'string', enum: ['open', 'finalizing', 'placed', 'expired', 'failed'] },
    expiresAt: { type: 'string', format: 'date-time' }, placedAt: { type: 'string', format: 'date-time' },
    sellers: arr(ref('CheckoutSellerDraft')), orders: arr(ref('CheckoutOrder')),
  }),
  CheckoutSessionResponse: dataResponse({
    id: str, status: { type: 'string', enum: ['open', 'finalizing', 'placed', 'expired', 'failed'] },
    expiresAt: { type: 'string', format: 'date-time' }, sellers: arr(ref('CheckoutSellerDraft')),
  }),
  OrderListResponse: response({ count: { type: 'integer', minimum: 0 }, orders: arr(ref('Order')) }),
  CartResponse: response({ sellers: arr(ref('CartSeller')) }),
  SuccessResponse: response({}),
  MessageResponse: response({ message: str }),
  ReviewResponse: response({ data: ref('Review') }),
  ReviewsResponse: response({ data: arr(ref('Review')), ...pagination }),
  ReviewCheckResponse: response({ hasReviewed: bool, review: nullable(ref('Review')) }),
  UsersResponse: response({ users: arr(ref('PublicUser')) }),
  PublicUserResponse: response({ user: ref('PublicUser') }),
  FollowResponse: response({ isFollowing: bool, followersCount: num }),
  CouponResponse: response({ coupon: ref('Coupon') }),
  CouponsResponse: response({ coupons: arr(ref('Coupon')) }),
  CouponValidationResponse: response({ coupon: ref('ValidatedCoupon'), discountAmount: num }),
  PaymentIntentResponse: response({ data: obj({ clientSecret: str, paymentIntentId: str }, ['clientSecret', 'paymentIntentId']), _requestId: str }, ['data']),
  SaveCardResponse: response({ data: obj({ success, message: str }, ['success', 'message']), _requestId: str }, ['data']),
};
