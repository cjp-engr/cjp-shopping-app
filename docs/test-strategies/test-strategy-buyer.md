# TokoMart Test Strategy — Buyer (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Role filter:** Buyer | Both  
**Platform:** Web + Mobile

---

## Pyramid (Buyer, 178 scenarios; 65 added 2026-10-24)

Role = Buyer or Both across web, mobile and API. Counts are recomputed from the master; the old per-platform split is replaced by one table.

| Layer | Count | Of which added 2026-10-24 |
|-------|-------|---------------------------|
| E2E (Playwright + Patrol) | 99 | 10 |
| API | 30 | 15 |
| Multi (≥ 2 layers) | 25 | 19 |
| Component / widget | 10 | 10 |
| Unit | 6 | 6 |
| Integration | 3 | 3 |
| Manual | 3 | 2 |
| Blocked | 2 | 0 |

---

## P0 buyer — build first

| ID | Layer | Tool | Target file |
|----|-------|------|-------------|
| TC-001 | E2E | Playwright | `login.spec.ts` |
| TC-007 | E2E | Playwright | `login.spec.ts` |
| TC-008 | E2E | Playwright | `products/catalog.spec.ts` |
| TC-013 | E2E | Playwright | `products/catalog.spec.ts` |
| TC-016 | E2E | Playwright | `cart.spec.ts` |
| TC-018 | E2E | Playwright | `cart.spec.ts` |
| TC-021 | E2E | Playwright | `cart.spec.ts` |
| TC-022 | E2E | Playwright | `checkout.spec.ts` |
| TC-098 | E2E | Playwright | `variant-checkout.spec.ts` |
| TC-025 | Multi | API + Playwright | `orders.api.spec.ts` + checkout |
| TC-026 | API | Playwright-API | `orders.api.spec.ts` |
| TC-053 | API | Playwright-API | `seller.api.spec.ts` |
| TC-055 | E2E | Playwright | `login.spec.ts` |
| TC-065 | E2E | Playwright | `products/catalog.spec.ts` |

### P0 buyer — Mobile (Patrol)

| ID | Layer | Tool | Target file | Phase |
|----|-------|------|-------------|-------|
| TC-067 | E2E | Patrol | `login_test.dart` | M1 — **exists** |
| TC-068 | E2E | Patrol | `auth_gate_test.dart` | M2 |
| TC-072 | E2E | Patrol | `login_test.dart` | M1 |
| TC-073 | E2E | Patrol | `login_test.dart` | M1 |
| TC-076 | E2E | Patrol | `product_detail_test.dart` | M2 |
| TC-078 | E2E | Patrol | `cart_checkbox_test.dart` | M2 |
| TC-095 | E2E | Patrol | `checkout_cod_test.dart` | M2 |
| TC-083 | Multi | Patrol + API | `multi_seller_checkout_test.dart` | M4 |
| TC-608 | E2E | Patrol | `catalog_test.dart` | M4 |
| TC-611 | Multi | Patrol + API | `security_test.dart` | M5 |

---

## All buyer assignments

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-001–014 | E2E | Playwright | P0–P1 |
| TC-065–066 | E2E | Playwright | P0–P1 |
| TC-016–024 | E2E | Playwright | P0–P1 |
| TC-025 | Multi | API + Playwright | P0 |
| TC-026–028 | API | Playwright-API | P0–P1 |
| TC-029–031 | E2E | Playwright | P1 |
| TC-032 | Multi | Playwright + API | P1 |
| TC-033 | API | Playwright-API | P1 |
| TC-034 | E2E | Playwright | P1 |
| TC-035–036 | API | Playwright-API | P1 |
| TC-037 | E2E | Playwright | P2 |
| TC-038–040 | E2E | Playwright | P2 |
| TC-050 | E2E | Playwright | P1 |
| TC-053 | API | Playwright-API | P0 |
| TC-055–057 | API/E2E | Mixed | P0–P1 |
| TC-056 | API | Playwright-API | P1 |
| TC-059–060 | E2E | Playwright | P2–P1 |
| TC-062 | Blocked | — | P3 |
| TC-063 | E2E | Playwright | P2 |

### Mobile buyer assignments

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-067–071, TC-607 | E2E | Patrol | P0–P1 |
| TC-072–076, TC-609, TC-608 | E2E | Patrol | P0–P1 |
| TC-077–082, TC-095 | E2E | Patrol | P0–P1 |
| TC-083 | Multi | Patrol + API | P0 |
| TC-084–085, TC-612–614 | E2E | Patrol | P1 |
| TC-086–087 | E2E | Patrol | P1–P2 |
| TC-088 | E2E | Patrol | P2 |
| TC-600, TC-602, TC-606 | E2E | Patrol | P1–P2 |
| TC-603 | Blocked | — | P3 |
| TC-604 | Manual | Manual | P3 |
| TC-611 | Multi | Patrol + API | P0 |

## Added 2026-10-24 — Buyer scenarios (80, all platforms)

Layers, sources, rationale and existing-coverage candidates for every row are in **`test-strategy.md` §4c–§4d**. Included: scenarios added on 2026-10-24 and older scenarios the strategy had never assigned.

