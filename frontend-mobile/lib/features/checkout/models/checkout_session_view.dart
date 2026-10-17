import 'package:equatable/equatable.dart';

/// One seller's part of a card checkout session.
class CheckoutSellerView extends Equatable {
  const CheckoutSellerView({
    required this.sellerId,
    required this.sellerName,
    required this.amountMinor,
    required this.currency,
    required this.status,
    this.clientSecret,
    this.authorized = false,
  });

  final String sellerId;
  final String? sellerName;

  /// Amount to hold, in minor units (cents). Set by the server; the app never computes it.
  final int amountMinor;
  final String currency;
  final String status;

  /// Owner-only and kept in memory only. The bloc clears it once this seller's payment is held.
  final String? clientSecret;

  /// True once this seller's payment is held (`requires_capture`).
  final bool authorized;

  CheckoutSellerView copyWith({
    bool? authorized,
    String? clientSecret,
    bool clearClientSecret = false,
  }) {
    return CheckoutSellerView(
      sellerId: sellerId,
      sellerName: sellerName,
      amountMinor: amountMinor,
      currency: currency,
      status: status,
      clientSecret: clearClientSecret ? null : (clientSecret ?? this.clientSecret),
      authorized: authorized ?? this.authorized,
    );
  }

  factory CheckoutSellerView.fromJson(Map<String, dynamic> json) {
    return CheckoutSellerView(
      sellerId: (json['sellerId'] ?? '').toString(),
      sellerName: json['sellerName'] as String?,
      amountMinor: (json['amountMinor'] as num?)?.toInt() ?? 0,
      currency: (json['currency'] as String?) ?? 'usd',
      status: (json['status'] as String?) ?? '',
      clientSecret: json['clientSecret'] as String?,
    );
  }

  @override
  List<Object?> get props => [sellerId, sellerName, amountMinor, currency, status, clientSecret, authorized];

  @override
  String toString() => 'CheckoutSellerView(sellerId: $sellerId, authorized: $authorized)';
}

/// A card checkout session as the app shows it. Never includes intent IDs.
class CheckoutSessionView extends Equatable {
  const CheckoutSessionView({
    required this.id,
    required this.status,
    required this.sellers,
    this.expiresAt,
  });

  final String id;

  /// `open`, `finalizing`, `placed`, `expired` or `failed`.
  final String status;
  final DateTime? expiresAt;
  final List<CheckoutSellerView> sellers;

  bool get allAuthorized => sellers.every((seller) => seller.authorized);

  CheckoutSellerView? sellerById(String sellerId) {
    for (final seller in sellers) {
      if (seller.sellerId == sellerId) return seller;
    }
    return null;
  }

  CheckoutSessionView replaceSeller(CheckoutSellerView updated) {
    return CheckoutSessionView(
      id: id,
      status: status,
      expiresAt: expiresAt,
      sellers: [for (final seller in sellers) seller.sellerId == updated.sellerId ? updated : seller],
    );
  }

  /// The server returns a client secret only while a seller's payment still needs the buyer.
  /// Sellers without one were already held, so they count as authorized.
  CheckoutSessionView withAuthorizationFromSecrets() {
    return CheckoutSessionView(
      id: id,
      status: status,
      expiresAt: expiresAt,
      sellers: [
        for (final seller in sellers)
          seller.copyWith(authorized: seller.clientSecret == null),
      ],
    );
  }

  factory CheckoutSessionView.fromJson(Map<String, dynamic> json) {
    final sellers = (json['sellers'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(CheckoutSellerView.fromJson)
        .toList();
    return CheckoutSessionView(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] as String?) ?? '',
      expiresAt: DateTime.tryParse((json['expiresAt'] ?? '').toString()),
      sellers: sellers,
    );
  }

  @override
  List<Object?> get props => [id, status, expiresAt, sellers];

  @override
  String toString() => 'CheckoutSessionView(id: $id, status: $status, sellers: ${sellers.length})';
}
