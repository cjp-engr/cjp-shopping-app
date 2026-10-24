# TokoMart Test Strategy — Web (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Platform filter:** Web scenarios (`test-scenarios-web.md`, 108) · API scenarios (`test-scenarios-api.md`, 70) are listed in the shared-API section below  
**Updated:** 2026-10-24. Mobile assignments are in `test-strategy-mobile.md`. The old assignment table below still lists some API rows under "Web"; the master uses the scenario files' platform tags.

---

## Pyramid (Web scenarios, 108)

| Layer | Count | Tool |
|-------|-------|------|
| E2E Web | 72 | Playwright |
| Multi (≥ 2 layers) | 17 | Playwright + API / Vitest / integration |
| Component | 7 | Vitest + RTL |
| Unit | 7 | Vitest |
| API | 3 | Playwright-API (TC-158, TC-166, TC-169) |
| Manual | 1 | TC-052 |
| Blocked | 1 | TC-062 |

## Pyramid (API scenarios, 70)

| Layer | Count | Tool |
|-------|-------|------|
| API | 48 | Playwright-API |
| Multi | 12 | Integration + API |
| Integration | 7 | Vitest, `vitest.integration.config.ts` (TC-202, 203, 204, 211, 215, 219, 230) |
| Unit | 3 | Vitest (TC-216, TC-226, TC-228) |

---

## P0 smoke — implementation

| ID | Layer | Tool | Test file (target) |
|----|-------|------|-------------------|
| S1 | Multi | Playwright + API | `checkout.spec.ts` |
| S3 | E2E | Playwright | `seller/product-wizard.spec.ts` |
| S4 | Multi | API + Playwright | `orders.api.spec.ts` + `checkout.spec.ts` |
| S5 | Multi | Integration + API + Playwright | TC-143 → TC-155; candidates `card-checkout-authorization.spec.ts`, `stripe-checkout.spec.ts` |
| S6 | Multi | Integration + API + Playwright | TC-152 → TC-157 |
| S7 | Multi | Integration + API + Playwright | TC-162 → TC-164 |

---

