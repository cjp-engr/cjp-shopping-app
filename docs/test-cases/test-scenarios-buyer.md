# TokoMart Test Scenarios — Buyer (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

**Role filter:** Buyer | Both  
**Platform:** Web + Mobile

---

## Buyer Scenario Index — Web

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-001 | Successful login | P0 | Playwright |
| TC-002 | Login failure | P1 | Playwright |
| TC-003 | Successful signup | P1 | Playwright |
| TC-004 | Signup weak password | P1 | Playwright |
| TC-005 | Logout | P1 | Playwright |
| TC-006 | Cart restored on re-login | P1 | Playwright |
| TC-007 | Checkout auth redirect | P0 | Playwright |
| TC-008 | Guest browse products | P0 | Playwright |
| TC-009 | Guest view cart | P1 | Playwright |
| TC-010 | Search products | P1 | Playwright |
| TC-011 | Filter by category | P1 | Playwright |
| TC-012 | Sale strikethrough price | P1 | Playwright |
| TC-013 | Variant selection add to cart | P0 | Playwright |
| TC-014 | Add blocked without variant | P1 | Playwright |
| TC-015 | Own products hidden (seller view) | P1 | Playwright |
| TC-065 | Buyer sees new seller listing in catalog | P0 | Playwright |
| TC-066 | Buyer finds listing via search/category | P1 | Playwright |
| TC-016 | Cart qty update/remove | P0 | Playwright |
| TC-017 | Qty capped at stock | P1 | Playwright |
| TC-018 | Per-seller delivery | P0 | Playwright |
| TC-019 | Apply valid voucher | P1 | Playwright |
| TC-020 | Invalid voucher | P1 | Playwright |
| TC-021 | Multi-seller cart groups | P0 | Playwright |
| TC-022 | Checkout COD | P0 | Playwright |
| TC-098 | Checkout COD with variant product | P0 | Playwright |
| TC-023 | Checkout saved card | P1 | Playwright |
| TC-024 | Checkout new card | P1 | Playwright |
| TC-098 | Checkout COD with variant product | P0 | Playwright |
| TC-099 | Variant checkout insufficient stock | P1 | Playwright / Playwright-API |
| TC-100 | Two variants same product in cart | P1 | Playwright |
| TC-025 | Multi-seller → 2 orders | P0 | Playwright |
| TC-026 | Order total formula | P0 | Playwright-API |
| TC-027 | Shipping $9.99 under $50 | P1 | Playwright-API |
| TC-028 | Free shipping ≥ $50 | P1 | Playwright-API |
| TC-029 | Missing address blocked | P1 | Playwright |
| TC-030 | Order history tabs | P1 | Playwright |
| TC-031 | Confirm receipt | P1 | Playwright |
| TC-032 | Buyer cancel pending | P1 | Playwright |
| TC-033 | Cancel processing blocked | P1 | Playwright-API |
| TC-034 | Leave review | P1 | Playwright |
| TC-035 | Duplicate review blocked | P1 | Playwright-API |
| TC-036 | Review before delivery blocked | P1 | Playwright-API |
| TC-037 | Follow/unfollow seller | P2 | Playwright |
| TC-038 | Dark mode toggle | P2 | Playwright |
| TC-039 | Order card persisted total | P1 | Playwright |
| TC-040 | Products loading/empty | P2 | Playwright |
| TC-050 | Voucher create + apply E2E | P1 | Playwright |
| TC-053 | Buyer blocked seller API | P0 | Playwright-API |
| TC-055 | Protected route auth | P0 | Playwright |
| TC-056 | Insufficient stock at checkout | P1 | Playwright-API |
| TC-057 | Coupon min order | P1 | Playwright-API |
| TC-059 | Stale cart cleanup | P2 | Playwright |
| TC-060 | Guest catalog access | P1 | Playwright |
| TC-062 | Wishlist N/A on web | P3 | Blocked |
| TC-063 | All cart items checkout | P2 | Playwright |
| TC-137 | Save new address at checkout | P1 | Playwright |
| TC-138 | Edit saved address | P1 | Playwright |
| TC-139 | Saved address edit needs street + city | P2 | Playwright |
| TC-140 | Default address preselected at checkout | P2 | Playwright |
| TC-141 | Delete saved address (no dialog on web) | P2 | Playwright |
| TC-142 | Saved cards: list, default, delete | P1 | Playwright |
| TC-143 | Card checkout (new card) reserves, not charges | P0 | Playwright |
| TC-144 | Card checkout (saved card) reserves | P1 | Playwright |
| TC-145 | Reservation disclosure at checkout | P1 | Playwright |
| TC-146 | Declined card places no order | P0 | Playwright |
| TC-147 | 3-D Secure card | P1 | Playwright |
| TC-148 | Multi-seller card checkout, separate holds | P0 | Playwright / Playwright-API |
| TC-149 | Payment notice per payment state | P1 | Playwright / Component |
| TC-150 | Short authorization window note | P3 | Manual |
| TC-151 | Interrupted checkout resumes | P2 | Manual |
| TC-152 | Cancel pending card order (hold released) | P0 | Playwright |
| TC-153 | Cancel pending COD order | P1 | Playwright |
| TC-154 | No cancel after seller accepts; Keep Order | P1 | Playwright |
| TC-161 | Refund offered inside 7-day window | P1 | Playwright |
| TC-162 | Submit partial refund request | P0 | Playwright |
| TC-163 | Refund form validation | P1 | Playwright |
| TC-166 | One active refund request per order | P1 | Playwright / Playwright-API |
| TC-167 | Shipping refund rule | P2 | Playwright-API / Component |
| TC-168 | Refund chips and order tabs | P1 | Playwright / Component |
| TC-169 | Refund unavailable (COD, window, flag) | P1 | Playwright / Playwright-API |
| TC-171 | Offline banner | P2 | Playwright |

