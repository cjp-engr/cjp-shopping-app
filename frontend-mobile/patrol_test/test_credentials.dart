/// Shared E2E credentials — override via `--dart-define` at runtime.
class TestCredentials {
  static const buyerEmail = String.fromEnvironment(
    'BUYER_EMAIL',
    defaultValue: 'b1@test.com',
  );

  static const sellerEmail = String.fromEnvironment(
    'SELLER_EMAIL',
    defaultValue: 's1@ex.com',
  );

  static const password = String.fromEnvironment(
    'TEST_PASSWORD',
    defaultValue: 'Test750!!',
  );
}
