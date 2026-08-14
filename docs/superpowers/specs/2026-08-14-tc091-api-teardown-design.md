# TC-091 API Teardown Design

**Goal:** After TC-091 verifies the variant product on the seller dashboard, delete it via API so the test cleans up after itself.

**Scope:** 2 files — `api_clients.dart` (new method) and `add_product_variant_test.dart` (unique name + teardown). TC-090 is not touched.

---

## Problem

TC-091 creates a product via the UI wizard, so the test never holds a product ID. Without an ID, `deleteProduct(id)` cannot be called directly. The product name must be used to look up the ID via API.

## Solution

### 1. `SellerApiClient.findProductByName(String name)`

New method in `frontend-mobile/patrol_test/modules/api_clients.dart`.

- Calls `GET /api/seller/products`
- Scans the returned list for a product whose `name` field equals the argument
- Returns the product `_id` string
- Throws `StateError` if no match found

```dart
Future<String> findProductByName(String name) async {
  assert(_token != null, 'Call login() before using SellerApiClient');
  final res = await _dio.get(
    '/seller/products',
    options: Options(headers: {'Authorization': 'Bearer $_token'}),
  );
  final products = res.data['products'] as List;
  final match = products.firstWhere(
    (p) => p['name'] == name,
    orElse: () => throw StateError('Product not found: $name'),
  );
  return match['_id'] as String;
}
```

### 2. `add_product_variant_test.dart` — unique name + teardown

- Store the product name in a `final` at the top of the test body:
  ```dart
  final productName = 'E2E Variant Shirt - ${DateTime.now().millisecondsSinceEpoch}';
  ```
- Pass `productName` to `fillBasicInfo(name: productName, ...)` and `expectProductNameOnDashboard(productName)`
- After the dashboard assertion, add:
  ```dart
  // Teardown — delete via API
  final api = SellerApiClient();
  await api.login(TestCredentials.sellerEmail, TestCredentials.password);
  final productId = await api.findProductByName(productName);
  await api.deleteProduct(productId);
  ```

## Constraints

- No `flutter_test` imports
- `findProductByName` follows the same assert-then-request pattern as existing `SellerApiClient` methods
- TC-090 (`add_product_simple_test.dart`) is not modified