## Assignments (Web)

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-001 | E2E | Playwright | P0 |
| TC-002 | E2E | Playwright | P1 |
| TC-003 | E2E | Playwright | P1 |
| TC-004 | E2E | Playwright | P1 |
| TC-005 | E2E | Playwright | P1 |
| TC-006 | E2E | Playwright | P1 |
| TC-007 | E2E | Playwright | P0 |
| TC-008 | E2E | Playwright | P0 |
| TC-009 | E2E | Playwright | P1 |
| TC-010 | E2E | Playwright | P1 |
| TC-011 | E2E | Playwright | P1 |
| TC-012 | E2E | Playwright | P1 |
| TC-013 | E2E | Playwright | P0 |
| TC-014 | E2E | Playwright | P1 |
| TC-015 | E2E | Playwright | P1 |
| TC-065 | E2E | Playwright | P0 |
| TC-066 | E2E | Playwright | P1 |
| TC-016 | E2E | Playwright | P0 |
| TC-017 | E2E | Playwright | P1 |
| TC-018 | E2E | Playwright | P0 |
| TC-019 | E2E | Playwright | P1 |
| TC-020 | Multi | Playwright + API | P1 |
| TC-021 | E2E | Playwright | P0 |
| TC-022 | E2E | Playwright | P0 |
| TC-023 | E2E | Playwright | P1 |
| TC-024 | E2E | Playwright | P1 |
| TC-105 | E2E | Playwright | P1 |
| TC-106 | E2E | Playwright | P1 |
| TC-025 | Multi | API + Playwright | P0 |
| TC-026 | API | Playwright-API | P0 |
| TC-027 | API | Playwright-API | P1 |
| TC-028 | API | Playwright-API | P1 |
| TC-029 | E2E | Playwright | P1 |
| TC-030 | E2E | Playwright | P1 |
| TC-031 | E2E | Playwright | P1 |
| TC-032 | Multi | Playwright + API | P1 |
| TC-033 | API | Playwright-API | P1 |
| TC-034 | E2E | Playwright | P1 |
| TC-035 | API | Playwright-API | P1 |
| TC-036 | API | Playwright-API | P1 |
| TC-037 | E2E | Playwright | P2 |
| TC-038 | E2E | Playwright | P2 |
| TC-039 | E2E | Playwright | P1 |
| TC-040 | E2E | Playwright | P2 |
| TC-041 | E2E | Playwright | P0 |
| TC-042 | E2E | Playwright | P0 |
| TC-064 | E2E | Playwright | P0 |
| TC-043 | E2E | Playwright | P1 |
| TC-044 | E2E | Playwright | P1 |
| TC-120 | E2E | Playwright | P1 |
| TC-122 | E2E | Playwright | P1 |
| TC-045 | E2E | Playwright | P2 |
| TC-121 | E2E | Playwright | P2 |
| TC-046 | E2E | Playwright | P2 |
| TC-123 | E2E | Playwright | P1 |
| TC-124 | E2E | Playwright | P1 |
| TC-125 | E2E | Playwright | P1 |
| TC-126 | E2E | Playwright | P1 |
| TC-127 | E2E | Playwright | P1 |
| TC-128 | E2E | Playwright | P1 |
| TC-129 | E2E | Playwright | P1 |
| TC-130 | E2E | Playwright | P1 |
| TC-131 | E2E | Playwright | P1 |
| TC-047 | E2E | Playwright | P0 |
| TC-048 | API | Playwright-API | P1 |
| TC-049 | E2E | Playwright | P1 |
| TC-050 | E2E | Playwright | P1 |
| TC-051 | E2E | Playwright | P1 |
| TC-052 | Manual | Manual | P2 |
| TC-053 | API | Playwright-API | P0 |
| TC-054 | API | Playwright-API | P1 |
| TC-055 | E2E | Playwright | P0 |
| TC-056 | API | Playwright-API | P1 |
| TC-057 | API | Playwright-API | P1 |
| TC-058 | API | Playwright-API | P2 |
| TC-059 | E2E | Playwright | P2 |
| TC-060 | E2E | Playwright | P1 |
| TC-061 | E2E | Playwright | P2 |
| TC-062 | Blocked | — | P3 |
| TC-063 | E2E | Playwright | P2 |

## Added 2026-10-24 — Web scenarios (48)

Layers, sources, rationale and existing-coverage candidates for every row are in **`test-strategy.md` §4c–§4d**. Included: scenarios added on 2026-10-24 and older scenarios the strategy had never assigned.

