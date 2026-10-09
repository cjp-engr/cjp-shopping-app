import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
// Only PaymentMethod is needed; flutter_stripe also exports a `Card` that
// would clash with Material's Card.
import 'package:flutter_stripe/flutter_stripe.dart' show PaymentMethod;
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';
import 'package:toko_mart/features/checkout/widgets/card_form.dart';
import 'package:toko_mart/features/checkout/widgets/saved_cards_list.dart';

/// Payment step of checkout: "New Card" / "Saved Cards" tabs, an order
/// summary and a "Place Order" button.
///
/// Requires a [PaymentBloc] to be provided above this widget.
///
/// Flow on "Place Order":
///  1. The active tab's payment method id is registered with [PaymentBloc]
///     (new card: created earlier by [CardFormWidget] via `onCardCreated`;
///     saved card: chosen in [SavedCardsListWidget]).
///  2. [CreatePaymentIntent] creates the intent on the backend.
///  3. On [PaymentIntentCreated] the screen dispatches [ConfirmPayment].
///  4. On [PaymentSucceeded] the optional card save runs and
///     [onPaymentSuccess] is invoked; the caller navigates to the
///     order confirmation screen.
class PaymentScreen extends StatefulWidget {
  final int amountInCents;
  final List<dynamic> cartItems;
  final void Function(String paymentIntentId, String? paymentMethodId)
      onPaymentSuccess;
  final VoidCallback onBack;

