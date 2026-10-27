# TokoMart Test Scenarios — Buyer (Filtered)

*Derived role index of the Web, API and Mobile scenario files; `test-scenarios.md` is the master index. Update this view together with its platform sources.*

Automation labels below name intended tools, not implemented or passing scripts. Read the platform case's tracking fields for status and evidence. Retained aliases TC-060 → TC-008 and TC-613 → TC-102 must not be imported as independent coverage.

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
| TC-099 | Variant checkout insufficient stock | P1 | Playwright / Playwright-API |
| TC-100 | Two variants same product in cart | P1 | Playwright |
| TC-025 | Multi-seller → 2 orders | P0 | Playwright |
| TC-026 | Order total formula | P0 | Playwright-API |
| TC-027 | Flat $9.99 shipping when the seller set no fee | P1 | Unit (API blocked) |
| TC-028 | A large order still pays the flat shipping fee | P1 | Unit (API blocked) |
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
| TC-060 | Alias of TC-008: guest catalog access | P1 | Track under TC-008 |
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
| TC-232 | Login returns a token | P0 | Playwright-API |
| TC-233 | Login rejects an invalid password | P1 | Playwright-API |
| TC-234 | `GET /api/auth/me` returns the user | P1 | Playwright-API |
| TC-235 | Validate: percentage discount amount | P1 | Playwright-API |
| TC-236 | Percentage discount capped by `maxDiscount` | P1 | Playwright-API / Unit |
| TC-237 | Fixed coupon capped at the order amount | P1 | Playwright-API / Unit |
| TC-238 | Unknown voucher code rejected | P1 | Playwright-API |
| TC-239 | Inactive voucher rejected | P1 | Playwright-API |
| TC-240 | Expired voucher rejected | P1 | Playwright-API |
| TC-241 | Voucher at usage limit rejected | P1 | Playwright-API |
| TC-242 | Voucher not valid for another seller | P1 | Playwright-API |
| TC-243 | Validate needs code, seller id and token | P2 | Playwright-API |
| TC-244 | Validate without order amount | P2 | Playwright-API |
| TC-245 | Malformed seller id handled | P3 | Playwright-API |
| TC-248 | Buyer cannot manage coupons | P0 | Playwright-API |
| TC-251 | Available vouchers list filters | P1 | Playwright-API |
| TC-252 | Applied coupon discounts order, counts one use | P1 | Playwright-API |
| TC-254 | Order creation requires authentication | P1 | Playwright-API |
| TC-255 | Order creation rejects an invalid body | P1 | Playwright-API |
| TC-256 | Unknown product or variant returns 404 | P1 | Playwright-API |
| TC-257 | Delivery option and shipping settings set the fee | P1 | Playwright-API / Unit |
| TC-258 | Variant order uses variant price, discount, attributes | P1 | Playwright-API / Unit |
| TC-259 | Unknown or ineligible coupon does not block the order | P2 | Playwright-API |
| TC-260 | Order deducts stock and counts the sale; cancel restores | P1 | Playwright-API |
| TC-261 | Ordered items leave the server cart | P2 | Playwright-API |
| TC-262 | COD order starts pending with acceptance fields | P1 | Playwright-API |
| TC-263 | No free-shipping boundary at $50 | P1 | Unit (API blocked) |
| TC-264 | Rate limit resets after the window | P2 | Playwright-API |
| TC-265 | Limit set to 0 disables rate limiting | P2 | Playwright-API |
| TC-266 | Checkout routes are rate limited | P2 | Playwright-API |
| TC-268 | Auth routes share one bucket | P2 | Playwright-API |
| TC-269 | Spoofed forwarding header cannot bypass limit | P1 | Playwright-API |
| TC-270 | Separate clients behind the proxy | P1 | Manual |
| TC-271 | 429 response body is consistent | P3 | Playwright-API |
| TC-272 | Review endpoints require authentication | P1 | Playwright-API |
| TC-273 | Create-review validation | P1 | Playwright-API |
| TC-274 | Over-long or malformed values give a client error | P1 | Playwright-API |
| TC-275 | Review needs own delivered order containing the product | P1 | Playwright-API |
| TC-276 | Seller cannot review own product | P2 | Playwright-API |
| TC-277 | Product rating and count follow reviews | P1 | Playwright-API |
| TC-278 | Buyer edits own review | P1 | Playwright-API |
| TC-279 | Cannot edit someone else's review | P0 | Playwright-API |
| TC-280 | Review list public, paged, newest first | P1 | Playwright-API |
| TC-281 | Odd paging values and ids handled safely | P2 | Playwright-API |
| TC-282 | Check endpoint reports whether buyer reviewed | P2 | Playwright-API |
| TC-283 | Two simultaneous reviews create one | P2 | Playwright-API |
| TC-284 | Reviews cannot be deleted | P3 | Playwright-API |
| TC-286 | More protected routes return 401 without a token | P1 | Playwright-API |
| TC-287 | Malformed, expired, foreign tokens rejected | P1 | Playwright-API |
| TC-288 | Buyer blocked from every seller-only route | P0 | Playwright-API |
| TC-289 | Signup validation | P1 | Playwright-API |
| TC-290 | Follow/unfollow counts and idempotence | P1 | Playwright-API |
| TC-291 | Follow/unfollow bad inputs | P2 | Playwright-API |
| TC-292 | User search | P2 | Playwright-API |
| TC-293 | Search text with regex characters | P2 | Playwright-API |
| TC-294 | Public profile, followers, following | P2 | Playwright-API |
| TC-295 | Card order without a payment intent | P0 | Playwright-API |
| TC-296 | Card order with unconfirmed or reused intent | P1 | Playwright-API / Unit |
| TC-297 | Error responses use one envelope | P3 | Playwright-API |
| TC-298 | Health and root endpoints respond | P1 | Playwright-API |
| TC-299 | Unknown routes return JSON 404 | P3 | Playwright-API |
| TC-300 | /health does not reflect the database | P3 | Manual |
| TC-301 | Product with no shipping fee pays flat $9.99 on every platform | P1 | Unit (API blocked) |
| TC-302 | Buyer-pays with no fee configured pays $9.99; explicit 0 stays 0 | P1 | Unit (API blocked) |

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
| TC-613 | Alias of TC-102: variant required | P1 | Track under TC-102 |
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

**Added 2026-10-24 and 2026-10-25:** 26 web + 14 mobile + 88 API buyer-facing scenarios (overlap via parity on shared business rules)

Full steps and selectors: **`docs/test-cases/test-scenarios.md`**

---

## P0 Buyer Smoke

**Web:** TC-001 → TC-013 → TC-016 → TC-022 → TC-098 → TC-030  
**Mobile:** TC-067 → TC-072 → TC-073 → TC-076 → TC-101 → TC-095 → TC-084  
**Multi-seller:** Web TC-021+025 · Mobile TC-083  
**Authorize / cancel / refund (flags needed, see master):** Web TC-143 → TC-152 → TC-162 · Mobile TC-176 → TC-180 → TC-185 · API TC-193, TC-205, TC-214
