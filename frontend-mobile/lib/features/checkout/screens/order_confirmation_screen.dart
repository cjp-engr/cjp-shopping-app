import 'package:flutter/material.dart';
import 'package:toko_mart/features/orders/domain/entities/order_entity.dart';

/// Shown after a successful payment. Display-only: shows the order summary,
/// confirmation number, payment method and shipping address.
///
/// [cardBrand] / [cardLast4] describe the card used. [OrderEntity] does not
/// carry them, so the caller (checkout flow) supplies them when known.
class OrderConfirmationScreen extends StatelessWidget {
  final String paymentIntentId;
  final OrderEntity order;
  final String? cardBrand;
  final String? cardLast4;
  final VoidCallback onContinueShopping;

  const OrderConfirmationScreen({
    super.key,
    required this.paymentIntentId,
    required this.order,
    required this.onContinueShopping,
    this.cardBrand,
    this.cardLast4,
  });

  static String _money(double v) => '\$${v.toStringAsFixed(2)}';

  static String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

  String get _paymentLabel {
    final brand = (cardBrand ?? '').trim();
    final last4 = (cardLast4 ?? '').trim();
    if (brand.isEmpty && last4.isEmpty) return _capitalize(order.paymentType);
    final name = brand.isEmpty ? 'Card' : _capitalize(brand);
    return last4.isEmpty ? name : '$name ending in $last4';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final addr = order.shippingAddress;

    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Order Confirmed'),
          automaticallyImplyLeading: false,
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: CircleAvatar(
                          radius: 40,
                          backgroundColor: scheme.primaryContainer,
                          child: Icon(
                            Icons.check_circle,
                            size: 48,
                            color: scheme.onPrimaryContainer,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Thank you for your order!',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your payment was successful.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 24),
                      _SectionCard(
                        title: 'Order Number',
                        children: [
                          SelectableText(
                            order.shortId,
                            style: theme.textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _SectionCard(
                        title: 'Items (${order.items.length})',
                        children: [
                          for (final item in order.items)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(item.productName,
                                            style: theme.textTheme.bodyMedium),
                                        Text(
                                          'Qty ${item.quantity} × '
                                          '${_money(item.salePrice)}',
                                          style: theme.textTheme.bodySmall
                                              ?.copyWith(
                                            color: scheme.onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(_money(item.saleTotal),
                                      style: theme.textTheme.bodyMedium),
                                ],
                              ),
                            ),
                          const Divider(height: 24),
                          _AmountRow(label: 'Subtotal', value: order.subtotal),
                          _AmountRow(
                            label: 'Shipping',
                            value: order.shipping,
                            freeWhenZero: true,
                          ),
                          _AmountRow(label: 'Tax', value: order.tax),
                          const Divider(height: 24),
                          _AmountRow(
                            label: 'Total',
                            value: order.total,
                            emphasized: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _SectionCard(
                        title: 'Payment Method',
                        children: [
                          Row(
                            children: [
                              Icon(Icons.credit_card,
                                  color: scheme.onSurfaceVariant),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(_paymentLabel,
                                    style: theme.textTheme.bodyMedium),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _SectionCard(
                        title: 'Shipping Address',
                        children: [
                          Text(
                            '${addr.street}\n'
                            '${addr.city}, ${addr.state} ${addr.zipCode}\n'
                            '${addr.country}',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton(
                    onPressed: onContinueShopping,
                    child: const Text('Continue Shopping'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  final String label;
  final double value;
  final bool emphasized;
  final bool freeWhenZero;

  const _AmountRow({
    required this.label,
    required this.value,
    this.emphasized = false,
    this.freeWhenZero = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = emphasized
        ? theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)
        : theme.textTheme.bodyMedium;
    final text = (freeWhenZero && value == 0)
        ? 'Free'
        : OrderConfirmationScreen._money(value);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(text, style: style),
        ],
      ),
    );
  }
}
