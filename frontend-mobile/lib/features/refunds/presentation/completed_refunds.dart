import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';
import 'refund_order_card.dart';

/// The buyer's Return/Refund tab: refunds the seller has approved. More load as the list is scrolled;
/// there are no page buttons.
class CompletedRefunds extends StatefulWidget {
  final RefundApi? api;

  /// Told how many approved refunds there are whenever the first page loads, for the tab badge.
  final ValueChanged<int>? onTotal;
  const CompletedRefunds({super.key, this.api, this.onTotal});
  @override
  State<CompletedRefunds> createState() => _CompletedRefundsState();
}

class _CompletedRefundsState extends State<CompletedRefunds> {
  final _scroll = ScrollController();
  final List<RefundRequestData> _requests = [];
  int _page = 1, _pages = 0;
  bool _busy = true, _loadingMore = false, _moreFailed = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_maybeLoadMore);
    _load();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  RefundApi get _api => widget.api ?? context.read<RefundApi>();

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _busy = true;
        _error = null;
        _moreFailed = false;
      });
    }
    try {
      final data = await _api.completed(1);
      if (mounted) {
        setState(() {
          _requests
            ..clear()
            ..addAll(data.requests);
          _page = data.page;
          _pages = data.pages;
        });
        widget.onTotal?.call(data.total);
      }
    } catch (_) {
      if (mounted) {
        setState(
            () => _error = 'Could not load your refunds. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    _checkAfterFrame();
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _busy || _page >= _pages) return;
    setState(() {
      _loadingMore = true;
      _moreFailed = false;
    });
    try {
      final data = await _api.completed(_page + 1);
      if (mounted) {
        final known = _requests.map((r) => r.id).toSet();
        setState(() {
          _requests.addAll(data.requests.where((r) => !known.contains(r.id)));
          _page = data.page;
          _pages = data.pages;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _moreFailed = true);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
    _checkAfterFrame();
  }

  void _checkAfterFrame() =>
      WidgetsBinding.instance.addPostFrameCallback((_) => _maybeLoadMore());

  /// Loads the next page when the end of the list is close, or when the list is too short to scroll.
  void _maybeLoadMore() {
    if (!mounted || !_scroll.hasClients || _moreFailed) return;
    if (_scroll.position.maxScrollExtent - _scroll.position.pixels < 320) {
      _loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final approved = _requests.where((r) => r.approvedBySeller).toList();
    return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
            controller: _scroll,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Row(children: [
                Expanded(
                    child: Text('Return/Refund',
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800))),
                IconButton(
                    tooltip: 'Refresh refunds',
                    onPressed: _busy ? null : _load,
                    icon: const Icon(Icons.refresh))
              ]),
              Text('Refunds your sellers have approved.',
                  style: TextStyle(
                      fontSize: 14, color: context.onSurfaceSecondary)),
              const SizedBox(height: 6),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Icon(Icons.info_outline,
                        size: 14, color: context.onSurfaceMuted)),
                const SizedBox(width: 6),
                Expanded(
                    child: Text(
                        'Requests waiting for a seller stay with your order under Completed.',
                        style: TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            color: context.onSurfaceMuted))),
              ]),
              const SizedBox(height: 16),
              if (_busy)
                const LinearProgressIndicator()
              else if (_error != null)
                Semantics(
                    liveRegion: true,
                    child: Column(children: [
                      Text(_error!),
                      TextButton(
                          onPressed: _load, child: const Text('Try again'))
                    ]))
              else if (_requests.isEmpty)
                const _EmptyState()
              else ...[
                for (final request in approved)
                  Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: RefundOrderCard(
                          key: ValueKey(request.id),
                          request: request,
                          onViewOrder: () =>
                              context.push('/orders/${request.orderId}'))),
                if (_loadingMore)
                  const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Center(
                          child: SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2.5)))),
                if (_moreFailed)
                  Center(
                      child: TextButton(
                          onPressed: _loadMore,
                          child: const Text(
                              'Could not load more. Tap to retry.'))),
              ],
            ]));
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) => Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.lg, vertical: AppSizes.xl),
      decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusLg),
          border: Border.all(color: context.borderColor)),
      child: Column(children: [
        Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(30), shape: BoxShape.circle),
            child: Icon(Icons.assignment_return_outlined,
                size: 28,
                color: context.isDark
                    ? Colors.orange.shade200
                    : Colors.brown.shade700)),
        const SizedBox(height: 16),
        const Text('No approved refunds yet',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text(
            'When a seller approves a refund request, it moves here. Requests still waiting for the seller stay with your order under Completed, where you can track them in the order details.',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 13, height: 1.5, color: context.onSurfaceSecondary)),
      ]));
}
