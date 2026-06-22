# TripMatch — Brutally Honest Product & Code Audit

> Generated: 2026-06-14  
> Covers: `tripmatch.io` (web), `tripmatch-mobile` (React Native), `tripmatchapi` (backend)

---

## Brand — What Changed

The logo is completely new. It is no longer text-only. There is now a proper brand mark:

- **Icon:** A heptagon (7-sided polygon) containing a merged person + map-pin silhouette — a traveler at a location in one shape
- **Tagline:** "TRAVEL · CONNECT · EXPLORE" — now lives under the wordmark
- **Gradient:** Deep forest green core (`#1E2820`) bleeding to lime green (`#7DC42A`) — darker and more sophisticated than before
- **Multiple variants exist:** dark, light, lime-gradient, mono-dark, mono-light, ocean — a proper brand system
- **The mobile app is not using any of this.** It shows text-only "TripMatch" in Syne font. The new icon and lockup need to come across.

---

## Web (`tripmatch.io`) — Brutal Assessment

### Security — CRITICAL (fix before anyone uses this)

- Google Maps API key and Google OAuth client secret are hardcoded in `.env` and prefixed `NEXT_PUBLIC_` — they are fully visible in the browser bundle. **Rotate them immediately.**
- No `middleware.ts` — `/dashboard`, `/admin`, and `/super-admin` are not protected at the edge. A logged-out user can navigate to them and see UI before a client-side check fires.
- Refresh tokens are stored in `localStorage`, not HTTP-only cookies. Any XSS vulnerability = full account takeover.
- No CSRF protection on POST/PUT/DELETE requests.
- 45 `console.log` statements in production code, some logging form data and API responses.

### Broken Core Features

- **Messaging does not work.** There is a `// TODO: Implement sending message` comment in the messages route. The WebSocket URL is configured but never instantiated in client code. The real-time messaging that is the backbone of this product does not exist on web.
- **Notifications are mocked.** What users see is hardcoded fake data, not real notifications.
- **Email verification is not enforced.** The badge shows "not verified" but the user can use the entire app unverified.
- **Payments are incomplete.** Stripe is wired on the backend but expense splitting has no functional UI.

### Product & UX Problems

- After a 4-step registration, users land on an empty dashboard with no guidance. There is no onboarding whatsoever. This is where most new users will leave and never return.
- Search has no filters for date range, budget, or radius. No way to say "trips in Thailand, under $2,000, next month."
- The matches feature has no way to view a full profile before connecting. You see a card, connect or pass — that is all.
- Trip cards now correctly say "Explore Trip" but mobile still says "Request to Join" directly — inconsistent cross-platform experience.
- Mobile responsiveness is broken on the messages page (fixed 1/3–2/3 split).
- Dismissed matches on mobile are lost on refresh — local state only.

### Business Risks

- Any user can create any trip with no verification — platform can be used for scams immediately.
- No rate limiting means the API can be hammered for free data scraping or brute-force attacks.
- No reporting or blocking UI despite the backend supporting it.
- No ToS or Privacy Policy linked anywhere in the registration flow — **GDPR liability.**
- No CAPTCHA — spam account creation is trivial.

---

## Mobile (`tripmatch-mobile`) — Brutal Assessment

### Security

- `AsyncStorage` is unencrypted SQLite on Android. Access tokens and refresh tokens sit in plain text on the filesystem. Any rooted device = credential theft. **Must switch to `expo-secure-store`.**
- The token refresh has a race condition — two simultaneous 401s will both attempt refresh; one will fail silently.
- The API base URL defaults to `localhost:9000`. On a real physical device or TestFlight build this will fail with no error message.

### What the Mobile Does Not Expose (but the backend can do)

The mobile shows roughly **20% of what the backend offers**. Missing entirely:

| Feature | Backend endpoint | Mobile status |
|---|---|---|
| Trip creation | `POST /trips/create_trip` | ❌ Not built |
| Trip detail view | `GET /trips/:id` | ❌ Not built |
| Notifications center | `GET /notifications` | ❌ No UI |
| Activity feed | `GET /feed` | ❌ Not built |
| Nearby trips (GPS) | `GET /search/nearby` | ❌ Not built |
| Profile editing | `PUT /auth/updateprofile` | ❌ No edit screen |
| Profile photo upload | `POST /uploads/upload_profile_image` | ❌ Not built |
| Travel DNA / archetype | `GET /users/:id/travel-dna` | ❌ Not built |
| Achievements | `GET /users/:id/achievements` | ❌ Not built |
| Bucket list | `GET/POST /users/me/bucket-list` | ❌ Not built |
| Calendar | `GET /calendar/events` | ❌ Not built |
| KYC verification | `POST /kyc/verify` | ❌ Not built |
| Payments / cost split | `POST /payments/create-intent` | ❌ Not built |
| Trip reviews / ratings | `POST /trips/:id/reviews` | ❌ Not built |
| Organizer tools | `POST /organizers/apply` | ❌ Not built |
| Buddy requests inbox | `GET /buddies/requests` | ❌ Not built |
| Block / report user | `POST /users/block/:id` | ❌ No UI |

