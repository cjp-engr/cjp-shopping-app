/// Shared E2E credentials — override via `--dart-define` at runtime.
class TestCredentials {
  static const buyerEmail = String.fromEnvironment(
    'BUYER_EMAIL',
    defaultValue: 'b@test.com',
  );

  static const sellerEmail = String.fromEnvironment(
    'SELLER_EMAIL',
    defaultValue: 's@test.com',
  );

  static const password = String.fromEnvironment(
    'TEST_PASSWORD',
    defaultValue: 'Test750!!',
  );
}
