// Resource IDs below are illustrative. Replace them with IDs from your database
// before using Try it out; Stripe IDs must come from the Stripe client SDK.
const productId = '507f1f77bcf86cd799439011';
const sellerId = '507f1f77bcf86cd799439012';
export const requestExamples: Record<string, unknown> = {
  SignupInput: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: 'ExamplePassword123!' },
  LoginInput: { email: 'jane@example.com', password: 'ExamplePassword123!' },
  ProfileInput: { firstName: 'Jane', lastName: 'Doe' },
  SavedPaymentMethodInput: { type: 'credit-card', brand: 'visa', last4: '4242', cardHolder: 'Jane Doe', expiryMonth: '12', expiryYear: '2030', setAsDefault: true },
  SavedAddressInput: { label: 'Home', street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW', setAsDefault: true },
  SavedAddressUpdate: { label: 'Home', street: '2 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' },
  ProductCreateInput: { name: 'Notebook', description: 'A lined notebook', category: 'Books', price: 10, stock: 5, image: 'https://example.com/notebook.jpg', shippingOptions: ['standard'], shippingFee: 'free' },
  ProductUpdateInput: { price: 12, stock: 10 },
  SellerProductCreateInput: { name: 'Notebook', description: 'A lined notebook', category: 'Books', price: 10, stock: 5, imageUrls: '["https://example.com/notebook.jpg"]', shippingOptions: '["standard"]', shippingFee: 'free' },
  SellerProductUpdateInput: { price: 12, stock: 10 },
  CartSyncInput: { items: [{ productId, quantity: 1, isSelected: true }] },
  OrderCreateInput: { items: [{ productId, quantity: 1 }], shippingAddress: { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' }, paymentMethod: { type: 'cash-on-delivery' }, deliverySelections: { [sellerId]: 'standard' } },
  BuyerCancelInput: { cancelReason: 'Ordered by mistake' },
  SellerOrderStatusInput: { status: 'preparing' },
  ReviewCreateInput: { productId, orderId: '507f1f77bcf86cd799439013', rating: 5, comment: 'Great notebook' },
  ReviewUpdateInput: { rating: 4, comment: 'Updated feedback' },
  CouponCreateInput: { code: 'SAVE10', discountType: 'percentage', discountValue: 10, minOrderAmount: 20 },
  CouponUpdateInput: { isActive: false },
  CouponValidateInput: { code: 'SAVE10', sellerId, orderAmount: 100 },
  PaymentIntentInput: { amountInCents: 1500 },
  SaveCardInput: { stripePaymentMethodId: 'pm_replace_with_real_id' },
  StripeEvent: { id: 'evt_example', type: 'payment_intent.succeeded', data: { object: { id: 'pi_example' } } },
};
