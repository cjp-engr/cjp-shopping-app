import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';
import 'refund_bloc.dart';
import 'refund_order_card.dart';

/// The seller's Return/Refund list: every refund request with its decision controls. It sits in
/// the Orders tab behind the Return/Refund chip.
class RefundReviewList extends StatelessWidget {
  final RefundApi? api;
  final VoidCallback? onUpdated;
  const RefundReviewList({super.key, this.api, this.onUpdated});
  @override
  Widget build(BuildContext context) => BlocProvider(
      create: (_) =>
          RefundBloc(api ?? context.read<RefundApi>())..add(LoadRefunds()),
      child: BlocConsumer<RefundBloc, RefundState>(
        listenWhen: (p, c) => p.mutations != c.mutations,
        listener: (_, state) => onUpdated?.call(),
        builder: (context, state) =>
            ListView(padding: const EdgeInsets.all(16), children: [
          Row(children: [
            const Expanded(
                child:
                    Text('Review the buyer’s issue and exact refund amount.')),
            IconButton(
                tooltip: 'Refresh refund requests',
                onPressed: state.busy
                    ? null
                    : () => context
                        .read<RefundBloc>()
                        .add(LoadRefunds(page: state.page)),
                icon: const Icon(Icons.refresh))
          ]),
          if (state.busy) const LinearProgressIndicator(),
          if (state.error != null)
            Semantics(
                liveRegion: true,
                child: Text(state.error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error))),
          if (!state.busy && state.requests.isEmpty)
            const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: Text('No refund requests.'))),
          for (final r in state.requests)
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _SellerRequest(
                    key: ValueKey(r.id), request: r, busy: state.busy)),
          if (state.pages > 0)
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              TextButton(
                  onPressed: state.busy || state.page <= 1
                      ? null
                      : () => context
                          .read<RefundBloc>()
                          .add(LoadRefunds(page: state.page - 1)),
                  child: const Text('Previous')),
              Text('Page ${state.page} of ${state.pages}'),
              TextButton(
                  onPressed: state.busy || state.page >= state.pages
                      ? null
                      : () => context
                          .read<RefundBloc>()
                          .add(LoadRefunds(page: state.page + 1)),
                  child: const Text('Next')),
            ]),
        ]),
      ));
}

class _SellerRequest extends StatefulWidget {
  final RefundRequestData request;
  final bool busy;
  const _SellerRequest({super.key, required this.request, required this.busy});
  @override
  State<_SellerRequest> createState() => _SellerRequestState();
}

class _SellerRequestState extends State<_SellerRequest> {
  bool _rejecting = false;
  final _reason = TextEditingController();
  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _approve() async {
    final accepted = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Approve refund?'),
                content: Text(
                    'Refund ${refundMoney(widget.request.amount, widget.request.currency)} now without requiring an item return?'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Keep reviewing')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Approve and refund'))
                ]));
    if (mounted && accepted == true) {
      context
          .read<RefundBloc>()
          .add(DecideRefund(widget.request.id, 'approve'));
    }
  }

  Widget? _decision() {
    if (widget.request.state != 'requested') return null;
    if (!widget.request.canDecide) {
      return const Text('Refund decisions are currently unavailable.');
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text(
          'Approval starts the refund immediately. The buyer keeps the item.',
          style: TextStyle(fontSize: 12, height: 1.6)),
      const SizedBox(height: 16),
      if (_rejecting)
        TextField(
            controller: _reason,
            maxLength: 1000,
            enabled: !widget.busy,
            onChanged: (_) => setState(() {}),
            decoration:
                const InputDecoration(labelText: 'Reason for rejecting')),
      Wrap(spacing: 12, runSpacing: 8, children: [
        FilledButton(
            onPressed: widget.busy ? null : _approve,
            child: const Text('Approve refund')),
        OutlinedButton(
            onPressed:
                widget.busy || (_rejecting && _reason.text.trim().isEmpty)
                    ? null
                    : () {
                        if (!_rejecting) {
                          setState(() => _rejecting = true);
                        } else {
                          context.read<RefundBloc>().add(DecideRefund(
                              widget.request.id, 'reject', _reason.text));
                        }
                      },
            child: Text(_rejecting ? 'Confirm rejection' : 'Reject request')),
      ]),
    ]);
  }

  @override
  Widget build(BuildContext context) => RefundOrderCard(
      request: widget.request,
      viewer: RefundViewer.seller,
      decision: _decision());
}
