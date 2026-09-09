# Save Address at Checkout — Design Spec

**Date:** 2026-09-05  
**Scope:** Mobile (Flutter) + Web (React) checkout flows

---

## Problem

When a buyer enters a new delivery address during checkout, there is no way to save it to their profile without going to the profile/address screen separately. The checkout new-address form is ephemeral — the data is used only for the current order.

---

## Goal

Prompt the buyer to save a new address to their profile at the moment they enter it, with zero friction. Saving must never block or fail the order.

---

## UX Design

- A **"Save this address to my profile" checkbox** appears directly below the ZIP Code field.
- The checkbox is visible **only when "New Address" is selected**; it is hidden when a saved address is chosen.
- The checkbox defaults to **unchecked** (opt-in).
- On "Place Order":
  1. Address fields validate as normal.
  2. If the checkbox is checked → `POST /auth/saved-addresses` is called with the entered fields. Errors are swallowed; the order is never blocked by a failed save.
  3. `POST /orders` is called as usual.

---

## Architecture

### Mobile — Flutter (`checkout_screen.dart`)

- Add `bool _saveAddress = false` to `_AddressSectionState`.
- Add a checkbox widget (matching app's existing checkbox style) below the ZIP field, inside the `AnimatedCrossFade` block so it only shows when `_selectedId == 'new'`.
- Expose a `saveAddress` getter on the state/widget so `CheckoutScreen._submit` can read the value.
- In `CheckoutScreen._submit`, before dispatching `OrderCreateRequested`:
  ```dart
  if (_addressKey.currentState?.selectedId == 'new' &&
      _addressKey.currentState?.saveAddress == true) {
    context.read<AuthBloc>().add(AuthAddressAddRequested({
      'street': _streetCtrl.text.trim(),
      'city': _cityCtrl.text.trim(),
      'state': _stateCtrl.text.trim(),
      'zipCode': _zipCtrl.text.trim(),
      'country': 'PH',
    }));
  }
  ```
- Reuses the existing `AuthAddressAddRequested` event — no new BLoC events needed.
- The `AuthBloc` dispatches the save asynchronously; the order dispatch is not gated on its result.

### Web — React (`Checkout.tsx`)

- Add `const [saveAddress, setSaveAddress] = useState(false)` to local state.
- Render a checkbox + label below the ZIP field, conditionally when `selectedAddressId === 'new'`.
- Reset `saveAddress` to `false` whenever `selectedAddressId` changes away from `'new'`.
- In `handlePlaceOrder`, before `orderService.createOrder(...)`:
  ```ts
  if (selectedAddressId === 'new' && saveAddress) {
    try {
      await addAddress(shippingData);
    } catch {
      // non-blocking — order proceeds regardless
    }
  }
  ```
- `addAddress` comes from `AuthContext` (already exists, calls `POST /auth/saved-addresses`).

---

## What Does NOT Change

- Backend order endpoint — no changes.
- API endpoints — no new endpoints; reuses `POST /auth/saved-addresses`.
- BLoC events — no new events.
- Existing saved-address selection behaviour — unchanged.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Address save succeeds | Address added to profile; order placed normally |
| Address save fails (network, validation) | Error swallowed; order placed normally; address not saved |
| Checkbox unchecked | Address save skipped entirely; order placed normally |
| Saved address selected | Checkbox hidden; no save attempted |

---

## Files to Change

| File | Change |
|---|---|
| `frontend-mobile/lib/features/orders/presentation/screens/checkout_screen.dart` | Add `_saveAddress` state, checkbox widget, pre-submit save call |
| `frontend/src/pages/Checkout.tsx` | Add `saveAddress` state, checkbox, pre-submit save call |
