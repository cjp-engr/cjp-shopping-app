# Edit Saved Address — Design Spec

**Date:** 2026-09-05  
**Scope:** Backend (Node/Express) + Mobile (Flutter) + Web (React)

---

## Problem

Users can add and delete saved addresses on their profile, but cannot edit them. To change an address they must delete it and re-add it, which is poor UX.

---

## Goal

Add an edit action to each saved address on the mobile profile screen and the web profile page, using the same UI pattern as the existing add form.

---

## UX Design

**Mobile:** A pencil icon button (`Icons.edit_outlined`) is added to each address row alongside the existing star and delete buttons. Tapping it opens a bottom sheet pre-populated with the address's current `label`, `street`, `city`, `state`, and `zipCode`. On save the address is updated in place.

**Web:** A pencil icon button is added per address row. Tapping it replaces that row with an inline form pre-populated with the current values (same fields as "Add Address"). Saving collapses the form back to the row view with updated values. Only one address can be in edit mode at a time — opening a second edit closes the first.

---

## Architecture

### Backend — `authController.ts` + `authRoutes.ts`

New handler `updateSavedAddress`:
- Accepts `PUT /auth/saved-addresses/:id` (protected route)
- Requires `street` and `city` in the body; `label`, `state`, `zipCode`, `country` are optional with defaults
- Uses `findOneAndUpdate` with `$set` on the matching subdocument array element (positional `$` operator) — atomic, consistent with the `addSavedAddress` fix
- Returns `{ success: true, savedAddresses: updatedUser.savedAddresses }`
- Returns 404 if user not found or address `_id` not matched

New route registered in `authRoutes.ts`:
```
router.put('/saved-addresses/:id', protect, updateSavedAddress)
```

### Mobile — Flutter

**New BLoC event:** `AuthAddressEditRequested` in `auth_event.dart`:
```dart
class AuthAddressEditRequested extends AuthEvent {
  final String id;
  final Map<String, dynamic> data;
  const AuthAddressEditRequested(this.id, this.data);
}
```

**New BLoC handler** `_onAddressEdit` in `auth_bloc.dart`:
- Calls `_repository.editSavedAddress(event.id, event.data)`
- On success emits `state.copyWith(user: updatedUser)`
- On error emits failure state

**New datasource method** `editSavedAddress(String id, Map<String, dynamic> data)` in `auth_remote_datasource.dart`:
- `PUT /auth/saved-addresses/$id`
- Returns updated `UserModel`

**New repository method** `editSavedAddress(String id, Map<String, dynamic> data)` in the auth repository interface + implementation.

**Profile screen** (`profile_screen.dart`):
- Extract the existing `_showAddSheet` into `_showAddressSheet({SavedAddressEntity? existing})` — when `existing` is non-null, pre-populate all controllers and dispatch `AuthAddressEditRequested` instead of `AuthAddressAddRequested`
- Add pencil `IconButton` (`Icons.edit_outlined`) to each address row, before the star button, calling `_showAddressSheet(existing: addr)`

### Web — React

**New `updateAddress` function in `AuthContext.tsx`:**
```ts
updateAddress: (id: string, addr: Omit<SavedAddress, '_id' | 'isDefault'>) => Promise<void>
```
- `PUT /auth/saved-addresses/:id` with auth headers
- Updates `authState.user.savedAddresses` with the returned list

**`SavedAddressesCard` in `Profile.tsx`:**
- Add `editingId: string | null` state (null = no address in edit mode)
- When `editingId === addr._id`, render the inline edit form instead of the address row; pre-populate from `addr`
- Opening edit on a second address sets `editingId` to the new one (closing the previous)
- On save call `onUpdate(editingId, formData)` then set `editingId = null`
- On cancel set `editingId = null`
- Add `onUpdate` prop to `SavedAddressesCardProps`

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Edit save succeeds | Row updated in place, form collapses |
| Edit save fails (network) | Error shown; form stays open |
| Address not found on backend | 404 returned; client shows error |
| Street or city empty | Client-side validation blocks save; 400 returned by backend as fallback |

---

## Files to Change

| File | Change |
|---|---|
| `backend/src/controllers/authController.ts` | Add `updateSavedAddress` handler |
| `backend/src/routes/authRoutes.ts` | Register `PUT /saved-addresses/:id` |
| `frontend-mobile/lib/features/auth/presentation/bloc/auth_event.dart` | Add `AuthAddressEditRequested` |
| `frontend-mobile/lib/features/auth/presentation/bloc/auth_bloc.dart` | Add `_onAddressEdit` handler |
| `frontend-mobile/lib/features/auth/data/datasources/auth_remote_datasource.dart` | Add `editSavedAddress` method |
| `frontend-mobile/lib/features/auth/domain/repositories/auth_repository.dart` | Add `editSavedAddress` to interface |
| `frontend-mobile/lib/features/auth/data/repositories/auth_repository_impl.dart` | Implement `editSavedAddress` |
| `frontend-mobile/lib/features/profile/presentation/screens/profile_screen.dart` | Add edit button; refactor `_showAddSheet` |
| `frontend/src/context/AuthContext.tsx` | Add `updateAddress` function and interface entry |
| `frontend/src/pages/Profile.tsx` | Add `editingId` state, inline edit form, `onUpdate` prop |
