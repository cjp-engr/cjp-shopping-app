# Edit Saved Address — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an edit action to each saved address on the mobile profile screen and web profile page, backed by a new `PUT /auth/saved-addresses/:id` endpoint.

**Architecture:** New backend endpoint uses `findOneAndUpdate` with the MongoDB positional `$` operator to atomically update a subdocument by `_id`. Mobile adds a pencil button per row that opens a pre-populated bottom sheet; dispatches a new `AuthAddressEditRequested` BLoC event. Web adds a pencil button per row that replaces the row with a pre-populated inline form; wires through a new `updateAddress` function in `AuthContext`.

**Tech Stack:** Node.js/Express/Mongoose (backend), Flutter/BLoC/Dio (mobile), React/TypeScript/AuthContext (web)

## Global Constraints

- Backend route: `PUT /auth/saved-addresses/:id` (protected)
- Backend returns `{ success: true, savedAddresses: updatedUser.savedAddresses }` on success; 404 if user or address not found
- Requires `street` and `city` in the request body; `label`, `state`, `zipCode`, `country` are optional (default empty string); `label` defaults to `'Home'` if empty
- Mobile event class name: `AuthAddressEditRequested` with fields `String id` and `Map<String, dynamic> data`
- Mobile datasource/repository method name: `editSavedAddress(String id, Map<String, dynamic> data)` returning `Future<List<SavedAddressEntity>>`
- Web context function name: `updateAddress(id: string, addr: Omit<SavedAddress, '_id' | 'isDefault'>) => Promise<void>`
- Edit icon: `Icons.edit_outlined` (mobile), `Edit` from lucide-react (already imported in Profile.tsx)
- Only one address in edit mode at a time on web

---

### Task 1: Backend — `updateSavedAddress` handler and route

**Files:**
- Modify: `backend/src/controllers/authController.ts`
- Modify: `backend/src/routes/authRoutes.ts`

**Interfaces:**
- Produces: `PUT /auth/saved-addresses/:id` endpoint consumed by mobile (Task 2) and web (Task 4)

- [ ] **Step 1: Add the `updateSavedAddress` handler to `authController.ts`**

Add this export after the `setDefaultAddress` handler (around line 172):

```typescript
export const updateSavedAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const { label, street, city, state, zipCode, country } = req.body;
    if (!street || !city) {
      return res.status(400).json({ success: false, message: 'street and city are required' });
    }
    const updated = await User.findOneAndUpdate(
      { _id: req.user!.id, 'savedAddresses._id': req.params.id },
      {
        $set: {
          'savedAddresses.$.label': label || 'Home',
          'savedAddresses.$.street': street,
          'savedAddresses.$.city': city,
          'savedAddresses.$.state': state || '',
          'savedAddresses.$.zipCode': zipCode || '',
          'savedAddresses.$.country': country || '',
        },
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'User or address not found' });
    res.json({ success: true, savedAddresses: updated.savedAddresses });
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Register the route in `authRoutes.ts`**

Add `updateSavedAddress` to the import line:

```typescript
import {
  signup, login, getMe, updateProfile, uploadAvatar,
  getPaymentMethods, addPaymentMethod, deletePaymentMethod,
  getSavedAddresses, addSavedAddress, deleteSavedAddress, setDefaultAddress,
  updateSavedAddress,
} from '../controllers/authController.js';
```

Add the route after the existing `router.put('/saved-addresses/:id/default', ...)` line:

```typescript
router.put('/saved-addresses/:id', protect, updateSavedAddress);
```

- [ ] **Step 3: Verify manually**

Start the backend and use a REST client (curl or Postman) with a valid JWT:

```bash
curl -X PUT http://localhost:5000/api/auth/saved-addresses/<VALID_ADDRESS_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"label":"Office","street":"456 Work Ave","city":"Makati","state":"NCR","zipCode":"1229"}'
```

Expected response: `{ success: true, savedAddresses: [...] }` with the address updated.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/authController.ts backend/src/routes/authRoutes.ts
git commit -m "feat(backend): add PUT /auth/saved-addresses/:id to update address fields"
```