  const PaymentScreen({
    super.key,
    required this.amountInCents,
    required this.cartItems,
    required this.onPaymentSuccess,
    required this.onBack,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  static const int _newCardTab = 0;

  int _currentTabIndex = _newCardTab;

  // New card tab
  String? _newCardMethodId;
  PaymentMethod? _newCardMethod;
  bool _shouldSaveCard = false;
  final _cardFormKey = GlobalKey<State<CardFormWidget>>();

  // Saved cards tab. Cached here because PaymentBloc replaces its state while
  // paying, which would otherwise make the list disappear.
  List<SavedPaymentMethod> _savedMethods = const [];
  SavedPaymentMethod? _selectedSavedMethod;
  bool _savedMethodsFailed = false;

  // Guards against double navigation if PaymentSucceeded is re-delivered.
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    context.read<PaymentBloc>().add(const LoadSavedPaymentMethods());
  }

  bool get _isNewCardTab => _currentTabIndex == _newCardTab;

  String? get _activeMethodId =>
      _isNewCardTab ? _newCardMethodId : _selectedSavedMethod?.id;

  bool get _canPlaceOrder {
    // For new card: button is enabled so user can create method on click
    // For saved cards: button is enabled only if a card is selected
    if (_isNewCardTab) return true;
    return _activeMethodId != null;
  }

  void _onCardCreated(String paymentMethodId, dynamic paymentMethod) {
    setState(() {
      _newCardMethodId = paymentMethodId;
      _newCardMethod = paymentMethod is PaymentMethod ? paymentMethod : null;
    });
  }

  void _onSaveCardToggle() {
    setState(() => _shouldSaveCard = !_shouldSaveCard);
  }

  void _onCardSelected(SavedPaymentMethod method) {
    setState(() => _selectedSavedMethod = method);
  }

  Future<void> _handlePlaceOrder() async {
    final bloc = context.read<PaymentBloc>();

    // For new card tab, create payment method first if not already created
    if (_isNewCardTab && _newCardMethodId == null) {
      final cardFormState = _cardFormKey.currentState;
      if (cardFormState == null) {
        _showSnackBar('Card form error. Please try again.', Colors.red);
        return;
      }

      // Cast to access createPaymentMethod - State<CardFormWidget> is the generic type
      // but we know it's _CardFormWidgetState which has createPaymentMethod
      try {
        // Access the method dynamically
        final method = cardFormState.runtimeType.toString();
        // ignore: avoid_print
        print('Card form state type: $method');

        // Call createPaymentMethod via dynamic dispatch
        final result = await (cardFormState as dynamic).createPaymentMethod();
        if (!result || _newCardMethodId == null) {
          // Error already shown in snackbar by CardFormWidget
          return;
        }
      } catch (e) {
        // ignore: avoid_print
        print('Error creating payment method: $e');
        _showSnackBar('Failed to create payment method. Please try again.', Colors.red);
        return;
      }
    }

    final methodId = _activeMethodId;
    if (methodId == null) {
      _showSnackBar('Please select a payment method.', Colors.red);
      return;
    }

    // PaymentBloc needs the method id (and save flag) registered before the
    // intent is created. SelectSavedPaymentMethod resets the save flag, so
    // the flag is set afterwards for new cards.
    if (_isNewCardTab) {
      final card = _newCardMethod?.card;
      bloc.add(SelectSavedPaymentMethod(
        paymentMethodId: methodId,
        brand: card?.brand ?? '',
        last4: card?.last4 ?? '',
      ));
      bloc.add(SetSaveCardFlag(_shouldSaveCard));
    } else {
      final method = _selectedSavedMethod!;
      if (method.stripePaymentMethodId == null || method.stripePaymentMethodId!.isEmpty) {
        _showSnackBar('This card is no longer valid. Please add a new card.', Colors.red);
        return;
      }
      bloc.add(SelectSavedPaymentMethod(
        paymentMethodId: method.stripePaymentMethodId!,
        brand: method.brand,
        last4: method.last4,
      ));
    }
    bloc.add(CreatePaymentIntent(widget.amountInCents));
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: color,
          duration: const Duration(seconds: 4),
        ),
      );
  }

  void _onPaymentStateChanged(BuildContext context, PaymentState state) {
    if (state is PaymentMethodsLoaded) {
      setState(() {
        // Only overwrite cache on a genuine load (selectedMethod == null means fresh load, not a retry)
        if (state.selectedMethod == null) {
          _savedMethods = state.savedMethods;
        }
        _savedMethodsFailed = false;
        // Only adopt selections that exist in the saved list; a new-card
        // selection also emits PaymentMethodsLoaded.
        final selected = state.selectedMethod;
        if (selected != null &&
            state.savedMethods.any((m) => m.id == selected.id)) {
          _selectedSavedMethod = selected;
        }
      });
    } else if (state is PaymentIntentCreated) {
      context.read<PaymentBloc>().add(ConfirmPayment(state.clientSecret));
    } else if (state is PaymentSucceeded) {
      if (_completed) return;
      _completed = true;
      final card = _newCardMethod?.card;
      if (_isNewCardTab && _shouldSaveCard && _newCardMethodId != null) {
        context.read<PaymentBloc>().add(SaveNewCard(
              paymentMethodId: _newCardMethodId!,
              brand: card?.brand ?? 'unknown',
              last4: card?.last4 ?? '',
              expiryMonth: card?.expMonth ?? 0,
              expiryYear: card?.expYear ?? 0,
            ));
      }
      // Only offer to save later when a new card was used and the user did
      // not already opt in to saving it on this screen.
      widget.onPaymentSuccess(
        state.paymentIntentId,
        _isNewCardTab && !_shouldSaveCard ? _newCardMethodId : null,
      );
    } else if (state is PaymentFailed) {
      if (state.errorMessage == StripeErrorMessages.savedCardsFetchFailed) {
        setState(() => _savedMethodsFailed = true);
      }
      _showSnackBar(state.errorMessage, Colors.red);
    } else if (state is CardSaveFailed) {
      _showSnackBar(state.message, Colors.orange);
    } else if (state is PaymentCancelled) {
      _showSnackBar('Payment cancelled. Please try again.', Colors.orange);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<PaymentBloc, PaymentState>(
      listener: _onPaymentStateChanged,
      child: Scaffold(
        appBar: AppBar(
          title: const Text(
            'Payment Details',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
            ),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: widget.onBack,
            tooltip: 'Go back',
          ),
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
        ),
        backgroundColor: Colors.grey[50],
        body: BlocBuilder<PaymentBloc, PaymentState>(
          builder: (context, state) {
            final isLoading = state is CreatingPaymentIntent ||
                state is ConfirmingPayment ||
                state is SavingCard;

            return SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildOrderSummary(context),
                    const SizedBox(height: 48),
                    _buildPaymentMethodSection(context, state, isLoading),
                    const SizedBox(height: 48),
                    _buildPlaceOrderButton(isLoading),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildPaymentMethodSection(
    BuildContext context,
    PaymentState state,
    bool isLoading,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Payment Method',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: _buildTabButton(
                        'New Card',
                        _isNewCardTab,
                        () => setState(() => _currentTabIndex = 0),
                      ),
                    ),
                    Expanded(
                      child: _buildTabButton(
                        'Saved Cards',
                        !_isNewCardTab,
                        () => setState(() => _currentTabIndex = 1),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(20),
                child: _buildTabContent(context, state, isLoading),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTabButton(String label, bool isActive, VoidCallback onTap) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  color: isActive ? const Color(0xFFD97706) : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              if (isActive)
                Container(
                  height: 3,
                  width: 24,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD97706),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceOrderButton(bool isLoading) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: FilledButton(
        onPressed: (_canPlaceOrder && !isLoading) ? _handlePlaceOrder : null,
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFFD97706),
          disabledBackgroundColor: Colors.grey[300],
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 2,
        ),
        child: isLoading
            ? SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Colors.grey[700]!,
                  ),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Place Order',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.arrow_forward_rounded,
                    size: 18,
                    color: Colors.grey[50],
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildOrderSummary(BuildContext context) {
    final total = widget.amountInCents / 100;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Summary',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 16,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  'Total Amount',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFD97706),
                    fontSize: 24,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              height: 1,
              color: Colors.grey[200],
            ),
            const SizedBox(height: 12),
            Text(
              '${widget.cartItems.length} item${widget.cartItems.length != 1 ? 's' : ''}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabContent(
    BuildContext context,
    PaymentState state,
    bool isLoading,
  ) {
    if (_isNewCardTab) {
      return CardFormWidget(
        key: _cardFormKey,
        onCardCreated: _onCardCreated,
        onSaveCardToggle: _onSaveCardToggle,
        shouldSaveCard: _shouldSaveCard,
        isLoading: isLoading,
      );
    }

    if (state is LoadingSavedPaymentMethods) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_savedMethodsFailed) {
      return Center(
        child: Text(
          'Failed to load saved cards. Please use a new card.',
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      );
    }

    return SavedCardsListWidget(
      savedMethods: _savedMethods,
      selectedMethod: _selectedSavedMethod,
      onCardSelected: _onCardSelected,
      isLoading: isLoading,
    );
  }
}
