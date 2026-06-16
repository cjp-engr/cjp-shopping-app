import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/cart_item_entity.dart';
import '../bloc/cart_bloc.dart';
import '../bloc/cart_event.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';

class CartItemTile extends StatelessWidget {
  final CartItemEntity item;
  const CartItemTile({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSizes.sm),
      child: Padding(
        padding: const EdgeInsets.all(AppSizes.sm),
        child: Row(
          children: [
            // Image
            ClipRRect(
              borderRadius: BorderRadius.circular(AppSizes.radiusSm),
              child: Image.network(
                item.product.image,
                width: 72,
                height: 72,
                fit: BoxFit.cover,
                loadingBuilder: (_, child, progress) =>
                    progress == null ? child : Container(color: AppColors.shimmerBase),
                errorBuilder: (_, __, ___) =>
                    Container(color: AppColors.shimmerBase),
              ),
            ),
            const SizedBox(width: AppSizes.sm),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${item.product.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 14),
                  ),
                ],
              ),
            ),
            // Stepper + delete
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: AppColors.danger, size: 20),
                  onPressed: () => context
                      .read<CartBloc>()
                      .add(CartItemRemoved(item.product.id)),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                const SizedBox(height: AppSizes.xs),
                Row(
                  children: [
                    _StepBtn(
                      icon: Icons.remove,
                      onPressed: () => context.read<CartBloc>().add(
                          CartItemQuantityChanged(
                              item.product.id, item.quantity - 1)),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppSizes.sm),
                      child: Text(
                        '${item.quantity}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                    ),
                    _StepBtn(
                      icon: Icons.add,
                      onPressed: item.quantity < item.product.stock
                          ? () => context.read<CartBloc>().add(
                              CartItemQuantityChanged(
                                  item.product.id, item.quantity + 1))
                          : null,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '\$${item.subtotal.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      color: AppColors.textPrimary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StepBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  const _StepBtn({required this.icon, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 28,
      height: 28,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: const Size(28, 28),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSizes.radiusSm)),
        ),
        child: Icon(icon, size: 14),
      ),
    );
  }
}
