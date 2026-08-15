import 'package:flutter/rendering.dart';
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import 'module.dart';

final class Checkout extends Module {
  Checkout(super.$);

  Future<void> proceedToCheckout() async {
    await $(keys.cart.checkoutButton).tap();
  }

  Future<void> fillShippingAddress({
    String street = '123 Test Street',
    String city = 'Manila',
    String state = 'Metro Manila',
    String zip = '1000',
  }) async {
    await $(keys.orders.checkoutStreetField).enterText(street);
    await $(keys.orders.checkoutCityField).enterText(city);
    await $(keys.orders.checkoutStateField).enterText(state);
    await $(keys.orders.checkoutZipField).enterText(zip);
  }

  Future<void> selectCOD() async {
    await $(keys.orders.paymentOption('cash-on-delivery'))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
  }

  Future<void> selectCreditCard() async {
    await $(keys.orders.paymentOption('credit-card'))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
  }

  Future<void> switchToNewCardIfNeeded() async {
    if ($(keys.orders.paymentNewCardTab).exists) {
      await $(keys.orders.paymentNewCardTab)
          .scrollTo(scrollDirection: AxisDirection.down)
          .tap();
    }
  }

  Future<void> fillNewCard({
    required String cardNumber,
    required String cardHolder,
  }) async {
    await $(keys.orders.checkoutCardNumberField)
        .scrollTo(scrollDirection: AxisDirection.down)
        .enterText(cardNumber);
    await $(keys.orders.checkoutCardHolderField)
        .scrollTo(scrollDirection: AxisDirection.down)
        .enterText(cardHolder);
  }

  Future<void> placeOrder() async {
    await $(keys.orders.placeOrderButton)
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
  }

  Future<void> expectOrdersScreen() async {
    await $(keys.orders.ordersScreen).waitUntilVisible();
  }
}