| ID | Scenario | Final layer | Tool | Priority |
|----|----------|-------------|------|----------|
| TC-099 | Variant checkout — insufficient stock (web) | Multi | Playwright-API + Playwright | P1 |
| TC-100 | Cart holds two variants of same product (web) | E2E | Playwright | P1 |
| TC-102 | Add to cart blocked without variant — mobile guard (Patrol) | E2E | Patrol | P1 |
| TC-105 | Checkout with new card — variant product (web) | E2E | Playwright | P1 |
| TC-106 | Checkout with saved card — variant product (web) | E2E | Playwright | P1 |
| TC-123 | Products page — navigate to next page loads different products | E2E | Playwright | P1 |
| TC-124 | Products page — category filter resets to page 1 | E2E | Playwright | P1 |
| TC-125 | Products page — sort change resets to page 1 | E2E | Playwright | P1 |
| TC-126 | Products page — count label shows total across all pages | E2E | Playwright | P1 |
| TC-127 | Products page — pagination hidden when results fit on one page | E2E | Playwright | P1 |
| TC-135 | Buyer blocked from all key seller routes | API | Playwright-API | P1 |
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
| TC-161 | Refund request is offered for a delivered card order inside the 7-day window | Component | Vitest + RTL | P1 |
| TC-162 | Buyer submits a partial refund request | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-163 | Refund form validation | Component | Vitest + RTL | P1 |
| TC-166 | Only one active request per order; a second request follows resolution | API | Playwright-API | P1 |
| TC-167 | Shipping is refunded only with the last paid unit for a seller-fault reason | Unit | Vitest | P2 |
| TC-168 | Refund chips and order tabs reflect refund state | Component | Vitest + RTL | P1 |
| TC-169 | Refund is unavailable when the order is not eligible | API | Playwright-API | P1 |
| TC-171 | Offline banner appears when the connection drops | Component | Vitest + RTL | P2 |
| TC-172 | Save a new address at checkout (mobile) | E2E | Patrol | P1 |
| TC-173 | Edit a saved address (mobile) | E2E | Patrol | P1 |
| TC-174 | Deleting a saved address asks for confirmation (mobile) | E2E | Patrol | P2 |
| TC-175 | Payment Methods screen — list, set default, delete a card (mobile) | E2E | Patrol | P1 |
| TC-176 | Card checkout reserves the amount and explains it (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-177 | Declined card places no order (mobile) | Component | flutter_test | P1 |
| TC-178 | 3-D Secure card on mobile | Manual | Manual | P1 |
| TC-179 | Buyer order detail shows payment notices (mobile) | Component | flutter_test | P1 |
| TC-180 | Buyer cancels a pending order (mobile) | Multi | Playwright-API + Patrol | P0 |
| TC-181 | No cancel after the seller accepts (mobile) | Component | flutter_test | P2 |
| TC-185 | Buyer requests a refund for a delivered order (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-187 | Return/Refund tab and Complete tab behaviour (mobile) | Component | flutter_test | P1 |
| TC-188 | Offline banner (mobile) | Component | flutter_test + Manual | P2 |
| TC-189 | Interrupted card checkout resumes (mobile) | Manual | Manual | P2 |
| TC-190 | Saved address create, update, default and delete | API | Playwright-API | P1 |
| TC-191 | Saved address requires street and city | API | Playwright-API | P2 |
| TC-192 | Saved addresses and cards are scoped to their owner | API | Playwright-API | P0 |
| TC-193 | Card order through the old endpoint is refused with 426 | API | Playwright-API + Vitest | P0 |
| TC-194 | Client-trusted payment intent is refused with 426 | API | Playwright-API + Vitest | P0 |
| TC-195 | Checkout session prices from the server, never from the client | Multi | Vitest + Playwright-API | P0 |
| TC-196 | Checkout session is idempotent | Multi | Vitest (integration) + Playwright-API | P1 |
| TC-197 | Checkout sessions and saved cards are owner-only | API | Playwright-API | P0 |
| TC-198 | Insufficient stock aborts the whole session | API | Playwright-API | P1 |
| TC-204 | Accept racing cancel has exactly one winner | Integration | Vitest | P1 |
| TC-205 | Buyer cancels a pending order; the result is idempotent | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-206 | Buyer cancel after acceptance is a conflict | API | Playwright-API | P0 |
| TC-207 | Buyer cancel reason is limited to 500 characters | API | Playwright-API | P2 |
| TC-208 | Buyer cannot cancel someone else's order | API | Playwright-API | P0 |
| TC-214 | Refund eligibility for a delivered, captured card order | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-215 | Ineligible refund reasons | Integration | Vitest | P1 |
| TC-216 | Refund request body validation | Unit | Vitest | P1 |
| TC-217 | Refund request idempotency | Multi | Vitest (integration) + Playwright-API | P1 |
| TC-218 | One unresolved refund request per order | API | Playwright-API | P1 |
| TC-219 | Refunds can be switched off | Integration | Vitest | P1 |
| TC-220 | Refund amount is never taken from the client | Multi | Vitest + Playwright-API | P0 |
| TC-221 | Buyer isolation on refund endpoints | API | Playwright-API | P0 |
| TC-225 | A refund does not undo fulfillment | API | Playwright-API | P1 |
| TC-227 | Delivery records `deliveredAt` and the 7-day deadline on every path | Multi | Vitest (integration) + Playwright-API | P1 |
| TC-231 | Draft (`awaiting_payment`) orders stay hidden | Multi | Vitest + Playwright-API | P1 |
| TC-621 | Initial product list loads first 20 products | E2E | Patrol | P1 |
| TC-622 | Scrolling to the bottom loads more products | E2E | Patrol | P1 |
| TC-623 | Loading spinner visible while fetching more products | E2E | Patrol | P1 |
| TC-624 | No further fetch when all products are loaded | E2E | Patrol | P1 |

Full detail: **`docs/test-strategies/test-strategy.md`** · Mobile phases: **`test-strategy-mobile.md`**
