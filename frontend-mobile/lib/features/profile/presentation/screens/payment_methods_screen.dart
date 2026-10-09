import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:toko_mart/core/constants/app_colors.dart';
import 'package:toko_mart/core/constants/app_sizes.dart';
import 'package:toko_mart/core/constants/app_strings.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';
import 'package:toko_mart/shared/widgets/card_brand_icon.dart';

class PaymentMethodsScreen extends StatefulWidget {
  const PaymentMethodsScreen({super.key});

  @override
  State<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends State<PaymentMethodsScreen> {
  @override
  void initState() {
    super.initState();
    context.read<PaymentBloc>().add(const LoadSavedPaymentMethods());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.paymentMethods),
      ),
      body: BlocBuilder<PaymentBloc, PaymentState>(
        builder: (context, state) {
          if (state is LoadingSavedPaymentMethods) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (state is PaymentFailed) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(height: AppSizes.md),
                  Text(
                    AppStrings.failedToLoadPaymentMethods,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: AppSizes.md),
                  ElevatedButton(
                    onPressed: () => context
                        .read<PaymentBloc>()
                        .add(const LoadSavedPaymentMethods()),
                    child: const Text(AppStrings.retry),
                  ),
                ],
              ),
            );
          }

          if (state is PaymentMethodsLoaded) {
            final methods = state.savedMethods;

            if (methods.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.credit_card_off,
                      size: 64,
                      color: Theme.of(context).colorScheme.onSurface.withAlpha(130),
                    ),
                    const SizedBox(height: AppSizes.md),
                    Text(
                      AppStrings.noSavedCards,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: AppSizes.xs),
                    Text(
                      AppStrings.noSavedCardsDescription,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurface.withAlpha(130),
                      ),
                    ),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(AppSizes.md),
              itemCount: methods.length,
              itemBuilder: (context, index) {
                final method = methods[index];
                final expiryText =
                    '${method.expiryMonth.toString().padLeft(2, '0')}/${method.expiryYear}';

                return Container(
                  margin: const EdgeInsets.only(bottom: AppSizes.md),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color ??
                        Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(AppSizes.radiusLg),
                    border: Border.all(
                      color: Theme.of(context).dividerColor.withAlpha(50),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(8),
                        blurRadius: 12,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSizes.md),
                    child: Row(
                      children: [
                        // ── Card brand icon ────────────────────────────
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: CardBrandIcon(
                            brand: method.brand,
                            size: 40,
                          ),
                        ),
                        const SizedBox(width: AppSizes.md),
                        // ── Card details ───────────────────────────────
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    '${method.brand.toUpperCase()} •••• ${method.last4}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface,
                                    ),
                                  ),
                                  if (method.isDefault) ...[
                                    const SizedBox(width: AppSizes.xs),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.success.withAlpha(20),
                                        borderRadius: BorderRadius.circular(
                                          AppSizes.radiusFull,
                                        ),
                                      ),
                                      child: const Text(
                                        AppStrings.defaultLabel,
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.success,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: AppSizes.xs),
                              Text(
                                '${AppStrings.cardExpiry} $expiryText',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withAlpha(130),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: AppSizes.xs),
                        // ── Set as default button ──────────────────────
                        IconButton(
                          icon: Icon(
                            method.isDefault ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                            size: 20,
                            color: method.isDefault ? AppColors.success : Colors.grey,
                          ),
                          tooltip: 'Set as default',
                          onPressed: method.isDefault ? null : () => _setAsDefault(context, method),
                          padding: const EdgeInsets.all(6),
                          constraints: const BoxConstraints(
                            minWidth: 44,
                            minHeight: 44,
                          ),
                        ),
                        const SizedBox(width: AppSizes.xs),
                        // ── Delete button ──────────────────────────────
                        IconButton(
                          icon: Icon(
                            Icons.delete_outline,
                            size: 20,
                            color: Colors.red.withAlpha(200),
                          ),
                          tooltip: AppStrings.deleteCard,
                          onPressed: () {
                            _showDeleteConfirmation(context, method);
                          },
                          padding: const EdgeInsets.all(6),
                          constraints: const BoxConstraints(
                            minWidth: 44,
                            minHeight: 44,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          }

          // Default empty state for PaymentInitial
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.credit_card_off,
                  size: 64,
                  color: Theme.of(context).colorScheme.onSurface.withAlpha(130),
                ),
                const SizedBox(height: AppSizes.md),
                Text(
                  AppStrings.noSavedCards,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _setAsDefault(
    BuildContext context,
    SavedPaymentMethod method,
  ) {
    context.read<PaymentBloc>().add(SetDefaultPaymentMethod(method.id));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${method.brand.toUpperCase()} •••• ${method.last4} set as default',
        ),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showDeleteConfirmation(
    BuildContext context,
    SavedPaymentMethod method,
  ) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text(AppStrings.deleteCard),
        content: Text(
          '${AppStrings.deleteCardConfirmation}\n\n${method.brand.toUpperCase()} •••• ${method.last4}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text(AppStrings.cancel),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              // TODO: Implement delete functionality when backend support is added
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(AppStrings.deleteFunctionalityUnavailable),
                ),
              );
            },
            child: Text(
              AppStrings.delete,
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}