---

### Task 2: Mobile data layer — datasource, repository, BLoC event and handler

**Files:**
- Modify: `frontend-mobile/lib/features/auth/data/datasources/auth_remote_datasource.dart`
- Modify: `frontend-mobile/lib/features/auth/domain/repositories/auth_repository.dart`
- Modify: `frontend-mobile/lib/features/auth/data/repositories/auth_repository_impl.dart`
- Modify: `frontend-mobile/lib/features/auth/presentation/bloc/auth_event.dart`
- Modify: `frontend-mobile/lib/features/auth/presentation/bloc/auth_bloc.dart`

**Interfaces:**
- Consumes: `PUT /auth/saved-addresses/:id` from Task 1
- Produces: `AuthAddressEditRequested(String id, Map<String, dynamic> data)` event and `_repository.editSavedAddress(id, data)` consumed by Task 3

- [ ] **Step 1: Add `editSavedAddress` to the datasource**

In `auth_remote_datasource.dart`, add this method after `setDefaultAddress`:

```dart
Future<List<SavedAddressModel>> editSavedAddress(String id, Map<String, dynamic> data) async {
  try {
    final response = await _dio.put('/auth/saved-addresses/$id', data: data);
    final raw = response.data['savedAddresses'] as List;
    return raw.map((a) => SavedAddressModel.fromJson(a as Map<String, dynamic>)).toList();
  } on DioException catch (e) {
    throw mapDioError(e);
  }
}
```

- [ ] **Step 2: Add `editSavedAddress` to the repository interface**

In `auth_repository.dart`, add after the `setDefaultAddress` declaration:

```dart
Future<List<SavedAddressEntity>> editSavedAddress(String id, Map<String, dynamic> data);
```

- [ ] **Step 3: Implement `editSavedAddress` in the repository implementation**

In `auth_repository_impl.dart`, add after the `setDefaultAddress` implementation:

```dart
@override
Future<List<SavedAddressEntity>> editSavedAddress(String id, Map<String, dynamic> data) =>
    _remote.editSavedAddress(id, data);
```

- [ ] **Step 4: Add `AuthAddressEditRequested` event**

In `auth_event.dart`, add after `AuthAddressSetDefaultRequested`:

```dart
final class AuthAddressEditRequested extends AuthEvent {
  final String id;
  final Map<String, dynamic> data;
  AuthAddressEditRequested(this.id, this.data);
  @override
  List<Object?> get props => [id, data];
}
```

- [ ] **Step 5: Add `_onAddressEdit` handler in `auth_bloc.dart`**

Register the event in the constructor, after the `AuthAddressSetDefaultRequested` registration:

```dart
on<AuthAddressEditRequested>(_onAddressEdit);
```

Add the handler method after `_onAddressSetDefault`:

```dart
Future<void> _onAddressEdit(AuthAddressEditRequested event, Emitter<AuthState> emit) async {
  final user = state.user;
  if (user == null) return;
  emit(state.copyWith(status: AuthStatus.loading));
  try {
    final addresses = await _repository.editSavedAddress(event.id, event.data);
    emit(state.copyWith(status: AuthStatus.authenticated, user: user.copyWith(savedAddresses: addresses)));
  } catch (e) {
    emit(state.copyWith(status: AuthStatus.failure, errorMessage: e.toString()));
  }
}
```

- [ ] **Step 6: Verify**

Run `flutter analyze` from the `frontend-mobile` directory (or check that the IDE shows no errors). Confirm all five files have no type errors and the new event is wired to the handler.

- [ ] **Step 7: Commit**

