/// Card checkout flow. Must match the backend's `CHECKOUT_FLOW`.
///
/// Set at build time: `flutter run --dart-define=CHECKOUT_FLOW=manual_capture`.
/// Off by default: card checkout uses the legacy one-step charge. Cash on delivery is unaffected.
const bool kCardCheckoutUsesSessions =
    String.fromEnvironment('CHECKOUT_FLOW', defaultValue: 'legacy') == 'manual_capture';