### Buyer API scenarios added 2026-10-24

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-190 | Saved address CRUD and default | P1 | Playwright-API |
| TC-191 | Saved address validation | P2 | Playwright-API |
| TC-192 | Addresses and cards scoped to owner | P0 | Playwright-API |
| TC-193 | Card order via old endpoint → 426 | P0 | Playwright-API |
| TC-194 | `create-intent` → 426 | P0 | Playwright-API |
| TC-195 | Session prices come from the server | P0 | Playwright-API |
| TC-196 | Checkout session idempotency | P1 | Playwright-API |
| TC-197 | Sessions and cards are owner-only | P0 | Playwright-API |
| TC-198 | Insufficient stock aborts the session | P1 | Playwright-API |
| TC-205 | Buyer cancel is idempotent | P0 | Playwright-API |
| TC-206 | Buyer cancel after accept → 409 | P0 | Playwright-API |
| TC-207 | Cancel reason max 500 | P2 | Playwright-API |
| TC-208 | Cannot cancel another buyer's order | P0 | Playwright-API |
| TC-214 | Refund eligibility | P0 | Playwright-API |
| TC-215 | Ineligible refund reasons | P1 | Playwright-API |
| TC-216 | Refund request validation | P1 | Playwright-API |
| TC-217 | Refund request idempotency | P1 | Playwright-API |
| TC-218 | One unresolved refund per order | P1 | Playwright-API |
| TC-219 | Refunds switched off | P1 | Playwright-API |
| TC-220 | Refund amount never from client | P0 | Playwright-API |
| TC-221 | Buyer isolation on refund endpoints | P0 | Playwright-API |
| TC-225 | Refund does not undo fulfillment | P1 | Playwright-API |
| TC-227 | Delivery timestamps on every path | P1 | Playwright-API / Integration |
| TC-231 | Draft orders hidden | P1 | Playwright-API |

---