### UX Dead Ends

- After registering, users are told "verify your email" and dumped back at the login screen. No auto-login, no welcome screen.
- The profile screen shows "Email not verified" with no button to resend the verification email.
- Dismissed match cards reappear every time the screen refreshes — stored only in component state, not persisted.
- The conversation screen header just says "Conversation" — no name, no avatar of who you are talking to.
- Push notifications are registered but the handlers are empty functions. A notification arrives; nothing happens.
- Tab bar uses emoji icons — acceptable for a prototype, will not pass App Store review standards for a serious consumer app.
- No password confirmation field on registration — user can typo and be locked out.
- No "show password" toggle on any auth screen.

### Code Quality Issues

- `unwrap()` helper exists because the backend response envelope is unpredictable — some endpoints return `{ status, data: { ... } }`, others return bare objects. Symptom of an unstandardised API.
- Travel styles and budget ranges are hardcoded arrays in the register screen. Backend additions won't appear.
- WebSocket reconnects every 3 seconds on failure with no exponential backoff — 200 reconnection attempts after a 10-minute network drop.
- Image components use no caching — every re-render may re-fetch profile images.
- No pagination on any list — 30 items fetched, then nothing. No "load more."
- No analytics, no crash reporting (Sentry etc.) — production bugs are invisible.

---

## What Will Drive This to a Billion-Dollar Product

The bones are genuinely good — the Travel DNA matching concept, the group trip organiser model, the buddy system. These are differentiated. But the path to scale requires getting four things right:

### 1. Trust at Every Layer
Airbnb succeeded because strangers trusted each other. TripMatch needs:
- Verified identities (KYC enforcement, not optional)
- Trip reviews with ratings after completion
- Visible reputation scores on profiles
- A reporting system with real human moderation

Without this, one bad actor ruins the product reputation permanently.

### 2. The Payment Layer Is the Business Model
Right now trips have budgets but no money moves through the platform. The moment TripMatch facilitates group booking and cost splitting, it captures transaction fees. That is the actual revenue engine — not subscriptions, not ads. Think **Splitwise meets Airbnb Experiences meets group travel.**

### 3. Real-Time Is Non-Negotiable
Messaging, trip updates, join request notifications — all of it needs to be instant. The WebSocket infrastructure exists on the backend. Not having it on the frontend means users are flying blind. A travel app where you cannot coordinate in real time fails at its core purpose.

### 4. The Network Effect Flywheel
Every successful trip should generate shareable content — a trip recap, photos, ratings. Public trip profiles indexed by search engines. Organisers building a following. Friends inviting friends to join. Right now nothing is shareable and nothing is public. The viral loop is completely absent.

### 5. Travel DNA — The Underused Superpower
The Travel DNA feature is the most underused asset in the entire codebase. It is the **Spotify Wrapped of travel** — deeply personal, shareable, and genuinely compelling. Building it into core onboarding and making it a public profile feature could be the hook that makes this product spread organically.

---

## Priority Fix List

### 🔴 Do Immediately (Security & Legal)
1. Rotate all hardcoded API keys (Google Maps, Google OAuth, Cities API)
2. Implement Next.js `middleware.ts` for protected routes
3. Move tokens to HTTP-only cookies (web) and `expo-secure-store` (mobile)
4. Add CSRF protection
5. Enforce email verification before app access
6. Strip all `console.log` from production builds
7. Add rate limiting on API endpoints
8. Add Privacy Policy and ToS links to registration

### 🟠 This Sprint (Core Feature Completion)
1. Implement real WebSocket messaging on web
2. Replace mocked notifications with real data
3. Build trip detail screen on mobile (Info / Members / Requests tabs)
4. Add "Explore Trip" flow on mobile matching the web
5. Build notifications center on mobile
6. Build buddy requests inbox on mobile
7. Add profile editing + photo upload on mobile
8. Fix the post-registration UX (onboarding, not a dead end)

### 🟡 Next Quarter (Growth & Monetisation)
1. Implement expense splitting / in-app payments (Stripe)
2. Build Travel DNA profile card (shareable, public)
3. Add KYC enforcement
4. Build reporting / blocking UI
5. Add nearby trips with GPS on mobile
6. Implement trip reviews and ratings post-trip
7. Build organiser tools on mobile (trip creation, request management)
8. Add achievements and gamification
9. Build referral and social sharing system
10. Add content moderation (AI + human)

### 🟢 Polish
1. Apply new brand icon and lockup to mobile app
2. Replace emoji tab icons with proper SVG icon set
3. Add search filters (date range, budget, radius, language)
4. Add pre-match messaging (message before connecting)
5. Add video call feature (currently stubbed on web)
6. Implement offline support
7. Add analytics and crash reporting
8. Add deep linking for trips and profiles

---

*End of audit. Update this file as issues are resolved.*
