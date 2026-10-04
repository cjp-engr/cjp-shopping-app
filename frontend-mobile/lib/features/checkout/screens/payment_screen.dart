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
  final void Function(String paymentIntentId) onPaymentSuccess;
  final VoidCallback onBack;

  const PaymentScreen({
    Key? key,
    required this.amountInCents,
    required this.cartItems,
    required this.onPaymentSuccess,
    required this.onBack,
  }) : super(key: key);

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

  void _handlePlaceOrder() {
    final methodId = _activeMethodId;
    if (methodId == null) return;
    final bloc = context.read<PaymentBloc>();

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
      bloc.add(SelectSavedPaymentMethod(
        paymentMethodId: method.id,
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
      widget.onPaymentSuccess(state.paymentIntentId);
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
          title: const Text('Payment'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: widget.onBack,
          ),
        ),
        body: BlocBuilder<PaymentBloc, PaymentState>(
          builder: (context, state) {
            final isLoading = state is CreatingPaymentIntent ||
                state is ConfirmingPayment ||
                state is SavingCard;
            final canPlaceOrder = _activeMethodId != null && !isLoading;

            return SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildOrderSummary(context),
                    const SizedBox(height: 24),
                    DefaultTabController(
                      length: 2,
                      child: Column(
                        children: [
                          TabBar(
                            onTap: (index) =>
                                setState(() => _currentTabIndex = index),
                            tabs: const [
                              Tab(text: 'New Card'),
                              Tab(text: 'Saved Cards'),
                            ],
                          ),
                          const SizedBox(height: 16),
                          _buildTabContent(context, state, isLoading),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: canPlaceOrder ? _handlePlaceOrder : null,
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 50),
                      ),
                      child: isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text(
                              'Place Order',
                              style: TextStyle(fontSize: 16),
                            ),
                    ),
                    if (_isNewCardTab && _newCardMethodId == null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Enter your card and tap "Create Payment Method" first.',
                          style: Theme.of(context).textTheme.bodySmall,
                          textAlign: TextAlign.center,
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildOrderSummary(BuildContext context) {
    final total = widget.amountInCents / 100;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Summary',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total:', style: Theme.of(context).textTheme.bodyMedium),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${widget.cartItems.length} item(s)',
              style: Theme.of(context).textTheme.bodySmall,
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
