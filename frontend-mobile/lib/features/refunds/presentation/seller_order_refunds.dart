import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';
import 'refund_order_card.dart';

/// The refund history of one order on the seller's order screen: every request as a seller card under a
/// "Refunds" title. Draws nothing when the order has none, or when they could not be loaded.
class SellerOrderRefunds extends StatefulWidget {
  final String orderId;
  final RefundApi? api;
  const SellerOrderRefunds({super.key, required this.orderId, this.api});
  @override
  State<SellerOrderRefunds> createState() => _SellerOrderRefundsState();
}

class _SellerOrderRefundsState extends State<SellerOrderRefunds> {
  List<RefundRequestData> _requests = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final RefundApi api;
    try {
      api = widget.api ?? context.read<RefundApi>();
    } catch (_) {
      return; // No refund API in this tree: the section is simply left out.
    }
    try {
      final requests = await api.sellerOrderRefunds(widget.orderId);
      if (mounted) setState(() => _requests = requests);
    } catch (_) {
      // The refunds are extra information; the order itself is already shown.
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_requests.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(
          padding: EdgeInsets.only(bottom: 8),
          child: Text('Refunds',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700))),
      for (final request in _requests)
        Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: RefundOrderCard(
                key: ValueKey(request.id),
                request: request,
                viewer: RefundViewer.seller,
                inOrder: true)),
    ]);
  }
}
