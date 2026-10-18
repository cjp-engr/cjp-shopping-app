import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/theme_colors.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';
import 'refund_bloc.dart';
import 'refund_components.dart';
import 'refund_request_card.dart';

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
  final _quantityControllers = <String, TextEditingController>{};
  String _reason = 'damaged';
  @override
  void dispose() {
    _description.dispose();
    for (final controller in _quantityControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _setQuantity(String id, int value) => setState(() {
        _quantities[id] = value;
        _quantityControllers[id]?.text = '$value';
      });
  @override
  Widget build(BuildContext context) => BlocConsumer<RefundBloc, RefundState>(
      listenWhen: (p, c) => p.mutations != c.mutations,
      listener: (_, state) {
        setState(() {
          _quantities.clear();
          _reason = 'damaged';
          _description.clear();
          _form.currentState?.reset();
          for (final c in _quantityControllers.values) {
            c.text = '0';
          }
        });
        widget.onUpdated?.call();
      },
      builder: (context, state) {
        final e = state.eligibility;
        final quote = e?.quote(_quantities, reason: _reason) ?? 0;
        final frozen = state.busy || state.retryPending;
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
                child: Text(
                    e?.eligible == true ? 'Request a refund' : 'Item refunds',
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
          if (e != null && e.eligible && e.requestsEnabled) ...[
            Text('Choose the item and tell us what went wrong.',
                style:
                    TextStyle(fontSize: 13, color: context.onSurfaceSecondary)),
            const SizedBox(height: 14),
            if (e.deadlineAt != null)
              Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(20),
                      borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [
                    Icon(Icons.schedule_outlined,
                        size: 18,
                        color: context.isDark
                            ? Colors.orange.shade200
                            : Colors.brown.shade800),
                    const SizedBox(width: 10),
                    Expanded(
                        child: Text('Request by ${refundDate(e.deadlineAt)}',
                            style: TextStyle(
                                fontSize: 12,
                                color: context.isDark
                                    ? Colors.orange.shade200
                                    : Colors.brown.shade800)))
                  ])),
            Form(
                key: _form,
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RefundSurface(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            const Text('Select an item',
                                style: TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 16),
                            for (final line
                                in e.lines.where((l) => l.available > 0))
                              Padding(
                                  padding: const EdgeInsets.only(bottom: 16),
                                  child: RefundProduct(
                                      name: line.name,
                                      image: line.image,
                                      detail: '${line.available} available',
                                      child: Padding(
                                          padding:
                                              const EdgeInsets.only(top: 8),
                                          child: Row(children: [
                                            IconButton(
                                                tooltip:
                                                    'Decrease refund quantity for ${line.name}',
                                                onPressed: frozen ||
                                                        (_quantities[line.id] ??
                                                                0) <=
                                                            0
                                                    ? null
                                                    : () => _setQuantity(
                                                        line.id,
                                                        (_quantities[line.id] ??
                                                                0) -
                                                            1),
                                                icon: const Icon(Icons.remove,
                                                    size: 18)),
                                            Expanded(
                                                child: TextFormField(
                                                    key: ValueKey(
                                                        'refund_quantity_${line.id}'),
                                                    controller: _quantityControllers
                                                        .putIfAbsent(
                                                            line.id,
                                                            () => TextEditingController(
                                                                text:
                                                                    '${_quantities[line.id] ?? 0}')),
                                                    enabled: !frozen,
                                                    textAlign: TextAlign.center,
                                                    decoration: InputDecoration(
                                                        contentPadding:
                                                            const EdgeInsets
                                                                .symmetric(
                                                                vertical: 12),
                                                        isDense: true,
                                                        semanticCounterText:
                                                            'Refund quantity for ${line.name}'),
                                                    keyboardType:
                                                        TextInputType.number,
                                                    inputFormatters: [
                                                      FilteringTextInputFormatter
                                                          .digitsOnly
                                                    ],
                                                    validator: (v) {
                                                      final n =
                                                          int.tryParse(v ?? '');
                                                      return n == null ||
                                                              n < 0 ||
                                                              n > line.available
                                                          ? '0–${line.available}'
                                                          : null;
                                                    },
                                                    onChanged: (v) => setState(() =>
                                                        _quantities[line.id] =
                                                            int.tryParse(v) ??
                                                                -1))),
                                            IconButton(
                                                tooltip:
                                                    'Increase refund quantity for ${line.name}',
                                                onPressed: frozen ||
                                                        (_quantities[line.id] ??
                                                                0) >=
                                                            line.available
                                                    ? null
                                                    : () => _setQuantity(
                                                        line.id,
                                                        (_quantities[line.id] ??
                                                                0) +
                                                            1),
                                                icon: const Icon(Icons.add,
                                                    size: 18))
                                          ])))),
                            DropdownButtonFormField<String>(
                                initialValue: _reason,
                                isExpanded: true,
                                decoration:
                                    const InputDecoration(labelText: 'Reason'),
                                items: refundReasons.entries
                                    .map((r) => DropdownMenuItem(
                                        value: r.key, child: Text(r.value)))
                                    .toList(),
                                onChanged: frozen
                                    ? null
                                    : (v) => setState(
                                        () => _reason = v ?? 'damaged')),
                            const SizedBox(height: 20),
                            TextFormField(
                                key: const ValueKey('refund_description'),
                                controller: _description,
                                enabled: !frozen,
                                maxLength: 1000,
                                minLines: 3,
                                maxLines: 5,
                                decoration: const InputDecoration(
                                    labelText: 'Tell the seller what happened',
                                    alignLabelWithHint: true,
                                    hintText:
                                        'Describe the issue with the item you received.'),
                                validator: (v) => v == null || v.trim().isEmpty
                                    ? 'Describe the issue'
                                    : null,
                                onChanged: (_) => setState(() {})),
                            Text(
                                'Describe the problem so the seller can review your request.',
                                style: TextStyle(
                                    fontSize: 12,
                                    height: 1.6,
                                    color: context.onSurfaceSecondary)),
                          ])),
                      RefundSurface(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            const Text('Your refund',
                                style: TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 20),
                            RefundBreakdown(
                                amount: quote,
                                shipping: e.shippingQuote(_quantities, _reason),
                                currency: e.currency),
                            const SizedBox(height: 16),
                            Text(
                                'Your original discounts and tax are included. Shipping eligibility updates with your selection and reason.',
                                style: TextStyle(
                                    fontSize: 12,
                                    height: 1.6,
                                    color: context.onSurfaceSecondary)),
                            const SizedBox(height: 16),
                            SizedBox(
                                width: double.infinity,
                                child: FilledButton(
                                    style: FilledButton.styleFrom(
                                        minimumSize: const Size(0, 48),
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.black87),
                                    onPressed: state.busy ||
                                            (!state.retryPending &&
                                                (quote <= 0 ||
                                                    _description.text
                                                        .trim()
                                                        .isEmpty))
                                        ? null
                                        : () {
                                            if (state.retryPending ||
                                                _form.currentState!
                                                    .validate()) {
                                              context.read<RefundBloc>().add(
                                                  SubmitRefund(
                                                      _quantities,
                                                      _reason,
                                                      _description.text));
                                            }
                                          },
                                    child: Text(state.retryPending
                                        ? 'Retry same request'
                                        : 'Submit refund request'))),
                            const SizedBox(height: 10),
                            Center(
                                child: Text(
                                    'The seller reviews your request first.',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: context.onSurfaceSecondary))),
                          ])),
                    ])),
          ],
          if (state.retryPending &&
              (e == null || !e.eligible || !e.requestsEnabled))
            TextButton(
                onPressed: state.busy
                    ? null
                    : () => context.read<RefundBloc>().add(
                        SubmitRefund(_quantities, _reason, _description.text)),
                child: const Text('Retry same request')),
          for (final r in state.requests)
            RefundRequestCard(key: ValueKey(r.id), request: r),
          RefundPolicy(deliveredAt: e?.deliveredAt),
        ]);
      });
}
