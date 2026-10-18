import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';

SellerOrderData sellerOrder({
  String id = 'order-1',
  String status = 'pending',
  String? paymentStatus,
  DateTime? acceptBy,
  bool canSellerCancelPending = false,
  String paymentFlowVersion = 'legacy',
  String? paymentType,
  String? cancelReason,
  String? cancelledByRole,
}) =>
    SellerOrderData(
      id: id,
      status: status,
      subtotal: 10,
      productDiscount: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      total: 10,
      createdAt: '2026-10-17T00:00:00.000Z',
      items: const [],
      paymentStatus: paymentStatus,
      acceptBy: acceptBy,
      canSellerCancelPending: canSellerCancelPending,
      paymentFlowVersion: paymentFlowVersion,
      paymentMethod:
          paymentType == null ? null : SellerOrderPayment(type: paymentType),
      cancelReason: cancelReason,
      cancelledByRole: cancelledByRole,
    );
