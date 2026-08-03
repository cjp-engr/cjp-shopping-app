# Design: `review-tests` Locator Stability & Catalog Sync

**Date:** 2026-08-03  
**Status:** Approved  
**Scope:** Locator enforcement in `review-tests` + canonical catalog in `tokomart-domain/ui-selectors.md`

---

## Goal

Make `/review-tests` enforce **stable locator choices** during test review — not just “uses a locator,” but “uses the best available locator for TokoMart’s multi-seller UI.” Reduce flaky Playwright and Patrol runs by scoping repeated UI, preferring accessible roles where safe, and flagging anti-patterns with concrete fixes.

---

## Problem

Current `review-tests` has minimal locator guidance (three bullets under Playwright, two under Patrol). Meanwhile:

- `playwright-best-practices` documents write-time locator patterns but is not enforced at review.
- `tokomart-domain/ui-selectors.md` is outdated (“sparse coverage”) while the web app has extensive `data-testid`s.
- Multi-seller cart/checkout repeats identical roles and labels per seller group — a flat “role-first everywhere” or “testid-first everywhere” order both fail.
- Review output does not include **recommended locator replacements** — only generic “missing testid” suggestions.

---

## Approach: Option C + Hybrid Locator Model

### Responsibility split

| Artifact | Role |
|----------|------|
| `tokomart-domain/ui-selectors.md` | **Canonical registry** — web `data-testid`s and mobile `ValueKey`s synced from app source |
| `playwright-best-practices` | **Write-time** guidance — scoping examples, waits, assertion patterns |
| `review-tests` | **Review-time enforcement** — stability checklist, anti-patterns, severity, recommended fixes |

`review-tests` does **not** duplicate the full locator catalog. It loads `ui-selectors.md`, verifies locators exist in app source, and cites `playwright-best-practices` for pattern rules.

### Locator priority (TokoMart hybrid)

**Rule: scope first, then pick the most stable locator inside the scope.**

```
1. Structural anchor (repeated UI: cart groups, product cards, order cards)
   → getByTestId('cart-seller-group-{sellerId}')
   → getByTestId('product-card-{productId}')
   → getByTestId('order-card-{orderId}')

2. Inside scope: prefer role + accessible name (unique controls)
   → sellerGroup.getByRole('button', { name: 'Apply voucher' })
   → page.getByRole('button', { name: 'Sign in' })
   → page.getByRole('textbox', { name: 'Email' })

3. Fallback: element-level testid when role/name is missing or ambiguous
   → sellerGroup.getByTestId('select-voucher-btn-{sellerId}')
   → page.getByTestId('login-submit-btn')

4. Text: only when scoped + stable business copy (not dynamic IDs/prices)
   → paymentSection.getByText('Cash on Delivery')

5. Never: XPath, CSS chains, nth-child, unscoped index selectors, waitForTimeout
```

**Rationale:** Role-first on unique top-level controls improves accessibility coverage. Structural testids first on repeated multi-seller UI prevents ambiguous matches. Text is last because copy and dynamic content change frequently.

### Patrol (mobile) locator priority

```
1. ValueKey via keys.dart: $(keys.feature.element)
2. waitUntilVisible before every interaction
3. find.text / find.byType only for assertions on stable copy — not for taps on interactive widgets
4. Never: flutter_test APIs in Patrol tests; unscoped text taps when a key should exist
```

---

## Changes to `review-tests` SKILL.md

### 1. New section: Locator stability (Playwright)

Add after existing Playwright checklist **Locators** subsection:

**Checklist:**
- [ ] Repeated UI scoped via testid container before role/text
- [ ] Unique top-level actions use `getByRole` with accessible name
- [ ] Multi-seller cart/checkout scoped to `cart-seller-group-{sellerId}`
- [ ] Product/order cards scoped to `product-card-{id}` / `order-card-{id}`
- [ ] No unscoped `getByText` on dynamic content (prices, order IDs, product names)
- [ ] No XPath / fragile CSS / `waitForTimeout`
- [ ] Locator verified in app source or listed in `ui-selectors.md`

**Anti-pattern table:**

| Anti-pattern | Severity | Recommended fix |
|--------------|----------|-----------------|
| XPath or CSS chain (`div > span:nth-child(2)`) | CRITICAL | Scoped `getByTestId` or `getByRole` |
| Unscoped `getByText` on cart/checkout/delivery options | IMPORTANT | Anchor with `cart-seller-group-{sellerId}`, then role or scoped text |
| `getByRole` on repeated buttons without container scope | IMPORTANT | Scope to seller group or card testid first |
| Global `getByText` for prices, order IDs, product names | IMPORTANT | Use testid or assert via structured element |
| `getByTestId` when unique role+name exists on a single control | SUGGESTION | Prefer role for a11y; testid acceptable |
| Missing `data-testid` / `ValueKey` in app source | SUGGESTION | Propose name + target file |
| Patrol `find.text` / `$(#...)` for widget taps | IMPORTANT | Add key to `keys.dart` and use `$(keys.*)` |

### 2. Expand Patrol checklist — Locators subsection