| ID | Scenario | Final layer | Tool | Priority |
|----|----------|-------------|------|----------|
| TC-099 | Variant checkout — insufficient stock (web) | Multi | Playwright-API + Playwright | P1 |
| TC-100 | Cart holds two variants of same product (web) | E2E | Playwright | P1 |
| TC-105 | Checkout with new card — variant product (web) | E2E | Playwright | P1 |
| TC-106 | Checkout with saved card — variant product (web) | E2E | Playwright | P1 |
| TC-123 | Products page — navigate to next page loads different products | E2E | Playwright | P1 |
| TC-124 | Products page — category filter resets to page 1 | E2E | Playwright | P1 |
| TC-125 | Products page — sort change resets to page 1 | E2E | Playwright | P1 |
| TC-126 | Products page — count label shows total across all pages | E2E | Playwright | P1 |
| TC-127 | Products page — pagination hidden when results fit on one page | E2E | Playwright | P1 |
| TC-128 | MyProducts page — navigate to next page | E2E | Playwright | P1 |
| TC-129 | MyProducts page — category filter resets to page 1 | E2E | Playwright | P1 |
| TC-130 | MyProducts page — next button disabled on last page | E2E | Playwright | P1 |
| TC-131 | MyProducts page — pagination hidden when products fit on one page | E2E | Playwright | P1 |
| TC-137 | Save a new address at checkout | E2E | Playwright | P1 |
| TC-138 | Edit a saved address in the profile | Multi | Playwright + Playwright-API | P1 |
| TC-139 | Saved address edit requires street and city | E2E | Playwright | P2 |
| TC-140 | Set a default address; checkout preselects it | Multi | Playwright + Playwright-API | P2 |
| TC-141 | Delete a saved address (web removes it without a dialog) | E2E | Playwright | P2 |
| TC-142 | Saved cards on the profile — list, set default, delete | Multi | Playwright + Playwright-API | P1 |
| TC-143 | Card checkout with a new card reserves the amount without charging | E2E | Playwright (Stripe test mode) | P0 |
| TC-144 | Card checkout with a saved card reserves the amount | E2E | Playwright (Stripe test mode) | P1 |
| TC-145 | Checkout explains the reservation before the buyer pays | Component | Vitest + RTL | P1 |
| TC-146 | Declined card places no order and loses nothing | Multi | Vitest (integration) + Playwright | P0 |
| TC-147 | 3-D Secure card completes only after authentication | E2E | Playwright (Stripe test mode) | P1 |
| TC-148 | Multi-seller card checkout holds each seller's amount separately | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-149 | Buyer order detail shows the payment state accurately | Unit | Vitest | P1 |
| TC-150 | Short card authorization window is disclosed | Unit | Vitest | P3 |
| TC-151 | Interrupted checkout resumes without a second authorization | Unit | Vitest + Manual | P2 |
| TC-152 | Buyer cancels a pending card order — the hold is released | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-153 | Buyer cancels a pending COD order | Multi | Vitest (integration) + Playwright | P1 |
| TC-154 | Cancel is unavailable once the seller accepts; "Keep Order" cancels nothing | Unit | Vitest + Playwright | P1 |
| TC-155 | Seller accepts a pending card order — payment is captured | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-156 | Seller sees the acceptance deadline only while the order is pending | Unit | Vitest | P2 |
| TC-157 | Seller cancels a pending card order with a reason — hold released, buyer sees why | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-158 | Seller pending cancellation needs a valid reason | API | Playwright-API | P1 |
| TC-159 | Seller cancels a pending COD order without any Stripe request | Multi | Vitest (integration) + Playwright | P1 |
| TC-160 | Seller cannot cancel from shipped, and cannot cancel card orders after pending | Unit | Vitest + Playwright-API | P1 |
| TC-161 | Refund request is offered for a delivered card order inside the 7-day window | Component | Vitest + RTL | P1 |
| TC-162 | Buyer submits a partial refund request | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-163 | Refund form validation | Component | Vitest + RTL | P1 |
| TC-164 | Seller approves a refund request — refund settles | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-165 | Seller rejects a refund request with a required explanation | Component | Vitest + RTL | P1 |
| TC-166 | Only one active request per order; a second request follows resolution | API | Playwright-API | P1 |
| TC-167 | Shipping is refunded only with the last paid unit for a seller-fault reason | Unit | Vitest | P2 |
| TC-168 | Refund chips and order tabs reflect refund state | Component | Vitest + RTL | P1 |
| TC-169 | Refund is unavailable when the order is not eligible | API | Playwright-API | P1 |
| TC-170 | Seller Return/Refund tab groups requests and shows a badge | Component | Vitest + RTL | P2 |
| TC-171 | Offline banner appears when the connection drops | Component | Vitest + RTL | P2 |

## Shared API scenarios (47 added or previously unassigned)

These API scenarios are implemented once and used by web and mobile. Integration rows run in the backend suite, not in Playwright. Needs the flags listed in `test-scenarios.md`.

