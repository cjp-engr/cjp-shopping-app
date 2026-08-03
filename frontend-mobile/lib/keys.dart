import 'features/auth/keys.dart';
import 'features/cart/keys.dart';
import 'features/orders/keys.dart';
import 'features/products/keys.dart';
import 'features/seller/keys.dart';
import 'shared/widgets/keys.dart';

final keys = Keys();

class Keys {
  final auth = AuthKeys();
  final cart = CartKeys();
  final orders = OrdersKeys();
  final products = ProductsKeys();
  final seller = SellerKeys();
  final widgets = WidgetKeys();
}
