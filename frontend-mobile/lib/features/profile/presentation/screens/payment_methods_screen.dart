import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:toko_mart/core/constants/app_colors.dart';
import 'package:toko_mart/core/constants/app_sizes.dart';
import 'package:toko_mart/core/constants/app_strings.dart';
import 'package:toko_mart/core/theme/theme_colors.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';
import 'package:toko_mart/shared/widgets/app_dialog.dart';
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
        leading: BackButton(
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profile'),
        ),
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
            return _ErrorView(
              onRetry: () => context
                  .read<PaymentBloc>()
                  .add(const LoadSavedPaymentMethods()),
            );
          }

          if (state is PaymentMethodsLoaded) {
            final methods = state.savedMethods;
            if (methods.isEmpty) {
              return const _EmptyState(
                title: AppStrings.noSavedCards,
                description: AppStrings.noSavedCardsDescription,
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(AppSizes.md),
              itemCount: methods.length,
              itemBuilder: (context, index) {
                final method = methods[index];
                return _SavedCardTile(
                  key: ValueKey(method.id),
                  method: method,
                  onSetDefault: () => _setAsDefault(context, method),
                  onDelete: () => _showDeleteConfirmation(context, method),
                );
              },
            );
          }

          return const _EmptyState(title: AppStrings.noSavedCards);
        },
      ),
    );
  }

  void _setAsDefault(BuildContext context, SavedPaymentMethod method) {
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

  Future<void> _showDeleteConfirmation(
    BuildContext context,
    SavedPaymentMethod method,
  ) async {
    final confirm = await AppDialog.show(
      context,
      icon: Icons.delete_outline,
      iconColor: AppColors.danger,
      iconBackground: AppColors.dangerSurface,
      title: AppStrings.deleteCard,
      body:
          '${AppStrings.deleteCardConfirmation}\n\n${method.brand.toUpperCase()} •••• ${method.last4}',
      cancelLabel: AppStrings.cancel,
      confirmLabel: AppStrings.delete,
      confirmColor: AppColors.danger,
    );
    if (confirm == true && context.mounted) {
      context.read<PaymentBloc>().add(DeletePaymentMethod(method.id));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(AppStrings.cardDeletedSuccess),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }
}

class _SavedCardTile extends StatelessWidget {
  const _SavedCardTile({
    super.key,
    required this.method,
    required this.onSetDefault,
    required this.onDelete,
  });

  final SavedPaymentMethod method;
  final VoidCallback onSetDefault;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final expiry =
        '${method.expiryMonth.toString().padLeft(2, '0')}/${method.expiryYear}';

    return Container(
      margin: const EdgeInsets.only(bottom: AppSizes.md),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? context.cs.surface,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        border: Border.all(
          color: method.isDefault
              ? context.cs.primary.withAlpha(140)
              : context.borderColor,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(context.isDark ? 60 : 8),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSizes.md,
          AppSizes.md,
          AppSizes.xs,
          AppSizes.md,
        ),
        child: Row(
          children: [
            CardBrandIcon(brand: method.brand, size: 40),
            const SizedBox(width: AppSizes.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${method.brand.toUpperCase()} •••• ${method.last4}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: context.onSurfaceColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (method.isDefault) ...[
                        _DefaultBadge(),
                        const SizedBox(width: AppSizes.xs),
                      ],
                      Flexible(
                        child: Text(
                          '${AppStrings.cardExpiry} $expiry',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: context.onSurfaceSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              icon: Icon(
                method.isDefault
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
                size: 20,
                color: method.isDefault
                    ? context.cs.primary
                    : context.onSurfaceMuted,
              ),
              tooltip: AppStrings.setAsDefault,
              onPressed: method.isDefault ? null : onSetDefault,
              padding: const EdgeInsets.all(6),
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            ),
            IconButton(
              icon: const Icon(
                Icons.delete_outline,
                size: 20,
                color: AppColors.danger,
              ),
              tooltip: AppStrings.deleteCard,
              onPressed: onDelete,
              padding: const EdgeInsets.all(6),
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            ),
          ],
        ),
      ),
    );
  }
}

class _DefaultBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: context.cs.primary.withAlpha(context.isDark ? 40 : 25),
        borderRadius: BorderRadius.circular(AppSizes.radiusFull),
      ),
      child: Text(
        AppStrings.defaultLabel,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: context.cs.primary,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.title, this.description});

  final String title;
  final String? description;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.credit_card_off, size: 64, color: context.onSurfaceMuted),
          const SizedBox(height: AppSizes.md),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: context.onSurfaceColor,
            ),
          ),
          if (description != null) ...[
            const SizedBox(height: AppSizes.xs),
            Text(
              description!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: context.onSurfaceSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
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
            style: TextStyle(fontSize: 14, color: context.onSurfaceColor),
          ),
          const SizedBox(height: AppSizes.md),
          ElevatedButton(
            onPressed: onRetry,
            child: const Text(AppStrings.retry),
          ),
        ],
      ),
    );
  }
}
