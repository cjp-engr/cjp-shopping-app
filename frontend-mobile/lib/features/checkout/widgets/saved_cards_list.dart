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

  @override
  Widget build(BuildContext context) {
    if (savedMethods.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'No saved cards. Add a new card to continue.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
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

        return Card(
          margin: const EdgeInsets.symmetric(vertical: 8),
          child: ListTile(
            leading: Radio<String?>(
              value: method.id,
              groupValue: selectedMethod?.id,
              onChanged: isLoading ? null : (_) => onCardSelected(method),
            ),
            title: Text('${method.brand} •••• ${method.last4}'),
            subtitle: Text('Expires ${method.expiryMonth}/${method.expiryYear}'),
            trailing: method.isDefault
                ? Chip(
                    label: const Text('Default'),
                    backgroundColor: Colors.blue[100],
                  )
                : null,
            enabled: !isLoading,
          ),
        );
      },
    );
  }
}
