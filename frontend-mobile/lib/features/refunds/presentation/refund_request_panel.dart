import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/option_picker.dart';
import '../../../../shared/widgets/quantity_pill.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';
import 'refund_bloc.dart';
import 'refund_components.dart';
import 'refund_order_card.dart';

class RefundRequestPanel extends StatelessWidget {
  final String orderId;
  final RefundApi? api;
  final VoidCallback? onUpdated;
  const RefundRequestPanel(
      {super.key, required this.orderId, this.api, this.onUpdated});
  @override
  Widget build(BuildContext context) => BlocProvider(
      create: (_) =>
          RefundBloc(api ?? context.read<RefundApi>(), orderId: orderId)
            ..add(LoadRefunds()),
      child: _RefundForm(onUpdated: onUpdated));
}

class _RefundForm extends StatefulWidget {
  final VoidCallback? onUpdated;
  const _RefundForm({this.onUpdated});
  @override
  State<_RefundForm> createState() => _RefundFormState();
}

class _RefundFormState extends State<_RefundForm> {
  final _description = TextEditingController();
  final _form = GlobalKey<FormState>();
  final _quantities = <String, int>{};
  String _reason = 'damaged';

  /// null: open only when the order has no earlier request. Set by the button that opens or closes it.
  bool? _formOpen;
  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  void _setQuantity(String id, int value) =>
      setState(() => _quantities[id] = value);

