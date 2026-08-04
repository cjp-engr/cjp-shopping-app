/// Shared E2E credentials — override via `--dart-define` at runtime.
class TestCredentials {
  static const buyerEmail = String.fromEnvironment(
    'BUYER_EMAIL',
    defaultValue: 'buyer@test.com',
  );

  static const sellerEmail = String.fromEnvironment(
    'SELLER_EMAIL',
    defaultValue: 'seller@test.com',
  );

  static const password = String.fromEnvironment(
    'PASSWORD',
    defaultValue: 'Test750!!',
  );
}