| ID | Scenario | Final layer | Tool | Priority |
|----|----------|-------------|------|----------|
| TC-132 | Protected routes return 401 with no token | API | Playwright-API | P1 |
| TC-133 | Tampered JWT returns 401 | API | Playwright-API | P1 |
| TC-134 | Seller order list is scoped to own account (IDOR) | API | Playwright-API | P1 |
| TC-135 | Buyer blocked from all key seller routes | API | Playwright-API | P1 |
| TC-136 | Weak password on signup returns 400 | API | Playwright-API | P1 |
| TC-190 | Saved address create, update, default and delete | API | Playwright-API | P1 |
| TC-191 | Saved address requires street and city | API | Playwright-API | P2 |
| TC-192 | Saved addresses and cards are scoped to their owner | API | Playwright-API | P0 |
| TC-193 | Card order through the old endpoint is refused with 426 | API | Playwright-API + Vitest | P0 |
| TC-194 | Client-trusted payment intent is refused with 426 | API | Playwright-API + Vitest | P0 |
| TC-195 | Checkout session prices from the server, never from the client | Multi | Vitest + Playwright-API | P0 |
| TC-196 | Checkout session is idempotent | Multi | Vitest (integration) + Playwright-API | P1 |
| TC-197 | Checkout sessions and saved cards are owner-only | API | Playwright-API | P0 |
| TC-198 | Insufficient stock aborts the whole session | API | Playwright-API | P1 |
| TC-199 | Seller accept captures exactly the held amount | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-200 | Repeat or late accept returns 409 `order_not_pending` | API | Playwright-API | P1 |
| TC-201 | Another seller cannot accept or cancel the order | API | Playwright-API | P0 |
| TC-202 | Accept after the deadline is refused | Integration | Vitest | P1 |
| TC-203 | Unaccepted orders are cancelled automatically at the deadline | Integration | Vitest | P1 |
| TC-204 | Accept racing cancel has exactly one winner | Integration | Vitest | P1 |
| TC-205 | Buyer cancels a pending order; the result is idempotent | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-206 | Buyer cancel after acceptance is a conflict | API | Playwright-API | P0 |
| TC-207 | Buyer cancel reason is limited to 500 characters | API | Playwright-API | P2 |
| TC-208 | Buyer cannot cancel someone else's order | API | Playwright-API | P0 |
| TC-209 | Seller cancels a pending order — 200 with the payment operation | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-210 | Seller cancel validation and ownership errors | API | Playwright-API | P1 |
| TC-211 | Seller cancel conflicts and unsupported order shapes | Integration | Vitest | P1 |
| TC-212 | Seller cannot cancel a shipped order | API | Playwright-API + Vitest | P1 |
| TC-213 | `canSellerCancelPending` is derived by the server | API | Playwright-API | P1 |
| TC-214 | Refund eligibility for a delivered, captured card order | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-215 | Ineligible refund reasons | Integration | Vitest | P1 |
| TC-216 | Refund request body validation | Unit | Vitest | P1 |
| TC-217 | Refund request idempotency | Multi | Vitest (integration) + Playwright-API | P1 |
| TC-218 | One unresolved refund request per order | API | Playwright-API | P1 |
| TC-219 | Refunds can be switched off | Integration | Vitest | P1 |
| TC-220 | Refund amount is never taken from the client | Multi | Vitest + Playwright-API | P0 |
| TC-221 | Buyer isolation on refund endpoints | API | Playwright-API | P0 |
| TC-222 | Seller isolation and role checks on refund decisions | API | Playwright-API | P0 |
| TC-223 | Approve starts one refund; repeat and races converge | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-224 | Rejection needs an explanation | Multi | Vitest + Playwright-API | P1 |
| TC-225 | A refund does not undo fulfillment | API | Playwright-API | P1 |
| TC-226 | Seller refund list pagination and filters | Unit | Vitest | P2 |
| TC-227 | Delivery records `deliveredAt` and the 7-day deadline on every path | Multi | Vitest (integration) + Playwright-API | P1 |
| TC-228 | API documentation is served outside production only | Unit | Vitest | P2 |
| TC-229 | Stripe webhook rejects an invalid signature | API | Playwright-API | P1 |
| TC-230 | Payment events never advance fulfillment | Integration | Vitest | P1 |
| TC-231 | Draft (`awaiting_payment`) orders stay hidden | Multi | Vitest + Playwright-API | P1 |

Full rationale and implementation order: **`docs/test-strategies/test-strategy.md`**
