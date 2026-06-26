import 'dart:developer' as dev;
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_sizes.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/theme_colors.dart';

class ReviewBottomSheet extends StatefulWidget {
  final String productId;
  final String orderId;
  final String productName;
  final String productImage;
  final Future<void> Function() onSubmitted;

  // Edit mode — pass existing review data to pre-fill the form
  final String? reviewId;
  final int? initialRating;
  final String? initialComment;

  const ReviewBottomSheet({
    super.key,
    required this.productId,
    required this.orderId,
    required this.productName,
    required this.productImage,
    required this.onSubmitted,
    this.reviewId,
    this.initialRating,
    this.initialComment,
  });

  bool get isEditing => reviewId != null;

  static Future<void> show(
    BuildContext context, {
    required String productId,
    required String orderId,
    required String productName,
    required String productImage,
    required Future<void> Function() onSubmitted,
    String? reviewId,
    int? initialRating,
    String? initialComment,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReviewBottomSheet(
        productId: productId,
        orderId: orderId,
        productName: productName,
        productImage: productImage,
        onSubmitted: onSubmitted,
        reviewId: reviewId,
        initialRating: initialRating,
        initialComment: initialComment,
      ),
    );
  }

  @override
  State<ReviewBottomSheet> createState() => _ReviewBottomSheetState();
}

class _ReviewBottomSheetState extends State<ReviewBottomSheet> {
  static const _starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  late int _rating;
  late final TextEditingController _commentCtrl;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _rating = widget.initialRating ?? 0;
    _commentCtrl = TextEditingController(text: widget.initialComment ?? '');
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      setState(() => _error = 'Please select a star rating.');
      return;
    }
    if (_commentCtrl.text.trim().length < 5) {
      setState(() => _error = 'Comment must be at least 5 characters.');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      final client = await ApiClient.get();

      if (widget.isEditing) {
        await client.dio.put('/reviews/${widget.reviewId}', data: {
          'rating': _rating,
          'comment': _commentCtrl.text.trim(),
        });
      } else {
        await client.dio.post('/reviews', data: {
          'productId': widget.productId,
          'orderId': widget.orderId,
          'rating': _rating,
          'comment': _commentCtrl.text.trim(),
        });
      }

      // Await the caller's refresh before closing so state is up-to-date.
      await widget.onSubmitted();

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.isEditing
                ? 'Review updated successfully.'
                : 'Review submitted! Thank you.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } on DioException catch (e) {
      setState(() { _loading = false; _error = mapDioError(e); });
    } catch (e, st) {
      dev.log('Review submit failed', error: e, stackTrace: st);
      setState(() { _loading = false; _error = 'Failed to submit review. Please try again.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppSizes.radiusXl)),
      ),
      padding: EdgeInsets.fromLTRB(
          AppSizes.lg, AppSizes.md, AppSizes.lg, AppSizes.lg + bottomPad),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: context.borderColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: AppSizes.md),

          // Title + close
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                widget.isEditing ? 'Edit Review' : 'Write a Review',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: context.onSurfaceColor),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
                color: context.onSurfaceSecondary,
              ),
            ],
          ),
          const SizedBox(height: AppSizes.sm),

          // Product row
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                child: widget.productImage.isNotEmpty
                    ? Image.network(widget.productImage,
                        width: 52, height: 52, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder())
                    : _placeholder(),
              ),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                child: Text(
                  widget.productName,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: context.onSurfaceColor),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSizes.lg),

          // Stars
          Text('Your Rating',
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: context.onSurfaceColor)),
          const SizedBox(height: AppSizes.sm),
          Row(
            children: [
              ...List.generate(5, (i) {
                final star = i + 1;
                return GestureDetector(
                  onTap: () => setState(() => _rating = star),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Icon(
                      star <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                      size: 36,
                      color: star <= _rating ? AppColors.warning : context.borderColor,
                    ),
                  ),
                );
              }),
              if (_rating > 0) ...[
                const SizedBox(width: 8),
                Text(
                  _starLabels[_rating],
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.warning),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppSizes.lg),

          // Comment
          Text('Your Review',
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: context.onSurfaceColor)),
          const SizedBox(height: AppSizes.sm),
          TextField(
            controller: _commentCtrl,
            maxLines: 4,
            maxLength: 1000,
            keyboardType: TextInputType.multiline,
            textInputAction: TextInputAction.newline,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Share your experience with this product...',
              hintStyle: TextStyle(color: context.onSurfaceMuted, fontSize: 13),
              filled: true,
              fillColor: context.surfaceVariantColor,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.all(12),
              counterStyle: TextStyle(color: context.onSurfaceMuted, fontSize: 11),
            ),
          ),

          if (_error != null) ...[
            const SizedBox(height: AppSizes.sm),
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSizes.md, vertical: AppSizes.sm),
              decoration: BoxDecoration(
                color: AppColors.danger.withAlpha(20),
                borderRadius: BorderRadius.circular(AppSizes.radiusMd),
              ),
              child: Text(_error!,
                  style: const TextStyle(color: AppColors.danger, fontSize: 13)),
            ),
          ],

          const SizedBox(height: AppSizes.lg),

          // Submit
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          widget.isEditing ? Icons.edit_rounded : Icons.send_rounded,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          widget.isEditing ? 'Update Review' : 'Submit Review',
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() => Container(
        width: 52,
        height: 52,
        color: AppColors.primary.withAlpha(20),
        child: const Icon(Icons.image_outlined, color: AppColors.primary),
      );
}