```bash
git add frontend-mobile/lib/features/auth/data/datasources/auth_remote_datasource.dart \
        frontend-mobile/lib/features/auth/domain/repositories/auth_repository.dart \
        frontend-mobile/lib/features/auth/data/repositories/auth_repository_impl.dart \
        frontend-mobile/lib/features/auth/presentation/bloc/auth_event.dart \
        frontend-mobile/lib/features/auth/presentation/bloc/auth_bloc.dart
git commit -m "feat(mobile): add AuthAddressEditRequested event and editSavedAddress data layer"
```

---

### Task 3: Mobile UI — edit button and bottom sheet refactor

**Files:**
- Modify: `frontend-mobile/lib/features/profile/presentation/screens/profile_screen.dart`

**Interfaces:**
- Consumes: `AuthAddressEditRequested(String id, Map<String, dynamic> data)` from Task 2

- [ ] **Step 1: Refactor `_showAddSheet` into `_showAddressSheet({SavedAddressEntity? existing})`**

In `_SavedAddressListState`, rename `_showAddSheet` to `_showAddressSheet` and add the optional `existing` parameter. Replace the entire method body with:

```dart
void _showAddressSheet({SavedAddressEntity? existing}) {
  final isEdit = existing != null;
  _labelCtrl.text = existing?.label ?? 'Home';
  _streetCtrl.text = existing?.street ?? '';
  _cityCtrl.text = existing?.city ?? '';
  _stateCtrl.text = existing?.state ?? '';
  _zipCtrl.text = existing?.zipCode ?? '';

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppSizes.radiusLg)),
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(
        left: AppSizes.md,
        right: AppSizes.md,
        top: AppSizes.md,
        bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSizes.md,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isEdit ? AppStrings.editAddress : AppStrings.addAddress,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Theme.of(ctx).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: AppSizes.sm),
          AppTextField(label: AppStrings.label, controller: _labelCtrl),
          const SizedBox(height: AppSizes.xs),
          AppTextField(
            label: AppStrings.streetAddress,
            controller: _streetCtrl,
            prefixIcon: Icons.home_outlined,
            keyboardType: TextInputType.streetAddress,
          ),
          const SizedBox(height: AppSizes.xs),
          Row(children: [
            Expanded(child: AppTextField(label: AppStrings.city, controller: _cityCtrl)),
            const SizedBox(width: AppSizes.sm),
            Expanded(child: AppTextField(label: AppStrings.state, controller: _stateCtrl)),
          ]),
          const SizedBox(height: AppSizes.xs),
          AppTextField(
            label: AppStrings.zipCode,
            controller: _zipCtrl,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: AppSizes.md),
          BlocBuilder<AuthBloc, AuthState>(
            buildWhen: (p, c) => p.status != c.status,
            builder: (bCtx, s) => AppButton(
              label: AppStrings.saveAddress,
              loading: s.status == AuthStatus.loading,
              onPressed: () {
                if (_streetCtrl.text.trim().isEmpty || _cityCtrl.text.trim().isEmpty) return;
                final payload = {
                  'label': _labelCtrl.text.trim().isNotEmpty ? _labelCtrl.text.trim() : 'Home',
                  'street': _streetCtrl.text.trim(),
                  'city': _cityCtrl.text.trim(),
                  'state': _stateCtrl.text.trim(),
                  'zipCode': _zipCtrl.text.trim(),
                  'country': '',
                };
                if (isEdit) {
                  context.read<AuthBloc>().add(AuthAddressEditRequested(existing.id, payload));
                } else {
                  context.read<AuthBloc>().add(AuthAddressAddRequested(payload));
                }
                Navigator.pop(ctx);
              },
            ),
          ),
        ],
      ),
    ),
  );
}
```

- [ ] **Step 2: Add `AppStrings.editAddress` constant if it does not exist**

Check `frontend-mobile/lib/core/constants/app_strings.dart` for `editAddress`. If it is missing, add:

```dart
static const String editAddress = 'Edit Address';
```

- [ ] **Step 3: Update the "Add Address" footer tap to use the new method name**

Find the `InkWell(onTap: _showAddSheet, ...)` at the bottom of the `build` method and change it to:

```dart
InkWell(onTap: () => _showAddressSheet(), ...)
```

