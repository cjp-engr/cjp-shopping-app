import 'entities/order_entity.dart';

/// Everything paid for the order, shipping included, has been paid back.
bool isFullyRefunded(OrderEntity order) => order.paymentStatus == 'refunded';

/// The orders a My Orders tab lists (no [statuses] means all of them). A fully refunded order is no
/// longer a completed purchase: with [hideFullyRefunded] (the Complete tab) it is left out, and its
/// refund is under Return/Refund.
List<T> ordersForTab<T extends OrderEntity>(
  List<T> orders,
  List<String> statuses, {
  bool hideFullyRefunded = false,
}) =>
    orders
        .where((o) => statuses.isEmpty || statuses.contains(o.status))
        .where((o) => !(hideFullyRefunded && isFullyRefunded(o)))
        .toList();
