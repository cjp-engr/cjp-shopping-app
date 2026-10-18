import 'package:equatable/equatable.dart';

sealed class SellerEvent extends Equatable {
  const SellerEvent();
  @override
  List<Object?> get props => [];
}

class SellerProductsLoadRequested extends SellerEvent {
  const SellerProductsLoadRequested();
}

class SellerProductCreateRequested extends SellerEvent {
  final Map<String, dynamic> data;
  final List<String> imagePaths;
  const SellerProductCreateRequested(this.data,
      {this.imagePaths = const []});
  @override
  List<Object?> get props => [data, imagePaths];
}

class SellerProductUpdateRequested extends SellerEvent {
  final String id;
  final Map<String, dynamic> data;
  final List<String> imagePaths;
  const SellerProductUpdateRequested(this.id, this.data,
      {this.imagePaths = const []});
  @override
  List<Object?> get props => [id, data, imagePaths];
}

class SellerProductDeleteRequested extends SellerEvent {
  final String id;
  const SellerProductDeleteRequested(this.id);
  @override
  List<Object?> get props => [id];
}

class SellerOrdersLoadRequested extends SellerEvent {
  /// A silent reload refreshes the list in the background: it never shows the
  /// loading state and ignores a failed request.
  final bool silent;
  const SellerOrdersLoadRequested({this.silent = false});
  @override
  List<Object?> get props => [silent];
}

/// A seller cancels a pending order. The reason is required; the server decides
/// whether the order can still be cancelled and reports the payment outcome.
class SellerOrderCancelRequested extends SellerEvent {
  final String orderId;
  final String reason;
  const SellerOrderCancelRequested(this.orderId, this.reason);
  @override
  List<Object?> get props => [orderId, reason];
}

class SellerOrderStatusUpdateRequested extends SellerEvent {
  final String orderId;
  final String status;
  final String? cancelReason;
  const SellerOrderStatusUpdateRequested(this.orderId, this.status,
      {this.cancelReason});
  @override
  List<Object?> get props => [orderId, status, cancelReason];
}
