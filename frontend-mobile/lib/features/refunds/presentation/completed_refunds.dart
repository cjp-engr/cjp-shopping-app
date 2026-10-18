import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/theme_colors.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';
import 'refund_components.dart';
import 'refund_order_card.dart';

class CompletedRefunds extends StatefulWidget {
  final RefundApi? api;
  const CompletedRefunds({super.key, this.api});
  @override
  State<CompletedRefunds> createState() => _CompletedRefundsState();
}

class _CompletedRefundsState extends State<CompletedRefunds> {
  SellerRefundPage? _data;
  bool _busy = true;
  String? _error;
  int _page = 1;
  @override
  void initState() {
    super.initState();
    _load(1);
  }

  Future<void> _load(int page) async {
    if (mounted) {
      setState(() {
        _busy = true;
        _error = null;
      });
    }
    try {
      final data =
          await (widget.api ?? context.read<RefundApi>()).completed(page);
      if (mounted) {
        setState(() {
          _data = data;
          _page = page;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
            () => _error = 'Could not load your refunds. Please try again.');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
      onRefresh: () => _load(_page),
      child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Row(children: [
              Expanded(
                  child: Text('Return/Refund',
                      style: Theme.of(context).textTheme.titleLarge)),
              IconButton(
                  tooltip: 'Refresh refunds',
                  onPressed: _busy ? null : () => _load(_page),
                  icon: const Icon(Icons.refresh))
            ]),
            Text(
                'Refunds your seller has approved, including ones still being processed. Requests waiting for the seller stay with your order under Completed.',
                style:
                    TextStyle(fontSize: 13, color: context.onSurfaceSecondary)),
            const SizedBox(height: 20),
            if (_busy)
              const LinearProgressIndicator()
            else if (_error != null)
              Semantics(
                  liveRegion: true,
                  child: Column(children: [
                    Text(_error!),
                    TextButton(
                        onPressed: () => _load(_page),
                        child: const Text('Try again'))
                  ]))
            else if (_data?.total == 0)
              const RefundSurface(
                  child: Column(children: [
                Icon(Icons.assignment_return_outlined, size: 32),
                SizedBox(height: 16),
                Text('No approved refunds yet',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                SizedBox(height: 8),
                Text(
                    'When a seller approves a refund request, it moves here. Requests still waiting for the seller stay with your order under Completed, where you can track them in the order details.',
                    textAlign: TextAlign.center)
              ]))
            else ...[
              for (final request
                  in _data?.requests.where((r) => r.approvedBySeller) ??
                      <RefundRequestData>[])
                Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: RefundOrderCard(
                        key: ValueKey(request.id),
                        request: request,
                        onViewOrder: () =>
                            context.push('/orders/${request.orderId}'))),
              if ((_data?.total ?? 0) > 0)
                Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                          onPressed: _page <= 1 ? null : () => _load(_page - 1),
                          child: const Text('Previous')),
                      Flexible(
                          child: Text('Page $_page of ${_data!.pages}',
                              textAlign: TextAlign.center)),
                      TextButton(
                          onPressed: _page >= _data!.pages
                              ? null
                              : () => _load(_page + 1),
                          child: const Text('Next'))
                    ]),
            ]
          ]));
}
