import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';

/// A StatefulWidget form for capturing new card details.
///
/// Displays CardFormField from flutter_stripe for entering card number, expiry, and CVC.
/// Includes a checkbox to optionally save the card and a button to create a PaymentMethod.
///
/// The widget communicates with its parent via callbacks:
/// - [onCardCreated]: Called when PaymentMethod is successfully created
/// - [onSaveCardToggle]: Called when the save card checkbox is toggled
class CardFormWidget extends StatefulWidget {
  /// Callback when card is successfully created.
  /// Parameters:
  ///   - paymentMethodId: String (e.g., "pm_...")
  ///   - paymentMethod: Dynamic object with id, card details, etc.
  final Function(String paymentMethodId, dynamic paymentMethod) onCardCreated;

  /// Callback when save card checkbox is toggled.
  final VoidCallback onSaveCardToggle;

  /// Current state of the "Save card" checkbox.
  final bool shouldSaveCard;

  /// Whether form is in loading state (button/form disabled).
  final bool isLoading;

  const CardFormWidget({
    Key? key,
    required this.onCardCreated,
    required this.onSaveCardToggle,
    required this.shouldSaveCard,
    required this.isLoading,
  }) : super(key: key);

  @override
  State<CardFormWidget> createState() => _CardFormWidgetState();
}

class _CardFormWidgetState extends State<CardFormWidget> {
  /// Create a PaymentMethod from the card details.
  Future<void> _createPaymentMethod() async {
    try {
      // ignore: avoid_print
      print('Creating payment method...');
      // Create PaymentMethod using Stripe with card form data
      // CardFormField manages validation internally
      final paymentMethod = await Stripe.instance.createPaymentMethod(
        params: const PaymentMethodParams.card(
          paymentMethodData: PaymentMethodData(),
        ),
      );

      // ignore: avoid_print
      print('Payment method created: ${paymentMethod.id}');
      // Call parent callback with paymentMethodId and full paymentMethod object
      widget.onCardCreated(paymentMethod.id, paymentMethod);

      // Optional: Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment method created successfully'),
            duration: Duration(seconds: 2),
            backgroundColor: Colors.green,
          ),
        );
      }
    } on StripeException catch (e) {
      // ignore: avoid_print
      print('StripeException creating payment method: ${e.error.code} - ${e.error.message}');
      final errorCode = (e.error.code.toString());
      final errorMessage = StripeErrorMessages.getErrorMessage(errorCode);
      _showErrorSnackBar(errorMessage);
    } catch (e) {
      // ignore: avoid_print
      print('ERROR creating payment method: $e');
      _showErrorSnackBar(
        StripeErrorMessages.getErrorMessage('unknown_error'),
      );
    }
  }

  /// Display an error message in a SnackBar.
  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // CardFormField for entering card details
        // Manages its own validation state
        CardFormField(
          style: CardFormStyle(
            backgroundColor: Colors.grey[50],
            borderColor: Colors.grey[300],
            borderRadius: 8,
            fontSize: 16,
            cursorColor: Colors.blue,
          ),
        ),
        const SizedBox(height: 16),

        // Checkbox to save card for future use
        CheckboxListTile(
          value: widget.shouldSaveCard,
          onChanged: widget.isLoading
              ? null
              : (value) {
                  widget.onSaveCardToggle();
                },
          title: const Text('Save this card for next time'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
        ),
        const SizedBox(height: 16),

        // Button to create PaymentMethod
        ElevatedButton(
          onPressed: widget.isLoading ? null : _createPaymentMethod,
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(double.infinity, 50),
            disabledBackgroundColor: Colors.grey[300],
          ),
          child: widget.isLoading
              ? const SizedBox(
                  height: 24,
                  width: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Text('Create Payment Method'),
        ),
      ],
    );
  }
}