  static const _reasonIcons = {
    'damaged': Icons.broken_image_outlined,
    'wrong_item': Icons.swap_horiz_rounded,
    'missing_items': Icons.remove_shopping_cart_outlined,
    'not_as_described': Icons.help_outline_rounded,
    'other': Icons.more_horiz_rounded,
  };
  Widget _header(RefundEligibility e) => Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.md, vertical: AppSizes.sm + 4),
      child: Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.inventory_2_outlined,
                  size: 18, color: context.onSurfaceSecondary),
              const SizedBox(width: 8),
              const Text('Select an item',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ]),
            if (e.deadlineAt != null)
              Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(24),
                      borderRadius: BorderRadius.circular(AppSizes.radiusFull)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.schedule_outlined,
                        size: 14,
                        color: context.isDark
                            ? Colors.orange.shade200
                            : Colors.brown.shade800),
                    const SizedBox(width: 6),
                    Flexible(
                        child: Text('Request by ${refundDate(e.deadlineAt)}',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: context.isDark
                                    ? Colors.orange.shade200
                                    : Colors.brown.shade800))),
                  ])),
          ]));

  Widget _itemRow(RefundEligibility e, RefundLine line, bool frozen) {
    final quantity = _quantities[line.id] ?? 0;
    final selected = quantity > 0 && quantity <= line.amounts.length
        ? line.amounts.take(quantity).fold<int>(0, (sum, a) => sum + a)
        : 0;
    return Container(
        decoration: BoxDecoration(
            border: Border(top: BorderSide(color: context.borderColor))),
        padding: const EdgeInsets.all(AppSizes.md),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          RefundItemImage(image: line.image),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(line.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('${line.available} available',
                    style: TextStyle(
                        fontSize: 12, color: context.onSurfaceSecondary)),
                const SizedBox(height: 10),
                Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    runSpacing: 6,
                    children: [
                      QuantityPill(
                          key: ValueKey('refund_quantity_${line.id}'),
                          value: quantity,
                          min: 0,
                          max: line.available,
                          decreaseTooltip:
                              'Decrease refund quantity for ${line.name}',
                          increaseTooltip:
                              'Increase refund quantity for ${line.name}',
                          semanticLabel: 'Refund quantity for ${line.name}',
                          onChanged:
                              frozen ? null : (v) => _setQuantity(line.id, v)),
                      Text(
                          quantity > 0
                              ? '${refundMoney(selected, e.currency)} refund'
                              : 'Not selected',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: quantity > 0
                                  ? FontWeight.w700
                                  : FontWeight.w400,
                              color: quantity > 0
                                  ? AppColors.primaryDark
                                  : context.onSurfaceSecondary)),
                    ]),
              ])),
        ]));
  }

  Widget _fieldLabel(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text,
          style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: context.onSurfaceColor)));

  Widget _reasonAndExplanation(RefundEligibility e, bool frozen) {
    final shipping = e.shippingQuote(_quantities, _reason);
    return Container(
        decoration: BoxDecoration(
            border: Border(top: BorderSide(color: context.borderColor))),
        padding: const EdgeInsets.all(AppSizes.md),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _fieldLabel('Reason'),
          OptionPickerField<String>(
              key: const ValueKey('refund_reason_field'),
              title: 'Select a reason',
              placeholder: 'Select a reason',
              placeholderIcon: Icons.help_outline_rounded,
              options: [
                for (final r in refundReasons.entries)
                  PickerOption<String>(r.key, r.value,
                      _reasonIcons[r.key] ?? Icons.label_outline)
              ],
              value: _reason,
              enabled: !frozen,
              onChanged: (v) => setState(() => _reason = v)),
          if (e.shippingRefundable > 0)
            Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                    shipping > 0
                        ? 'Shipping (${refundMoney(shipping, e.currency)}) is included in your refund.'
                        : 'Shipping (${refundMoney(e.shippingRefundable, e.currency)}) is refunded only when you select every item for a damaged, wrong, missing or not-as-described item.',
                    style: TextStyle(
                        fontSize: 12,
                        height: 1.5,
                        color: shipping > 0
                            ? (context.isDark
                                ? Colors.green.shade200
                                : Colors.green.shade800)
                            : context.onSurfaceSecondary))),
          const SizedBox(height: 20),
          _fieldLabel('Tell the seller what happened'),
          // Same box as the product review: light fill, no outline until focused, counter below.
          TextFormField(
              key: const ValueKey('refund_description'),
              controller: _description,
              enabled: !frozen,
              maxLength: 1000,
              minLines: 4,
              maxLines: 6,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                  hintText: 'Describe the issue with the item you received.',
                  hintStyle:
                      TextStyle(color: context.onSurfaceMuted, fontSize: 13),
                  helperText:
                      'Describe the problem so the seller can review your request.',
                  helperMaxLines: 2,
                  helperStyle: TextStyle(
                      color: context.onSurfaceSecondary, fontSize: 12),
                  filled: true,
                  fillColor: context.surfaceVariantColor,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                      borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.all(12),
                  counterStyle:
                      TextStyle(color: context.onSurfaceMuted, fontSize: 11)),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Describe the issue' : null,
              onChanged: (_) => setState(() {})),
        ]));
  }

  Widget _summary(RefundEligibility e, int quote) {
    final items =
        _quantities.values.where((q) => q > 0).fold<int>(0, (s, q) => s + q);
    return Container(
        width: double.infinity,
        color: context.surfaceVariantColor,
        padding: const EdgeInsets.all(AppSizes.md),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('Your refund',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            if (items > 0)
              Text('  ·  $items item${items == 1 ? '' : 's'}',
                  style: TextStyle(
                      fontSize: 13, color: context.onSurfaceSecondary)),
          ]),
          const SizedBox(height: 16),
          RefundBreakdown(
              amount: quote,
              shipping: e.shippingQuote(_quantities, _reason),
              currency: e.currency),
          const SizedBox(height: 4),
          Text(
              'Your original discounts and tax are included. Shipping eligibility updates with your selection and reason.',
              style: TextStyle(
                  fontSize: 12,
                  height: 1.6,
                  color: context.onSurfaceSecondary)),
        ]));
  }

  Widget _submit(RefundState state, int quote) {
    // A disabled button should say why, not just turn grey.
    final missing = state.busy || state.retryPending
        ? null
        : quote <= 0
            ? 'Select an item to refund.'
            : _description.text.trim().isEmpty
                ? 'Describe the issue to continue.'
                : null;
    return Padding(
        padding: const EdgeInsets.all(AppSizes.md),
        child: Column(children: [
          if (missing != null)
            Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child:
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.info_outline,
                      size: 16, color: context.onSurfaceSecondary),
                  const SizedBox(width: 6),
                  Flexible(
                      child: Text(missing,
                          style: TextStyle(
                              fontSize: 13,
                              color: context.onSurfaceSecondary))),
                ])),
          SizedBox(
              width: double.infinity,
              child: FilledButton(
                  style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 48),
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black87,
                      disabledBackgroundColor: AppColors.primary.withAlpha(80),
                      disabledForegroundColor: Colors.black.withAlpha(120)),
                  onPressed: state.busy ||
                          (!state.retryPending &&
                              (quote <= 0 || _description.text.trim().isEmpty))
                      ? null
                      : () {
                          if (state.retryPending ||
                              _form.currentState!.validate()) {
                            context.read<RefundBloc>().add(SubmitRefund(
                                _quantities, _reason, _description.text));
                          }
                        },
                  child: Text(state.retryPending
                      ? 'Retry same request'
                      : 'Submit refund request'))),
          const SizedBox(height: 10),
          Text('The seller reviews your request first.',
              style:
                  TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
        ]));
  }

  /// What opens the form when the order already has a request: the outcome comes first, and a new
  /// request is one tap away instead of a full form pushing the outcome off the screen.
  Widget _formToggle(RefundEligibility e,
          {required bool open, required bool again, required bool locked}) =>
      Container(
          key: const ValueKey('refund_form_toggle'),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(AppSizes.radiusLg),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withAlpha(18),
                  blurRadius: 16,
                  offset: const Offset(0, 3)),
              BoxShadow(
                  color: Colors.black.withAlpha(6),
                  blurRadius: 4,
                  offset: const Offset(0, 1)),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Semantics(
              button: true,
              expanded: open,
              child: InkWell(
                  onTap:
                      locked ? null : () => setState(() => _formOpen = !open),
                  child: Padding(
                      padding: const EdgeInsets.all(AppSizes.md),
                      child: Row(children: [
                        Icon(again ? Icons.replay : Icons.add_circle_outline,
                            size: 20, color: context.onSurfaceSecondary),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(
                                  again
                                      ? 'Request a refund again'
                                      : 'Request a refund for other items',
                                  style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700)),
                              if (!open && e.deadlineAt != null)
                                Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                        'Request by ${refundDate(e.deadlineAt)}',
                                        style: TextStyle(
                                            fontSize: 12,
                                            color:
                                                context.onSurfaceSecondary))),
                            ])),
                        Icon(open ? Icons.expand_less : Icons.expand_more,
                            color: context.onSurfaceSecondary),
                      ])))));

  @override
  Widget build(BuildContext context) => BlocConsumer<RefundBloc, RefundState>(
      listenWhen: (p, c) => p.mutations != c.mutations,
      listener: (_, state) {
        setState(() {
          _formOpen = false;
          _quantities.clear();
          _reason = 'damaged';
          _description.clear();
          _form.currentState?.reset();
        });
        widget.onUpdated?.call();
      },
      builder: (context, state) {
        final e = state.eligibility;
        final quote = e?.quote(_quantities, reason: _reason) ?? 0;
        final frozen = state.busy || state.retryPending;
        final canRequest = e != null && e.eligible && e.requestsEnabled;
        final hasHistory = state.requests.isNotEmpty;
        // An uncertain submission keeps its form on screen so the same request can be retried.
        final formOpen =
            canRequest && (state.retryPending || (_formOpen ?? !hasHistory));
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
                child: Text(
                    e?.eligible == true && !hasHistory
                        ? 'Request a refund'
                        : 'Item refunds',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700))),
            IconButton(
                tooltip: 'Refresh refunds',
                onPressed: state.busy
                    ? null
                    : () => context.read<RefundBloc>().add(LoadRefunds()),
                icon: const Icon(Icons.refresh))
          ]),
          if (state.busy) const LinearProgressIndicator(),
          if (state.error != null)
            Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Semantics(
                    liveRegion: true,
                    child: Text(state.error!,
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error)))),
          if (e != null && !e.requestsEnabled)
            const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text('New refund requests are currently unavailable.')),
          if (e != null && !e.eligible && e.reason != 'active_request')
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                    refundEligibilityReasons[e.reason] ??
                        'This order is not eligible for a refund request.',
                    style: TextStyle(
                        fontSize: 13, color: context.onSurfaceSecondary))),
          if (state.retryPending &&
              (e == null || !e.eligible || !e.requestsEnabled))
            TextButton(
                onPressed: state.busy
                    ? null
                    : () => context.read<RefundBloc>().add(
                        SubmitRefund(_quantities, _reason, _description.text)),
                child: const Text('Retry same request')),
          for (final r in state.requests)
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: RefundOrderCard(
                    key: ValueKey(r.id), request: r, inOrder: true)),
          if (canRequest) ...[
            if (hasHistory)
              _formToggle(e,
                  open: formOpen,
                  again: state.requests.first.state == 'rejected',
                  locked: state.retryPending),
            if (formOpen) ...[
              Text('Choose the item and tell us what went wrong.',
                  style: TextStyle(
                      fontSize: 13, color: context.onSurfaceSecondary)),
              const SizedBox(height: 14),
              Form(
                  key: _form,
                  child: Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: context.cardColor,
                        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withAlpha(18),
                              blurRadius: 16,
                              offset: const Offset(0, 3)),
                          BoxShadow(
                              color: Colors.black.withAlpha(6),
                              blurRadius: 4,
                              offset: const Offset(0, 1)),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _header(e),
                            for (final line
                                in e.lines.where((l) => l.available > 0))
                              _itemRow(e, line, frozen),
                            _reasonAndExplanation(e, frozen),
                            _summary(e, quote),
                            _submit(state, quote),
                          ]))),
            ],
          ],
          RefundPolicy(deliveredAt: e?.deliveredAt),
        ]);
      });
}