- [ ] Interactive widgets use `$(keys.feature.element)` from `lib/features/*/keys.dart`
- [ ] Keys registered in `lib/keys.dart`
- [ ] `waitUntilVisible` before tap/fill
- [ ] No unscoped text locators for repeated list items (cart lines, order cards)
- [ ] Seller wizard steps located via keys (7-step flow), not step index text alone

### 3. Update review process step 6

Change from “Verify selectors/keys in app source” to:

> **6. Locator stability review** — load `ui-selectors.md`; for each interaction locator, verify: (a) exists in source, (b) follows hybrid priority, (c) scoped correctly for multi-seller UI. Flag anti-patterns with recommended replacement.

### 4. New output section: Recommended locator fixes

Insert as **§7** in output format (before or after Recommended fixes):

```markdown
### 7. Recommended locator fixes

| File | Line | Current | Recommended | Rule |
|------|------|---------|-------------|------|
| `cart.spec.ts` | 42 | `page.getByText('Express').click()` | `page.getByTestId(\`cart-seller-group-${sellerId}\`).getByRole('radio', { name: 'Express' }).click()` | Scope before text |
```

Each row: file, line, current locator (quoted), recommended locator, rule cited (`review-tests` §Locator stability, `playwright-best-practices` §2, `ui-selectors.md`).

### 5. Update Rules section

Add:
- **Locator issues cite hybrid priority** — scope → role → testid → scoped text
- **Propose app changes** when stable locator requires new testid/key (file path + suggested name)
- **Do not flag testid on structural anchors** — required for multi-seller scoping

### 6. Acceptance criteria update

Add to item 3 (`tokomart-domain`):
> Verify locators against **`ui-selectors.md`** (canonical catalog) — not just ad-hoc grep.

---

## Changes to `tokomart-domain/ui-selectors.md`

Sync from current app source. Structure:

### Web sections (by feature)

- **Auth:** `login-form`, `login-submit-btn`, `login-error-alert`, `signup-form`, `toggle-password-visibility`, `remember-me-checkbox`, `terms-checkbox`, `back-to-home-btn`
- **Nav:** `navbar`, `nav-link-products`, `cart-link`, `nav-signin-link`, `nav-orders-link`, `nav-seller-link`
- **Products:** `products-page`, `product-search-input`, `product-card-{id}`, `product-detail-page`, `product-name`, `product-price`, `variant-value-{attr}-{value}`, `add-to-cart-btn`, `qty-increment`, `qty-decrement`
- **Cart:** `cart-page`, `cart-empty`, `cart-item-{id}`, `cart-seller-group-{sellerId}`, `delivery-select-{sellerId}`, `select-voucher-btn-{sellerId}`, `checkout-btn`, `cart-summary`, `remove-item-btn`
- **Checkout:** `checkout-page`, `shipping-section`, `payment-section`, `place-order-btn`, `order-summary`
- **Orders:** `orders-page`, `order-tab-{key}`, `order-card-{id}`, `orders-empty`, `view-order-btn`, `order-detail-page`, `confirm-received-btn`, `review-btn-{productId}`
- **Seller:** `seller-dashboard`, `add-product-btn`, `product-item-{id}`, `seller-order-card-{id}`, `seller-order-action-btn`, `seller-cancel-order-btn`

### Mobile sections

- All keys from `lib/features/auth/keys.dart`, `lib/features/products/keys.dart`, and any other feature `keys.dart` files
- Note: catalog grows as features add keys — verify in source during review

### Header note (add to file)

> **Locator strategy:** Use structural testids for repeated UI (cart groups, cards). Prefer `getByRole` with accessible name inside scope. See `playwright-best-practices` §2 and `review-tests` locator stability checklist.

Remove outdated “sparse coverage — prefer role/text” wording.

---

## Cross-skill alignment

| Skill | Change |
|-------|--------|
| `playwright-best-practices` | Optional minor update: add “scope first” framing to §2 intro to match hybrid model (no full rewrite) |
| `generate-tests` | Out of scope this pass; can reference same catalog later |
| `create-scenarios` | No change — selectors column already points to domain |

---

## Out of scope

- Adding new testids/keys to app source (review flags only)
- Rewriting existing test files
- `e2e-testing/` scaffold changes
- Patrol module architecture changes

---

## Success criteria

1. `/review-tests` flags unscoped cart/checkout locators as IMPORTANT with concrete fix
2. Review output includes **Recommended locator fixes** table
3. `ui-selectors.md` reflects current web testids and mobile keys
4. Reviewer can trace any locator issue to hybrid priority rule + catalog entry
5. No contradiction between `playwright-best-practices` §2 and `review-tests` enforcement

---

## Implementation order (for writing-plans)

1. Sync `ui-selectors.md` from app source (grep web + read mobile keys)
2. Update `review-tests/SKILL.md` — locator sections, anti-patterns, output format
3. Optional: one-line “scope first” note in `playwright-best-practices` §2
4. Self-check: run `/review-tests` mentally against `login_test.dart` and sample Playwright specs