- [ ] **Step 4: Add the edit `IconButton` to each address row**

In the address row `Row` widget (inside `...widget.addresses.asMap().entries.map(...)`), add an edit `IconButton` before the star button. The action buttons section currently starts with the star button (only shown when `!addr.isDefault`). Insert before it:

```dart
IconButton(
  icon: const Icon(Icons.edit_outlined, size: 20, color: AppColors.primary),
  tooltip: AppStrings.editAddress,
  onPressed: () => _showAddressSheet(existing: addr),
  padding: const EdgeInsets.all(6),
  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
),
```

- [ ] **Step 5: Add the `AuthAddressEditRequested` import if needed**

The event is in `auth_event.dart`, which is already imported via `auth_bloc.dart`. If the analyzer shows `AuthAddressEditRequested` as unresolved, add:

```dart
import '../../../auth/presentation/bloc/auth_event.dart';
```

(Check the existing imports at the top of `profile_screen.dart` — if `auth_bloc.dart` re-exports events, no extra import is needed.)

- [ ] **Step 6: Verify manually**

Run the Flutter app. Go to Profile → Saved Addresses. Confirm the pencil icon appears on each address row. Tap it — the bottom sheet opens pre-populated with that address's values. Edit the street and save. Confirm the row updates with the new value.

- [ ] **Step 7: Commit**

```bash
git add frontend-mobile/lib/features/profile/presentation/screens/profile_screen.dart \
        frontend-mobile/lib/core/constants/app_strings.dart
git commit -m "feat(mobile): add edit address button and pre-populated bottom sheet"
```

---

