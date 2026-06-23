import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/cart_item_entity.dart';
import '../bloc/cart_bloc.dart';
import '../bloc/cart_event.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';

class CartItemTile extends StatefulWidget {
  final CartItemEntity item;
  const CartItemTile({super.key, required this.item});

  @override
  State<CartItemTile> createState() => _CartItemTileState();
}

class _CartItemTileState extends State<CartItemTile>
    with SingleTickerProviderStateMixin {
  static const double _actionWidth = 90.0;

  late final AnimationController _ctrl;
  late final Animation<double> _offsetAnim;
  double _dragStart = 0;
  bool _isOpen = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    _offsetAnim = Tween<double>(begin: 0, end: -_actionWidth).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onDragStart(DragStartDetails d) {
    _dragStart = d.globalPosition.dx;
  }

  void _onDragUpdate(DragUpdateDetails d) {
    final delta = d.globalPosition.dx - _dragStart;
    // Only allow sliding left (negative delta)
    final raw = (_isOpen ? -_actionWidth : 0) + delta;
    final clamped = raw.clamp(-_actionWidth, 0.0);
    _ctrl.value = (-clamped) / _actionWidth;
  }

  void _onDragEnd(DragEndDetails d) {
    final velocity = d.primaryVelocity ?? 0;
    if (velocity < -200 || _ctrl.value > 0.4) {
      _ctrl.forward();
      _isOpen = true;
    } else {
      _ctrl.reverse();
      _isOpen = false;
    }
  }

  void _close() {
    _ctrl.reverse();
    _isOpen = false;
  }

  void _delete() {
    _ctrl.reverse();
    _isOpen = false;
    context.read<CartBloc>().add(CartItemRemoved(widget.item.product.id));
  }

  @override
  Widget build(BuildContext context) {
    final onSurface = context.onSurfaceColor;
    final onSurfaceSec = context.onSurfaceSecondary;
    final muted = context.onSurfaceMuted;
    final surfaceVar = context.surfaceVariantColor;
    final border = context.borderColor;
    final cardBg = context.cardColor;
    final item = widget.item;

    return GestureDetector(
      onHorizontalDragStart: _onDragStart,
      onHorizontalDragUpdate: _onDragUpdate,
      onHorizontalDragEnd: _onDragEnd,
      // Close on tap outside when open
      onTap: _isOpen ? _close : null,
      child: AnimatedBuilder(
        animation: _offsetAnim,
        builder: (context, child) {
          return Stack(
            children: [
              // ── Action buttons revealed behind ────────────────────────────
              Positioned.fill(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    // Delete button
                    GestureDetector(
                      onTap: _delete,
                      child: Container(
                        width: _actionWidth,
                        margin: const EdgeInsets.only(bottom: AppSizes.md),
                        decoration: const BoxDecoration(
                          color: AppColors.danger,
                          borderRadius: BorderRadius.only(
                            topRight: Radius.circular(AppSizes.radiusLg),
                            bottomRight: Radius.circular(AppSizes.radiusLg),
                          ),
                        ),
                        child: const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.delete_outline_rounded,
                                color: Colors.white, size: 22),
                            SizedBox(height: 4),
                            Text(
                              'Delete',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Sliding card ──────────────────────────────────────────────
              Transform.translate(
                offset: Offset(_offsetAnim.value, 0),
                child: Container(
                  margin: const EdgeInsets.only(bottom: AppSizes.md),
                  padding: const EdgeInsets.all(AppSizes.sm),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(AppSizes.radiusLg),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(6),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      )
                    ],
                  ),
                  child: Row(
                    children: [
                      // Image
                      ClipRRect(
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusMd),
                        child: Image.network(
                          item.product.image,
                          width: 80,
                          height: 90,
                          fit: BoxFit.cover,
                          loadingBuilder: (_, child, progress) =>
                              progress == null
                                  ? child
                                  : Container(
                                      width: 80,
                                      height: 90,
                                      color: AppColors.shimmerBase),
                          errorBuilder: (_, __, ___) => Container(
                              width: 80,
                              height: 90,
                              color: AppColors.shimmerBase),
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
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: onSurface,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.star_rounded,
                                    size: 12, color: AppColors.warning),
                                const SizedBox(width: 2),
                                Text(
                                  item.product.rating.toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: onSurfaceSec,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '\$${item.product.price.toStringAsFixed(0)}',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: onSurface,
                                  ),
                                ),
                                // Quantity stepper
                                Container(
                                  decoration: BoxDecoration(
                                    color: surfaceVar,
                                    borderRadius: BorderRadius.circular(
                                        AppSizes.radiusFull),
                                    border: Border.all(color: border),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      _StepBtn(
                                        icon: Icons.remove,
                                        activeColor: onSurface,
                                        mutedColor: muted,
                                        onPressed: () =>
                                            context.read<CartBloc>().add(
                                                CartItemQuantityChanged(
                                                    item.product.id,
                                                    item.quantity - 1)),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10),
                                        child: Text(
                                          '${item.quantity}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 14,
                                            color: onSurface,
                                          ),
                                        ),
                                      ),
                                      _StepBtn(
                                        icon: Icons.add,
                                        activeColor: onSurface,
                                        mutedColor: muted,
                                        onPressed:
                                            item.quantity < item.product.stock
                                                ? () => context
                                                    .read<CartBloc>()
                                                    .add(CartItemQuantityChanged(
                                                        item.product.id,
                                                        item.quantity + 1))
                                                : null,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StepBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color activeColor;
  final Color mutedColor;

  const _StepBtn({
    required this.icon,
    required this.activeColor,
    required this.mutedColor,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 30,
        height: 30,
        alignment: Alignment.center,
        child: Icon(
          icon,
          size: 16,
          color: onPressed == null ? mutedColor : activeColor,
        ),
      ),
    );
  }
}