## Buyer Scenario Index — Mobile

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-067 | Mobile login smoke | P0 | Patrol |
| TC-068 | Auth gate redirect | P0 | Patrol |
| TC-069 | Redirect from login when authed | P1 | Patrol |
| TC-070 | Mobile signup | P1 | Patrol |
| TC-071 | Mobile logout | P1 | Patrol |
| TC-607 | Cart restored on re-login | P1 | Patrol |
| TC-072 | Browse products home | P0 | Patrol |
| TC-073 | Open cart (S2 smoke) | P0 | Patrol |
| TC-074 | Search products | P1 | Patrol |
| TC-075 | Filter by category | P1 | Patrol |
| TC-076 | Variant + add to cart | P0 | Patrol |
| TC-609 | Sale strikethrough | P1 | Patrol |
| TC-608 | Sees seller listing in catalog | P0 | Patrol |
| TC-077 | Cart update/remove | P0 | Patrol |
| TC-078 | Checkbox subset checkout | P0 | Patrol |
| TC-079 | Checkout disabled — no selection | P1 | Patrol |
| TC-080 | Select all / deselect all | P2 | Patrol |
| TC-081 | Per-seller delivery | P0 | Patrol |
| TC-082 | Voucher via route extra | P1 | Patrol |
| TC-095 | COD checkout | P0 | Patrol |
| TC-096 | Checkout saved card | P1 | Patrol |
| TC-097 | Checkout new card | P1 | Patrol |
| TC-101 | COD checkout with variant product | P0 | Patrol |
| TC-102 | Add blocked without variant (Patrol) | P1 | Patrol |
| TC-083 | Multi-seller → 2 orders | P0 | Patrol |
| TC-084 | Order history + detail | P1 | Patrol |
| TC-085 | Confirm receipt | P1 | Patrol |
| TC-612 | Invalid login | P1 | Patrol |
| TC-613 | Variant required | P1 | Patrol |
| TC-614 | Qty stock cap | P1 | Patrol |
| TC-086 | Wishlist add/remove | P1 | Patrol |
| TC-087 | Wishlist clear all | P2 | Patrol |
| TC-088 | Follow/unfollow seller | P2 | Patrol |
| TC-611 | Blocked from seller routes | P0 | Patrol + API |
| TC-600 | Auth gate (no guest browse) | P1 | Patrol |
| TC-602 | Checkbox vs web all-items | P2 | Patrol |
| TC-603 | Wishlist in-memory | P3 | Blocked |
| TC-604 | Notifications bell stub | P3 | Manual |
| TC-606 | 6-char password signup | P2 | Patrol |
| TC-172 | Save new address at checkout | P1 | Patrol |
| TC-173 | Edit saved address | P1 | Patrol |
| TC-174 | Delete saved address asks to confirm | P2 | Patrol |
| TC-175 | Payment Methods screen | P1 | Patrol |
| TC-176 | Card checkout reserves, explains | P0 | Patrol |
| TC-177 | Declined card places no order | P1 | Patrol |
| TC-178 | 3-D Secure card | P1 | Manual |
| TC-179 | Payment notices on order detail | P1 | Patrol / Widget |
| TC-180 | Cancel pending order | P0 | Patrol |
| TC-181 | No cancel after seller accepts | P2 | Patrol |
| TC-185 | Request a refund (delivered order) | P0 | Patrol (keys missing) |
| TC-187 | Return/Refund and Complete tabs | P1 | Patrol / Widget |
| TC-188 | Offline banner | P2 | Manual / Widget |
| TC-189 | Interrupted checkout resumes | P2 | Manual |

**Added 2026-10-24:** 26 web + 14 mobile + 24 API buyer-facing scenarios (overlap via parity on shared business rules)

Full steps and selectors: **`docs/test-cases/test-scenarios.md`**

---

## P0 Buyer Smoke

**Web:** TC-001 → TC-013 → TC-016 → TC-022 → TC-098 → TC-030  
**Mobile:** TC-067 → TC-072 → TC-073 → TC-076 → TC-101 → TC-095 → TC-084  
**Multi-seller:** Web TC-021+025 · Mobile TC-083  
**Authorize / cancel / refund (flags needed, see master):** Web TC-143 → TC-152 → TC-162 · Mobile TC-176 → TC-180 → TC-185 · API TC-193, TC-205, TC-214