### Task 4: Web — `updateAddress` in `AuthContext` and inline edit in `SavedAddressesCard`

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/pages/Profile.tsx`

**Interfaces:**
- Consumes: `PUT /auth/saved-addresses/:id` from Task 1

- [ ] **Step 1: Add `updateAddress` to the `AuthContext` interface**

In `AuthContext.tsx`, find the context interface (it includes `addAddress`, `deleteAddress`, `setDefaultAddress`). Add:

```typescript
updateAddress: (id: string, addr: Omit<SavedAddress, '_id' | 'isDefault'>) => Promise<void>;
```

- [ ] **Step 2: Implement `updateAddress` in the provider**

In `AuthContext.tsx`, add this function after the `addAddress` implementation:

```typescript
const updateAddress = async (id: string, addr: Omit<SavedAddress, '_id' | 'isDefault'>) => {
  if (!authState.user) throw new Error('No user logged in');
  const res = await fetch(`${API_ENDPOINTS.SAVED_ADDRESSES}/${id}`, {
    method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(addr),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Update failed'); }
  const data = await res.json();
  setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, savedAddresses: data.savedAddresses } : prev.user }));
};
```

- [ ] **Step 3: Expose `updateAddress` in the provider value**

Find the `<AuthContext.Provider value={{ ... }}>` line. Add `updateAddress` to the value object:

```typescript
<AuthContext.Provider value={{ ...authState, login, signup, logout, updateProfile, uploadAvatar, addAddress, updateAddress, deleteAddress, setDefaultAddress }}>
```

- [ ] **Step 4: Add `onUpdate` prop to `SavedAddressesCardProps` in `Profile.tsx`**

Find the `interface SavedAddressesCardProps` block and add:

```typescript
onUpdate: (id: string, addr: Omit<SavedAddress, '_id' | 'isDefault'>) => Promise<void>;
```

Update the component signature to destructure it:

```typescript
const SavedAddressesCard: React.FC<SavedAddressesCardProps> = ({ addresses, onAdd, onDelete, onSetDefault, onUpdate }) => {
```

- [ ] **Step 5: Add `editingId` and `editForm` state to `SavedAddressesCard`**

Inside `SavedAddressesCard`, after the existing state declarations, add:

```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [editForm, setEditForm] = useState({ label: 'Home', street: '', city: '', state: '', zipCode: '' });
const [editSaving, setEditSaving] = useState(false);
const [editError, setEditError] = useState<string | null>(null);
```

- [ ] **Step 6: Add `handleEditSave` function**

After `handleSetDefault`, add:

```typescript
const handleEditSave = async () => {
  if (!editForm.street.trim() || !editForm.city.trim()) {
    setEditError('Street and city are required');
    return;
  }
  if (!editingId) return;
  setEditSaving(true);
  setEditError(null);
  try {
    await onUpdate(editingId, {
      label: editForm.label.trim() || 'Home',
      street: editForm.street.trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim(),
      zipCode: editForm.zipCode.trim(),
      country: '',
    });
    setEditingId(null);
  } catch (err) {
    setEditError(err instanceof Error ? err.message : 'Save failed');
  } finally {
    setEditSaving(false);
  }
};
```

- [ ] **Step 7: Add the edit pencil button to each address row and render the inline form**

In the `{addresses.map(addr => (...))}` block, replace the entire address row JSX with this pattern that toggles between view and edit mode:

```tsx
{addresses.map(addr => (
  <div key={addr._id}>
    {editingId === addr._id ? (
      /* ── Inline edit form ── */
      <div className="border border-primary-300 dark:border-primary-600 rounded-xl p-4 space-y-3 bg-primary-50/30 dark:bg-primary-900/10">
        {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
        <Input label="Label" name="label" value={editForm.label}
          onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
          placeholder="e.g. Home, Office" fullWidth />
        <Input label="Street Address" name="street" value={editForm.street}
          onChange={e => setEditForm(f => ({ ...f, street: e.target.value }))}
          placeholder="123 Main St" fullWidth required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="City" name="city" value={editForm.city}
            onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Manila" fullWidth required />
          <Input label="State/Province" name="state" value={editForm.state}
            onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))}
            placeholder="Metro Manila" fullWidth />
        </div>
        <Input label="ZIP Code" name="zipCode" value={editForm.zipCode}
          onChange={e => setEditForm(f => ({ ...f, zipCode: e.target.value }))}
          placeholder="1000" fullWidth />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setEditError(null); }}>Cancel</Button>
          <Button size="sm" loading={editSaving} onClick={handleEditSave}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    ) : (
      /* ── Address row (view mode) ── */
      <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{addr.label}</span>
            {addr.isDefault && (
              <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">Default</span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {[addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setEditingId(addr._id); setEditForm({ label: addr.label, street: addr.street, city: addr.city, state: addr.state, zipCode: addr.zipCode }); setEditError(null); }}
            title="Edit address"
            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          {!addr.isDefault && (
            <button
              onClick={() => handleSetDefault(addr._id)}
              disabled={settingDefaultId === addr._id}
              title="Set as default"
              className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-40"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDelete(addr._id)}
            disabled={deletingId === addr._id}
            title="Delete address"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
  </div>
))}
```

- [ ] **Step 8: Wire `onUpdate` in `Profile.tsx` where `SavedAddressesCard` is rendered**

Find the `<SavedAddressesCard ... />` usage (around line 381) and add the `onUpdate` prop:

```tsx
<SavedAddressesCard
  addresses={user.savedAddresses ?? []}
  onAdd={addAddress}
  onDelete={deleteAddress}
  onSetDefault={setDefaultAddress}
  onUpdate={updateAddress}
/>
```

Destructure `updateAddress` in the `useAuth()` call at the top of `Profile`:

```typescript
const { user, logout, updateProfile, uploadAvatar, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAuth();
```

- [ ] **Step 9: Verify — run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Verify manually**

Run the web app. Go to Profile → Saved Addresses. Confirm a pencil icon appears on each address row. Tap it — the row is replaced by an inline edit form pre-populated with the address's current values. Edit the label and save. Confirm the row shows updated values. Open edit on one address then click edit on another — confirm the first collapses and the second opens.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/pages/Profile.tsx
git commit -m "feat(web): add inline edit form for saved addresses on profile page"
```
