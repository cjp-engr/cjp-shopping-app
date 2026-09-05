# Save Address at Checkout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a buyer enters a new address during checkout, show a "Save this address to my profile" checkbox; if checked, save the address before placing the order.

**Architecture:** Checkbox is added inline below the ZIP field on both platforms, defaulting to unchecked. On "Place Order", if the checkbox is checked and a new address is entered, `POST /auth/saved-addresses` is called first (errors swallowed), then the order is placed normally. No backend changes required.

**Tech Stack:** Flutter (BLoC, StatefulWidget), React (useState, useAuth context)

## Global Constraints

- Checkbox is hidden when a saved address is selected — only visible in "new address" mode
- Default state: unchecked (opt-in)
- Save failure must never block order placement
- Reuse existing `AuthAddressAddRequested` bloc event (mobile) and `addAddress` from `useAuth()` (web)
- Country hardcoded to `'PH'` on both platforms (matches existing order payload)

---

### Task 1: Mobile — add save-address checkbox to `_AddressSection`

**Files:**
- Modify: `frontend-mobile/lib/features/orders/presentation/screens/checkout_screen.dart`

**Interfaces:**
- Produces: `_AddressSectionState.saveAddress` (bool getter), `_AddressSectionState.selectedId` (String getter), used by `_CheckoutScreenState._submit`

- [ ] **Step 1: Add a `GlobalKey` for `_AddressSection` in `_CheckoutScreenState`**

In `_CheckoutScreenState`, add this field alongside `_paymentSectionKey`:

```dart
final _addressSectionKey = GlobalKey<_AddressSectionState>();
```

- [ ] **Step 2: Pass the key when rendering `_AddressSection`**

Find the `_AddressSection(...)` constructor call inside the `BlocBuilder` (around line 331). Add `key: _addressSectionKey`:

```dart
builder: (_, authState) => _AddressSection(
  key: _addressSectionKey,
  savedAddresses: authState.user?.savedAddresses ?? const [],
  streetCtrl: _streetCtrl,
  cityCtrl: _cityCtrl,
  stateCtrl: _stateCtrl,
  zipCtrl: _zipCtrl,
),
```

- [ ] **Step 3: Add `_saveAddress` state and public getters to `_AddressSectionState`**

In `_AddressSectionState`, add after `late String _selectedId;`:

```dart
bool _saveAddress = false;

bool get saveAddress => _saveAddress;
String get selectedId => _selectedId;
```

- [ ] **Step 4: Add the checkbox widget below the ZIP field**

Inside the `AnimatedCrossFade.secondChild` → `Column.children`, after the ZIP `AppTextField` and its `SizedBox(height: 10)` pair (the ZIP field is the last field, around line 638–646), add:

```dart
const SizedBox(height: 12),
Material(
  color: Colors.transparent,
  child: InkWell(
    onTap: () => setState(() => _saveAddress = !_saveAddress),
    borderRadius: BorderRadius.circular(8),
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: _saveAddress ? AppColors.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(5),
              border: Border.all(
                color: _saveAddress ? AppColors.primary : Colors.grey.shade400,
                width: 1.5,
              ),
            ),
            child: _saveAddress
                ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                : null,
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Save this address to my profile',
              style: TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    ),
  ),
),
```

- [ ] **Step 5: Reset `_saveAddress` when switching away from "new address"**

In `_AddressSectionState`, find the `onTap` callback on the saved-address tiles (around line 567–569). After `setState(() => _selectedId = addr.id)`, reset the flag:

```dart
onTap: () {
  setState(() {
    _selectedId = addr.id;
    _saveAddress = false;
  });
  _fillFromAddress(addr);
},
```

- [ ] **Step 6: Call the address save in `_submit` before placing the order**

In `_CheckoutScreenState._submit`, after `_paymentSectionKey.currentState?._maybeSaveCard();` (line 148) and before `final user = ...`, add:

```dart
// Save new address to profile if user opted in
if (_addressSectionKey.currentState?.selectedId == 'new' &&
    _addressSectionKey.currentState?.saveAddress == true) {
  context.read<AuthBloc>().add(AuthAddressAddRequested({
    'street': _streetCtrl.text.trim(),
    'city': _cityCtrl.text.trim(),
    'state': _stateCtrl.text.trim(),
    'zipCode': _zipCtrl.text.trim(),
    'country': 'PH',
  }));
}
```

- [ ] **Step 7: Verify manually**

Run the Flutter app. Go to Checkout → select "New Address" → fill in the four fields. Confirm the checkbox appears below ZIP Code, defaults to unchecked. Check it, place order. Go to Profile → Saved Addresses. Confirm the address was added. Place another order with "New Address" but leave checkbox unchecked — confirm no new address is saved.

- [ ] **Step 8: Commit**

```bash
git add frontend-mobile/lib/features/orders/presentation/screens/checkout_screen.dart
git commit -m "feat(mobile): add save-address checkbox to checkout new address form"
```

---

### Task 2: Web — add save-address checkbox to Checkout page

**Files:**
- Modify: `frontend/src/pages/Checkout.tsx`

**Interfaces:**
- Consumes: `addAddress` from `useAuth()` — signature: `(addr: Omit<SavedAddress, '_id' | 'isDefault'> & { setAsDefault?: boolean }) => Promise<void>`

- [ ] **Step 1: Destructure `addAddress` from `useAuth()`**

Find the `useAuth()` call near the top of the component (it currently destructures `user`, `login`, etc.). Add `addAddress`:

```tsx
const { user, login, logout, addAddress } = useAuth();
```

- [ ] **Step 2: Add `saveAddress` state**

After the existing `const [saveCard, setSaveCard] = useState(false);` line (around line 82), add:

```tsx
const [saveAddress, setSaveAddress] = useState(false);
```

- [ ] **Step 3: Reset `saveAddress` when switching away from "new address"**

Find the two `onClick` handlers that call `setSelectedAddressId(...)`. In the saved-address tile onClick (around line 464–469), add `setSaveAddress(false)` after `setSelectedAddressId(addr._id)`:

```tsx
onClick={() => {
  setSelectedAddressId(addr._id);
  setShippingData(prev => ({ ...prev, street: addr.street, city: addr.city, state: addr.state, zipCode: addr.zipCode, country: addr.country }));
  setShippingErrors({});
  setSaveAddress(false);
}}
```

- [ ] **Step 4: Add the checkbox below the address fields block**

The address fields are wrapped in `{selectedAddressId === 'new' && (<> ... </>)}` (closing around line 556). Add the checkbox inside that block, after the last `</div>` (the ZIP/grid row closing tag), before the closing `</>`:

```tsx
{/* Save address checkbox */}
<label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 mt-3">
  <input
    type="checkbox"
    checked={saveAddress}
    onChange={e => setSaveAddress(e.target.checked)}
    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
  />
  Save this address to my profile
</label>
```

- [ ] **Step 5: Call `addAddress` before placing the order in `handlePlaceOrder`**

In `handlePlaceOrder` (around line 315), after `if (!user) return;` and before `try {`, add:

```tsx
// Save new address to profile if user opted in
if (selectedAddressId === 'new' && saveAddress) {
  try {
    await addAddress({
      label: 'Home',
      street: shippingData.street,
      city: shippingData.city,
      state: shippingData.state,
      zipCode: shippingData.zipCode,
      country: shippingData.country || 'PH',
    });
  } catch {
    // non-blocking — order proceeds regardless
  }
}
```

- [ ] **Step 6: Verify manually**

Run the web app. Go to Checkout → select "New Address" → fill in all address fields. Confirm the "Save this address to my profile" checkbox appears below the ZIP field, defaults to unchecked. Check it, complete the order. Go to Profile → Saved Addresses. Confirm the address was saved. Place another order with "New Address" but leave checkbox unchecked — confirm no new address is saved.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Checkout.tsx
git commit -m "feat(web): add save-address checkbox to checkout new address form"
```
