import 'package:flutter/material.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';

class SavedCardsListWidget extends StatelessWidget {
  final List<SavedPaymentMethod> savedMethods;
  final SavedPaymentMethod? selectedMethod;
  final Function(SavedPaymentMethod) onCardSelected;
  final bool isLoading;

  const SavedCardsListWidget({
    super.key,
    required this.savedMethods,
    required this.selectedMethod,
    required this.onCardSelected,
    required this.isLoading,
  });

  IconData _getCardIcon(String brand) {
    final brandLower = brand.toLowerCase();
    if (brandLower.contains('visa')) {
      return Icons.credit_card;
    } else if (brandLower.contains('mastercard') || brandLower.contains('master card')) {
      return Icons.credit_card;
    } else if (brandLower.contains('amex') || brandLower.contains('american')) {
      return Icons.credit_card;
    } else if (brandLower.contains('discover')) {
      return Icons.credit_card;
    }
    return Icons.credit_card;
  }

  @override
  Widget build(BuildContext context) {
    if (savedMethods.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 32),
          child: Column(
            children: [
              Icon(
                Icons.credit_card_off_rounded,
                size: 48,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 12),
              Text(
                'No saved cards',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: savedMethods.length,
      itemBuilder: (context, index) {
        final method = savedMethods[index];
        final isSelected = selectedMethod?.id == method.id;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isLoading ? null : () => onCardSelected(method),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFFD97706)
                        : Colors.grey[300]!,
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(10),
                  color: isSelected
                      ? const Color(0xFFD97706).withOpacity(0.04)
                      : Colors.transparent,
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  child: Row(
                    children: [
                      Radio<String?>(
                        value: method.id,
                        groupValue: selectedMethod?.id,
                        onChanged: isLoading ? null : (_) => onCardSelected(method),
                        activeColor: const Color(0xFFD97706),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  _getCardIcon(method.brand),
                                  size: 20,
                                  color: Colors.grey[600],
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '${method.brand} •••• ${method.last4}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w600,
                                          color: Colors.black87,
                                        ),
                                  ),
                                ),
                                if (method.isDefault) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF15803D)
                                          .withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'Default',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(
                                            color: const Color(0xFF15803D),
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Expires ${method.expiryMonth}/${method.expiryYear}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: Colors.grey[600],
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
