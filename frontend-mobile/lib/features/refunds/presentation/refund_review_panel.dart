import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';
import 'refund_bloc.dart';
import 'refund_order_card.dart';

class _Group {
  final String key, label, empty;
  final IconData icon;
  const _Group(this.key, this.label, this.icon, this.empty);
}

/// What the seller has done with a request: not decided yet, approved (processing or refunded), or rejected.
const _groups = [
  _Group('in_progress', 'In Progress', Icons.access_time_rounded,
      'No refund requests in progress.'),
  _Group('approved', 'Approved', Icons.check_circle_outline_rounded,
      'No approved refunds yet.'),
  _Group(
      'rejected', 'Rejected', Icons.cancel_outlined, 'No rejected requests.'),
];

class _GroupChips extends StatelessWidget {
  final RefundState state;
  const _GroupChips({required this.state});

  /// One line of three equal chips (like a segmented control): they never wrap onto a second line;
  /// on a narrow screen or at large text the content of each chip shrinks to fit instead.
  @override
  Widget build(BuildContext context) => Row(children: [
        for (var i = 0; i < _groups.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(child: _chip(context, _groups[i])),
        ],
      ]);

  Widget _chip(BuildContext context, _Group g) {
    final active = g.key == state.group;
    final fg = active ? Colors.white : AppColors.textMuted;
    return GestureDetector(
      key: ValueKey('refund-group-${g.key}'),
      onTap: state.busy || active
          ? null
          : () => context.read<RefundBloc>().add(LoadRefunds(group: g.key)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        // A fixed height so chips whose content shrinks by different amounts still match.
        height: 38,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
            color: active ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(AppSizes.radiusFull),
            border: Border.all(
                color: active ? AppColors.primary : AppColors.border)),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(g.icon, size: 13, color: fg),
            const SizedBox(width: 4),
            Text(g.label,
                style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600, color: fg)),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                  color: active
                      ? Colors.white.withAlpha(51)
                      : AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(AppSizes.radiusFull)),
              child: Text('${state.counts[g.key] ?? 0}',
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
            ),
          ]),
        ),
      ),
    );
  }
}

/// The seller's Return/Refund tab: refund requests in three groups (In Progress, Approved, Rejected),
/// with the decision controls on the ones still waiting. More requests load as the list is scrolled.
class RefundReviewList extends StatelessWidget {
  final RefundApi? api;
  final VoidCallback? onUpdated;
  const RefundReviewList({super.key, this.api, this.onUpdated});
  @override
  Widget build(BuildContext context) => BlocProvider(
      create: (_) =>
          RefundBloc(api ?? context.read<RefundApi>())..add(LoadRefunds()),
      child: _ReviewBody(onUpdated: onUpdated));
}

class _ReviewBody extends StatefulWidget {
  final VoidCallback? onUpdated;
  const _ReviewBody({this.onUpdated});
  @override
  State<_ReviewBody> createState() => _ReviewBodyState();
}

class _ReviewBodyState extends State<_ReviewBody> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_maybeLoadMore);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  /// Asks for the next page when the end of the list is close, or when the list is too short to scroll.
  void _maybeLoadMore() {
    if (!mounted || !_scroll.hasClients) return;
    final bloc = context.read<RefundBloc>();
    final s = bloc.state;
    if (s.busy || s.loadingMore || s.page >= s.pages || s.error != null) return;
    if (_scroll.position.maxScrollExtent - _scroll.position.pixels < 320) {
      bloc.add(LoadMoreRefunds());
    }
  }

  /// Pull to refresh: reloads the open group from its first page and finishes when the load does.
  Future<void> _refresh() async {
    final bloc = context.read<RefundBloc>();
    if (bloc.state.busy) return;
    bloc.add(LoadRefunds());
    // If the bloc is busy with something else it ignores the event and emits nothing; do not wait forever.
    await bloc.stream
        .firstWhere((s) => !s.busy)
        .timeout(const Duration(seconds: 20), onTimeout: () => bloc.state);
  }

  @override
  Widget build(BuildContext context) => BlocListener<RefundBloc, RefundState>(
      listenWhen: (p, c) =>
          !identical(p.requests, c.requests) || p.busy != c.busy,
      listener: (_, __) =>
          WidgetsBinding.instance.addPostFrameCallback((_) => _maybeLoadMore()),
      child: BlocConsumer<RefundBloc, RefundState>(
        listenWhen: (p, c) => p.mutations != c.mutations,
        listener: (_, state) => widget.onUpdated?.call(),
        builder: (context, state) => RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
              controller: _scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                    'Review the buyer\u2019s issue and exact refund amount.'),
                const SizedBox(height: 12),
                _GroupChips(state: state),
                const SizedBox(height: 12),
                if (state.busy) const LinearProgressIndicator(),
                if (state.error != null)
                  Semantics(
                      liveRegion: true,
                      child: Text(state.error!,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error))),
                if (!state.busy && state.requests.isEmpty)
                  Padding(
                      padding: const EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                          child: Text(_groups
                              .firstWhere((g) => g.key == state.group)
                              .empty))),
                for (final r in state.requests)
                  Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _SellerRequest(
                          key: ValueKey(r.id), request: r, busy: state.busy)),
                if (state.loadingMore)
                  const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                          child: SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2.5)))),
              ]),
        ),
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
