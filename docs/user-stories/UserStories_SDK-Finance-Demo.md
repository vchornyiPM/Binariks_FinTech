# User Stories — SDK.Finance Mobile Banking Demo

**Project**: SDK.Finance RND — Mobile Banking Demo
**Source PRD**: `Project Docs/sdk_finance_banking_demo_PRD.txt` v1.0
**Author**: Binariks PM Team
**Date**: March 2025
**Status**: Backlog — Ready for Sprint Planning

---

## Epic Overview

| Epic ID | Name | Priority | Stories |
|---|---|---|---|
| EPIC-01 | Project Foundation & Infrastructure | P0-Critical | US-001 – US-005 |
| EPIC-02 | Authentication | P0-Critical | US-006 – US-008 |
| EPIC-03 | Dashboard & Wallets | P0-Critical | US-009 – US-012 |
| EPIC-04 | Transaction History | P0-Critical | US-013 – US-016 |
| EPIC-05 | P2P Transfer (Send Money) | P0-Critical | US-017 – US-019 |
| EPIC-06 | Currency Exchange (FX) | P0-Critical | US-020 – US-022 |
| EPIC-07 | QR Code Payment | P1-High | US-023 – US-024 |
| EPIC-08 | Profile & KYC | P1-High | US-025 – US-027 |

---

---

# EPIC-01: Project Foundation & Infrastructure

> Scaffold the project, configure tooling, API layer, state management, navigation, and the theme system. All other epics depend on this.

---

## US-001: Project Setup & Environment Configuration

### Story Information
- **Story ID**: US-001
- **Epic**: EPIC-01 — Project Foundation & Infrastructure
- **Related Documents**: PRD §2, §9, §11.1, §11.2
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### User Story
**As a** Binariks engineer,
**I want to** have a fully configured Expo React Native project with all required dependencies installed and environment variables set up,
**So that** the team can begin building features against a consistent, working baseline.

### Acceptance Criteria

**AC-1**: Project initialised with correct stack
```gherkin
Given the repository is cloned
When I run `npm install` followed by `npm start`
Then the Expo dev server starts without errors
And the app loads on an iOS/Android device via Expo Go
```

**AC-2**: All required packages installed
```gherkin
Given I inspect package.json
Then it contains: expo-router, expo-secure-store, expo-linear-gradient,
  expo-blur, expo-haptics, expo-symbols, expo-barcode-scanner,
  axios, zustand, react-native-paper, react-native-reanimated,
  react-native-bottom-sheet, victory-native, react-native-svg
```

**AC-3**: Environment variables configured
```gherkin
Given a .env file exists at project root
Then it contains EXPO_PUBLIC_API_URL, EXPO_PUBLIC_DEMO_EMAIL, EXPO_PUBLIC_DEMO_PASSWORD
And these values are accessible via process.env in the app
And the .env file is listed in .gitignore
```

**AC-4**: TypeScript strict mode enabled
```gherkin
Given I inspect tsconfig.json
Then "strict": true is set
And path alias "@/" is mapped to the project root
```

### Technical Implementation

**Files to create/modify**:
- `package.json` — add all dependencies per PRD §2 and §11.1
- `.env` — env variables (not committed)
- `.env.example` — committed example template
- `tsconfig.json` — strict mode + `@/` alias
- `app.json` — verify `newArchEnabled: true`, `reactCompiler: true`, scheme, plugins

**Install commands**:
```bash
npx expo install expo-router expo-secure-store expo-linear-gradient expo-blur
npx expo install expo-haptics expo-symbols expo-barcode-scanner
npx expo install react-native-safe-area-context react-native-screens
npm install axios zustand react-native-paper
npm install react-native-reanimated react-native-bottom-sheet
npm install victory-native react-native-svg
```

### Definition of Done
- [ ] `npm start` launches without errors on clean install
- [ ] App loads on iOS 16+ and Android 12+ via Expo Go
- [ ] `.env.example` committed, `.env` gitignored
- [ ] TypeScript compiles with zero errors

---

## US-002: API Service Layer (Axios + Auth Interceptors)

### Story Information
- **Story ID**: US-002
- **Epic**: EPIC-01 — Project Foundation & Infrastructure
- **Related Documents**: PRD §7.1, §4.1
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-001

### User Story
**As a** Binariks engineer,
**I want to** have a centralised Axios instance with auth token injection and 401 auto-logout,
**So that** all API calls across the app share a consistent auth and error-handling strategy without per-screen boilerplate.

### Acceptance Criteria

**AC-1**: Auth token injected on every request
```gherkin
Given a valid JWT token is stored in expo-secure-store
When any API service function makes an HTTP request
Then the Authorization: Bearer {token} header is present in the request
```

**AC-2**: 401 triggers automatic logout
```gherkin
Given the user is on the Dashboard
When an API call returns HTTP 401
Then the JWT is cleared from expo-secure-store
And the user is redirected to the Login screen
And a "Session expired" toast is shown
```

**AC-3**: Network errors are surfaced
```gherkin
Given the device has no network connectivity
When any API call is attempted
Then a user-friendly toast message is displayed
And the app does not crash
```

### Technical Implementation

**Files to create**:
- `services/api.ts` — Axios instance, request interceptor (token injection), response interceptor (401 handler)
- `services/auth.service.ts` — `login()`, `logout()` calling `POST /authorization`
- `services/wallet.service.ts` — `getCoins()`, `validateCoin()`
- `services/transfer.service.ts` — `getTemplates()`, `calculateTransfer()`, `executeTransfer()`
- `services/exchange.service.ts` — `getRates()`, `calculateExchange()`, `executeExchange()`
- `services/transactions.service.ts` — `getTransactions()`, `getTransaction(id)`

**Key pattern** (`services/api.ts`):
```typescript
const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) useAuthStore.getState().logout();
  return Promise.reject(error);
});
```

### Definition of Done
- [ ] All 6 service files created with typed request/response interfaces in `types/api.types.ts`
- [ ] 401 interceptor tested manually (revoke token, trigger API call)
- [ ] Network error handled gracefully on all service methods

---

## US-003: Zustand State Stores Scaffolding

### Story Information
- **Story ID**: US-003
- **Epic**: EPIC-01 — Project Foundation & Infrastructure
- **Related Documents**: PRD §7
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-001

### User Story
**As a** Binariks engineer,
**I want to** have all Zustand stores created with their state shape and actions defined,
**So that** feature stories can consume consistent, typed global state without per-story store architecture decisions.

### Acceptance Criteria

**AC-1**: All 5 stores exist and are typed
```gherkin
Given I import any store
Then its state fields and actions match the PRD §7 specification
And all fields are TypeScript typed (no `any`)
```

**AC-2**: authStore persists token correctly
```gherkin
Given the user logs in successfully
When authStore.login(token, user) is called
Then isAuthenticated is true
And token is stored in expo-secure-store
```

**AC-3**: Stores are independent (no circular dependencies)
```gherkin
Given I inspect the store imports
Then no store imports another store directly
```

### Technical Implementation

**Files to create**:

| File | State Fields | Actions |
|---|---|---|
| `stores/auth.store.ts` | `token, user, isAuthenticated` | `login(), logout(), setUser()` |
| `stores/wallet.store.ts` | `coins[], selectedCoin, loading` | `fetchCoins(), setSelectedCoin()` |
| `stores/tx.store.ts` | `transactions[], filters, page, total, loading` | `fetchTransactions(), setFilters(), loadMore()` |
| `stores/fx.store.ts` | `rates{}, lastUpdated, loading` | `fetchRates(), calculate()` |
| `stores/ui.store.ts` | `isLoading, toast{}, activeTab` | `showToast(), hideToast()` |

### Definition of Done
- [ ] All stores compile with zero TypeScript errors
- [ ] `authStore.logout()` clears expo-secure-store and resets all state
- [ ] `uiStore.showToast()` / `hideToast()` work end-to-end with a test component

---

## US-004: Navigation Architecture & Auth Gate

### Story Information
- **Story ID**: US-004
- **Epic**: EPIC-01 — Project Foundation & Infrastructure
- **Related Documents**: PRD §6, §6.1
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-001, US-003

### User Story
**As a** sales demo presenter,
**I want to** be automatically directed to Login when no token exists and to Dashboard when authenticated,
**So that** the demo flow always starts correctly regardless of app state.

### Acceptance Criteria

**AC-1**: Unauthenticated users redirected to Login
```gherkin
Given no JWT token is stored in expo-secure-store
When the app launches
Then the user sees the Login screen
And cannot access any tab screen
```

**AC-2**: Authenticated users go directly to Dashboard
```gherkin
Given a valid JWT token exists in expo-secure-store
When the app launches
Then the user is taken directly to the Dashboard tab
And the Login screen is not shown
```

**AC-3**: Tab bar shows correct screens
```gherkin
Given the user is authenticated and on Dashboard
Then the bottom tab bar shows: Home, History, Exchange, QR, Profile
And each tab navigates to the correct screen
```

**AC-4**: Modal screens work
```gherkin
Given the user taps "Send" on Dashboard
Then the Send Money screen opens as a modal (slides up)
And the back/dismiss gesture closes it
```

### Technical Implementation

**File structure** (per PRD §6):
```
app/
  _layout.tsx              ← auth gate logic
  (auth)/
    login.tsx
    register.tsx
    register-confirm.tsx
  (tabs)/
    _layout.tsx            ← bottom tab navigator
    index.tsx              ← Dashboard
    history.tsx
    exchange.tsx
    qr.tsx
    profile.tsx
  send-money.tsx           ← modal stack
  transaction/[id].tsx     ← dynamic route
  card/[id].tsx
```

**Auth gate pattern** (`app/_layout.tsx`):
```typescript
const token = useAuthStore(s => s.token);
useEffect(() => {
  if (!token) router.replace('/(auth)/login');
}, [token]);
```

### Definition of Done
- [ ] All route files scaffold (can be empty placeholder screens initially)
- [ ] Auth gate redirects unauthenticated users
- [ ] Tab bar renders 5 tabs with correct labels and icons
- [ ] Send Money opens as modal, not push

---

## US-005: Theme System & Design Tokens

### Story Information
- **Story ID**: US-005
- **Epic**: EPIC-01 — Project Foundation & Infrastructure
- **Related Documents**: PRD §8.1, §8.2, FCR CR-2025-001 §8.4
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-001

### User Story
**As a** Binariks engineer,
**I want to** have a complete theme system with light/dark tokens, reusable themed components, and iOS-specific overrides,
**So that** all screens look consistent and automatically adapt to the device's light/dark mode.

### Acceptance Criteria

**AC-1**: Design tokens match PRD spec
```gherkin
Given I inspect constants/theme.ts
Then it exports Colors with light and dark palettes
And all 9 tokens from PRD §8.1 are present (Primary Blue, Dark Navy, Background, Card BG, Success Green, Error Red, Text Primary, Text Secondary, Border)
And dark mode uses iOS system colour values per FCR CR-2025-001
```

**AC-2**: useThemeColor resolves correctly
```gherkin
Given the device is in dark mode
When a component calls useThemeColor({}, 'background')
Then it receives #000000 (iOS true black)
```

**AC-3**: Shared components use theme
```gherkin
Given ThemedText and ThemedView are rendered
Then text and background colours update when system theme changes
And no hardcoded colour values exist in these components
```

### Technical Implementation

**Files to create/modify**:
- `constants/theme.ts` — `Colors` (light/dark) + `Fonts` (IOSFonts scale from FCR)
- `constants/animations.ts` — `IOSSpring` and `IOSTiming` presets (from FCR CR-2025-001)
- `hooks/use-theme-color.ts` — existing hook, verify compatibility
- `hooks/use-color-scheme.ts` — existing hook, verify
- `components/ThemedText.tsx` — extends with `variant` prop (largeTitle, body, etc.)
- `components/ThemedView.tsx` — existing, verify

### Definition of Done
- [ ] Light/dark mode toggles correctly on both iOS and Android
- [ ] `ThemedText` supports all type variants from `IOSFonts`
- [ ] Zero hardcoded colour strings in any component (ESLint rule recommended)

---

---

# EPIC-02: Authentication

> Login, session management, and logout flows. Entry point for every demo.

---

## US-006: Login Screen

### Story Information
- **Story ID**: US-006
- **Epic**: EPIC-02 — Authentication
- **Related Documents**: PRD §4.1, §5.1, AC-01, AC-07, AC-09
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-002, US-003, US-004, US-005

### User Story
**As a** Binariks sales manager,
**I want to** log in with demo credentials that are pre-filled from environment variables,
**So that** I can start the demo instantly with a single tap without typing credentials in front of a client.

### Acceptance Criteria

**AC-1**: Credentials pre-populated on mount
```gherkin
Given EXPO_PUBLIC_DEMO_EMAIL and EXPO_PUBLIC_DEMO_PASSWORD are set in .env
When the Login screen mounts
Then the email field shows the demo email
And the password field shows the demo password (masked)
```

**AC-2**: Successful login navigates to Dashboard
```gherkin
Given valid credentials are entered
When the user taps "Sign In"
Then POST /authorization is called
And on 200 response the JWT token is saved in expo-secure-store
And the user is navigated to the Dashboard tab
And a success haptic (notificationAsync Success) fires
```

**AC-3**: Invalid credentials show error toast
```gherkin
Given incorrect credentials are entered
When the user taps "Sign In"
Then POST /authorization returns 401
And an error toast "Invalid credentials. Please try again." is shown
And an error haptic (notificationAsync Error) fires
And the user remains on the Login screen
```

**AC-4**: Loading state during auth
```gherkin
Given the user taps "Sign In"
When the API call is in-flight
Then the Sign In button shows a loading spinner
And the button is disabled (prevents double-submit)
```

**AC-5**: No hardcoded credentials
```gherkin
Given I grep the source code for any password string
Then no hardcoded password appears outside of .env
```

### Technical Implementation

**File**: `app/(auth)/login.tsx`

**UI Layout**:
```
┌─────────────────────────────────────┐
│         SDK.Finance Logo            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Email          [demo@...]  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  Password        [••••••]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Sign In  [→]         │    │
│  └─────────────────────────────┘    │
│                                     │
│       Demo Mode Indicator           │
└─────────────────────────────────────┘
```

**Key implementation notes**:
- `KeyboardAvoidingView behavior='padding'` on iOS
- `SecureTextEntry` on password field
- Call `authService.login()` → store token via `authStore.login()`
- Navigate with `router.replace('/(tabs)')` on success
- Pre-fill: `defaultValue={process.env.EXPO_PUBLIC_DEMO_EMAIL}`

### Error Handling
| Condition | Error Code | User Message | System Action |
|---|---|---|---|
| 401 Unauthorized | AUTH_INVALID | "Invalid credentials. Please try again." | Stay on login |
| Network error | NETWORK_ERROR | "No connection. Check your network." | Stay on login |
| Server error (5xx) | SERVER_ERROR | "Service unavailable. Try again shortly." | Stay on login |

### Definition of Done
- [ ] Pre-fill works from env vars
- [ ] Token saved in expo-secure-store after login
- [ ] Error states show toasts (not raw error objects)
- [ ] Haptics fire on success and error
- [ ] No hardcoded credentials in source (AC-09 from PRD)
- [ ] Tested on iOS 16+ and Android 12+

---

## US-007: Auth Token Persistence & Session Management

### Story Information
- **Story ID**: US-007
- **Epic**: EPIC-02 — Authentication
- **Related Documents**: PRD §6.1, §7
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-002, US-003, US-004

### User Story
**As a** demo presenter,
**I want to** stay logged in when I reopen the app during a demo,
**So that** I don't have to re-authenticate mid-presentation when switching between apps.

### Acceptance Criteria

**AC-1**: Session restored on app relaunch
```gherkin
Given the user logged in during a previous session
When the app is closed and reopened
Then the JWT is retrieved from expo-secure-store
And the user lands on Dashboard without seeing Login
```

**AC-2**: Expired/invalid token clears session
```gherkin
Given a stored token has expired
When any authenticated API call returns 401
Then the token is deleted from expo-secure-store
And the user is redirected to Login
And a "Session expired, please sign in again" toast is shown
```

### Technical Implementation

**Files to modify**:
- `app/_layout.tsx` — on mount, read token from SecureStore, hydrate `authStore`
- `stores/auth.store.ts` — `logout()` calls `SecureStore.deleteItemAsync('jwt')`
- `services/api.ts` — 401 interceptor calls `authStore.getState().logout()`

### Definition of Done
- [ ] App resumes to Dashboard on relaunch with valid token
- [ ] 401 interceptor triggers logout and redirect
- [ ] SecureStore key `'jwt'` used consistently across all files

---

## US-008: Logout

### Story Information
- **Story ID**: US-008
- **Epic**: EPIC-02 — Authentication
- **Related Documents**: PRD §5.7, AC-07
- **Status**: Backlog
- **Story Points**: 1
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-006, US-007, US-025

### User Story
**As a** sales manager,
**I want to** log out via the Profile screen with a confirmation prompt,
**So that** I can reset the demo state securely before a new client presentation.

### Acceptance Criteria

**AC-1**: Logout confirmation shown
```gherkin
Given I am on the Profile screen
When I tap the "Logout" button
Then a native iOS Alert appears: "Log Out?" with "Log Out" (destructive) and "Cancel" buttons
```

**AC-2**: Confirmed logout clears state and navigates to Login
```gherkin
Given the logout confirmation Alert is showing
When I tap the destructive "Log Out" button
Then the JWT is deleted from expo-secure-store
And all Zustand stores are reset to initial state
And I am redirected to the Login screen
```

**AC-3**: Cancel dismisses without action
```gherkin
Given the logout Alert is showing
When I tap "Cancel"
Then the alert dismisses
And I remain on the Profile screen
```

### Technical Implementation

**File**: `app/(tabs)/profile.tsx`
```typescript
const handleLogout = () => {
  if (Platform.OS === 'ios') {
    Alert.alert('Log Out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => authStore.logout() },
    ]);
  } else {
    // Android: custom bottom sheet confirmation
  }
};
```

### Definition of Done
- [ ] Native Alert used on iOS (destructive button style)
- [ ] All stores reset on logout
- [ ] Redirected to Login after logout (AC-07 verified)

---

---

# EPIC-03: Dashboard & Wallets

> The "wow" screen — multi-currency wallet cards, balance overview, and quick actions.

---

## US-009: Wallet Cards — Balance Overview

### Story Information
- **Story ID**: US-009
- **Epic**: EPIC-03 — Dashboard & Wallets
- **Related Documents**: PRD §4.2, §5.2, §8.2, AC-02
- **Status**: Backlog
- **Story Points**: 5
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-002, US-003, US-005

### User Story
**As a** demo presenter,
**I want to** show prospective clients a visually stunning dashboard with multi-currency wallet cards displaying real balances,
**So that** clients immediately understand the platform's multi-currency capabilities.

### Acceptance Criteria

**AC-1**: Wallets loaded from API
```gherkin
Given the user is on the Dashboard
When the screen mounts
Then GET /coins is called
And at least one WalletCard is rendered per coin returned
And each card shows: balance, currency code, currency symbol, coin serial (last 4 digits)
```

**AC-2**: Cards are horizontally scrollable
```gherkin
Given multiple coins are returned
When I swipe horizontally on the wallet cards
Then the cards scroll smoothly
And the active card snaps to centre
And a haptic selectionAsync fires on snap
```

**AC-3**: WalletCard visual design
```gherkin
Given a WalletCard is rendered
Then it shows a navy-to-blue LinearGradient background
And the balance uses SF Pro Display Heavy 28pt (tabular numbers)
And the currency name uses SF Pro Text Medium 15pt
And the card has 16pt corner radius
```

**AC-4**: Skeleton shown while loading
```gherkin
Given the Dashboard is loading
When GET /coins is in-flight
Then SkeletonLoader cards are shown in place of WalletCards
And no empty state is shown
```

### Technical Implementation

**Files to create/modify**:
- `app/(tabs)/index.tsx` — Dashboard screen
- `components/WalletCard.tsx` — gradient card component
- `components/SkeletonLoader.tsx` — shimmer placeholder
- `hooks/useWallets.ts` — wraps `walletStore.fetchCoins()`

**WalletCard props**:
```typescript
interface WalletCardProps {
  coinSerial: string;
  balance: number;
  currencyCode: string;
  currencySymbol: string;
  name: string;
  isSelected: boolean;
  onPress: () => void;
}
```

**API**: `GET /coins`
Key response fields: `coinSerial`, `balance`, `currency.code`, `currency.symbol`, `name`, `type`

### Definition of Done
- [ ] Minimum 2 wallet cards render with real API data (AC-02)
- [ ] LinearGradient applied to each card
- [ ] Skeleton shown during load
- [ ] Haptic on card scroll snap
- [ ] Tested on iPhone with Dynamic Island (safe area correct)

---

## US-010: Dashboard Quick Action Buttons

### Story Information
- **Story ID**: US-010
- **Epic**: EPIC-03 — Dashboard & Wallets
- **Related Documents**: PRD §5.2
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-004, US-009

### User Story
**As a** demo presenter,
**I want to** tap quick action buttons (Send, Receive, Exchange, Top-Up) that navigate to the correct screen,
**So that** the demo flow is fast and intuitive for clients watching.

### Acceptance Criteria

**AC-1**: All 4 quick actions render
```gherkin
Given I am on Dashboard
Then I see 4 quick action buttons: Send, Receive (QR), Exchange, Top-Up
And each has an SF Symbol icon and a label
```

**AC-2**: Buttons navigate correctly
```gherkin
Given I tap "Send"
Then the Send Money modal opens

Given I tap "Receive"
Then the QR screen opens showing "Show My QR" tab

Given I tap "Exchange"
Then the Exchange tab screen is focused

Given I tap "Top-Up"
Then a "Coming soon" toast is shown (top-up flow is out of demo scope)
```

**AC-3**: Button press haptic
```gherkin
When any quick action button is tapped
Then impactAsync(Medium) haptic fires
And the button scales to 0.92 then back to 1.0 (IOSSpring.snappy)
```

### Technical Implementation

**File**: `app/(tabs)/index.tsx`

| Button | Icon (SF Symbol) | Action |
|---|---|---|
| Send | `paperplane.fill` | `router.push('/send-money')` |
| Receive | `qrcode.viewfinder` | `router.push('/(tabs)/qr')` |
| Exchange | `arrow.left.arrow.right.circle.fill` | `router.push('/(tabs)/exchange')` |
| Top-Up | `plus.circle.fill` | `uiStore.showToast('Top-up coming soon')` |

### Definition of Done
- [ ] All 4 buttons render with SF Symbol icons on iOS
- [ ] Navigation targets correct screens
- [ ] Haptic + spring animation on press
- [ ] 44×44pt minimum tap target

---

## US-011: Recent Transactions Widget

### Story Information
- **Story ID**: US-011
- **Epic**: EPIC-03 — Dashboard & Wallets
- **Related Documents**: PRD §4.5, §5.2
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-002, US-003, US-009

### User Story
**As a** demo presenter,
**I want to** show the 5 most recent transactions on the Dashboard,
**So that** clients can see real transaction data depth immediately without navigating away.

### Acceptance Criteria

**AC-1**: Last 5 transactions shown
```gherkin
Given the Dashboard loads
When POST /transactions/view is called with pageSize: 5
Then up to 5 TransactionRow items are rendered below the quick actions
And each row shows: type icon, counterparty name, date, amount (+/- coloured)
```

**AC-2**: Tap navigates to detail
```gherkin
Given a transaction row is displayed
When I tap the row
Then I am navigated to transaction/[id] with the transaction's ID
```

**AC-3**: Empty state handled
```gherkin
Given the user has no transactions
When POST /transactions/view returns an empty list
Then a "No transactions yet" placeholder is shown
And the app does not crash
```

### Technical Implementation

**Files**:
- `app/(tabs)/index.tsx` — add transactions section below quick actions
- `components/TransactionRow.tsx` — reusable row (also used in History screen)

**TransactionRow props**:
```typescript
interface TransactionRowProps {
  id: string;
  type: 'TRANSFER' | 'EXCHANGE' | 'TOP_UP' | 'WITHDRAW';
  counterparty: string;
  date: string;
  amount: number;
  currency: string;
  onPress: () => void;
}
```

Amount colour rule: positive amounts → `Colors.successGreen`, negative → `Colors.errorRed`

### Definition of Done
- [ ] 5 most recent transactions display on Dashboard
- [ ] Tap opens Transaction Detail
- [ ] Amount colouring correct (green/red)
- [ ] Skeleton shown during load

---

## US-012: Pull-to-Refresh on Dashboard

### Story Information
- **Story ID**: US-012
- **Epic**: EPIC-03 — Dashboard & Wallets
- **Related Documents**: PRD §5.2
- **Status**: Backlog
- **Story Points**: 1
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-009, US-011

### User Story
**As a** demo presenter,
**I want to** pull down to refresh the Dashboard after executing a transfer or exchange,
**So that** updated balances are visible immediately after demonstrating a transaction.

### Acceptance Criteria

**AC-1**: Pull-to-refresh triggers data reload
```gherkin
Given I am on the Dashboard
When I pull the scroll view downward past the threshold
Then GET /coins and POST /transactions/view are both called
And a Light haptic fires at the pull threshold
And the refreshing indicator is shown while data loads
And data updates when the calls complete
```

### Technical Implementation

Use `RefreshControl` on the `ScrollView`:
```typescript
<ScrollView refreshControl={
  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
}>
```

`handleRefresh` calls `walletStore.fetchCoins()` and `txStore.fetchTransactions()` in parallel.

### Definition of Done
- [ ] Both wallets and transactions reload on pull
- [ ] Haptic fires at threshold
- [ ] Refresh indicator dismisses after data loads

---

---

# EPIC-04: Transaction History

> Paginated history list with filters, charts, and detail views.

---

## US-013: Transaction History List

### Story Information
- **Story ID**: US-013
- **Epic**: EPIC-04 — Transaction History
- **Related Documents**: PRD §4.5, §5.4, AC-04
- **Status**: Backlog
- **Story Points**: 5
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-002, US-003, US-005

### User Story
**As a** demo presenter,
**I want to** show a paginated transaction history list that loads automatically as I scroll,
**So that** clients can see the breadth of transaction data and the platform's ledger capabilities.

### Acceptance Criteria

**AC-1**: Transaction list loads with pagination
```gherkin
Given I navigate to the History tab
When POST /transactions/view is called with pageSize: 20, pageNumber: 0
Then up to 20 TransactionRow items are rendered
And each row shows: type icon, counterparty name, date, signed amount
```

**AC-2**: Infinite scroll loads more
```gherkin
Given I have scrolled to the bottom of the list
When there are more transactions available (total > current page)
Then POST /transactions/view is called with the next pageNumber
And new rows are appended to the list
And a loading indicator shows at the bottom while fetching
```

**AC-3**: Pull-to-refresh resets to page 0
```gherkin
Given I pull to refresh the History screen
Then pageNumber resets to 0
And the transaction list is replaced with fresh data
```

### Technical Implementation

**Files**:
- `app/(tabs)/history.tsx`
- `components/TransactionRow.tsx` (shared with Dashboard)
- `hooks/useTransactions.ts`
- `stores/tx.store.ts` — `loadMore()` appends to `transactions[]`

**API**: `POST /transactions/view`
```json
{
  "pageNumber": 0,
  "pageSize": 20,
  "coinSerial": "optional filter"
}
```

### Definition of Done
- [ ] First page loads on screen mount
- [ ] Infinite scroll appends next pages
- [ ] Skeleton shown on initial load
- [ ] Pull-to-refresh resets to page 0

---

## US-014: Transaction Filters

### Story Information
- **Story ID**: US-014
- **Epic**: EPIC-04 — Transaction History
- **Related Documents**: PRD §4.5, §5.4, AC-04
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-013

### User Story
**As a** demo presenter,
**I want to** filter transactions by type (All, Transfer, Exchange, Top-Up),
**So that** I can demonstrate to clients that the platform maintains a granular, filterable ledger.

### Acceptance Criteria

**AC-1**: Filter chips render and are selectable
```gherkin
Given I am on the History screen
Then I see filter chips: All, Transfer, Exchange, Top-Up
And "All" is selected by default
When I tap "Transfer"
Then the chip becomes active (highlighted)
And selectionAsync haptic fires
```

**AC-2**: Filter updates the transaction list
```gherkin
Given I tap the "Exchange" filter chip
When POST /transactions/view is called with type: "EXCHANGE"
Then only Exchange transactions are shown in the list
And the list resets to page 0
```

**AC-3**: "All" shows unfiltered results
```gherkin
Given a type filter is active
When I tap "All"
Then POST /transactions/view is called without a type filter
And all transaction types are shown
```

### Technical Implementation

**File**: `app/(tabs)/history.tsx`

Filter chip state managed in `txStore.filters.type`. Chip variants:

| Label | API value |
|---|---|
| All | `undefined` |
| Transfer | `'TRANSFER'` |
| Exchange | `'EXCHANGE'` |
| Top-Up | `'TOP_UP'` |

### Definition of Done
- [ ] All 4 filter chips render
- [ ] Selecting a chip re-fetches with correct filter
- [ ] Active chip is visually distinct (filled vs outline)
- [ ] Haptic on selection (AC-04 verified with filter demo)

---

## US-015: Transaction Detail Screen

### Story Information
- **Story ID**: US-015
- **Epic**: EPIC-04 — Transaction History
- **Related Documents**: PRD §4.5, §5.4
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-013

### User Story
**As a** demo presenter,
**I want to** tap a transaction and see its full details in a modal sheet,
**So that** clients can see that every transaction is fully recorded with amounts, fees, dates, and IDs.

### Acceptance Criteria

**AC-1**: Detail screen shows all fields
```gherkin
Given I tap a transaction row
When GET /transactions/{id} is called
Then the detail screen shows: transaction ID, type, amount, fee, date/time, status, counterparty, currency
```

**AC-2**: Transaction ID is copyable
```gherkin
Given I am on the transaction detail screen
When I tap the transaction ID
Then the ID is copied to clipboard
And a Light haptic fires
And a "Copied!" toast is shown
```

### Technical Implementation

**File**: `app/transaction/[id].tsx`
Presented as `presentation: 'modal'` from History list.

### Definition of Done
- [ ] All key fields from `GET /transactions/{id}` are displayed
- [ ] Copy-to-clipboard works on transaction ID
- [ ] Screen presented as modal card (iOS sheet style)

---

## US-016: 7-Day Spending Bar Chart

### Story Information
- **Story ID**: US-016
- **Epic**: EPIC-04 — Transaction History
- **Related Documents**: PRD §5.4
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-013

### User Story
**As a** demo presenter,
**I want to** show a 7-day spending bar chart at the top of the History screen,
**So that** clients can see the platform's analytics potential and the visual richness of the app.

### Acceptance Criteria

**AC-1**: Chart renders with real data
```gherkin
Given I am on the History screen
When transaction data is loaded
Then a bar chart shows 7 bars representing the last 7 days
And each bar height reflects the total outgoing amount for that day
And day labels appear on the X axis (Mon, Tue, etc.)
```

**AC-2**: Chart uses Victory Native
```gherkin
Given the chart is rendered
Then it uses VictoryBar from victory-native
And bar colour matches the Primary Blue design token (#1A56DB)
```

**AC-3**: No crash on empty data
```gherkin
Given fewer than 7 days of transactions exist
Then missing days show as zero-height bars
And the chart does not crash or show undefined
```

### Technical Implementation

**File**: `app/(tabs)/history.tsx`

Data transformation: group `txStore.transactions` by `createdAt` date, sum absolute amounts per day for last 7 days.
```typescript
import { VictoryBar, VictoryChart } from 'victory-native';
```

### Definition of Done
- [ ] 7 bars render (zero-filled for missing days)
- [ ] Victory Native used (not a custom SVG)
- [ ] No crash on empty transaction list

---

---

# EPIC-05: P2P Transfer (Send Money)

> Live money movement — the key "proof of platform" demo moment.

---

## US-017: Recipient Search & Transfer Setup

### Story Information
- **Story ID**: US-017
- **Epic**: EPIC-05 — P2P Transfer
- **Related Documents**: PRD §4.3, §4.6, §5.3
- **Status**: Backlog
- **Story Points**: 5
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-002, US-003, US-009

### User Story
**As a** demo presenter,
**I want to** search for a recipient by name and select my source wallet on the Send Money screen,
**So that** clients see a familiar, polished payment UX that mirrors consumer banking apps.

### Acceptance Criteria

**AC-1**: Recipient autocomplete works
```gherkin
Given I type at least 2 characters in the recipient field
When POST /users/view is called with the search term
Then a dropdown shows matching users
And I can tap a user to select them as recipient
```

**AC-2**: Source wallet selector
```gherkin
Given I have multiple coins
When I tap the wallet selector
Then an ActionSheetIOS (iOS) or bottom sheet (Android) shows my coins
And I can select the coin to send from
And the selected coin's balance is shown
```

**AC-3**: Amount input validation
```gherkin
Given I have entered a recipient and source wallet
When I enter an amount greater than my available balance
Then an inline error "Insufficient balance" is shown
And the Confirm button is disabled
```

### Technical Implementation

**File**: `app/send-money.tsx`

**Transfer flow** (PRD §4.3):
1. `GET /coins` → populate wallet selector
2. `POST /users/view` → recipient search
3. `POST /templates/transfer/view` → get transfer templates
4. On amount entry → trigger US-018 (fee calculation)

### Definition of Done
- [ ] Recipient search returns results from API
- [ ] Wallet selector uses ActionSheetIOS on iOS
- [ ] Balance validation prevents overspend
- [ ] Amount formatted with locale (toLocaleString)

---

## US-018: Transfer Fee Preview

### Story Information
- **Story ID**: US-018
- **Epic**: EPIC-05 — P2P Transfer
- **Related Documents**: PRD §4.3, §5.3
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-017

### User Story
**As a** demo presenter,
**I want to** show the transfer fee inline before the client confirms,
**So that** clients see the platform's transparent fee engine and real-time calculation capability.

### Acceptance Criteria

**AC-1**: Fee calculated inline
```gherkin
Given recipient and amount are entered
When the amount field loses focus
Then POST /templates/transfer/{id}/calculate is called
And the fee amount is shown inline below the amount input
And the total (amount + fee) is shown
```

**AC-2**: Fee updates on amount change (debounced)
```gherkin
Given the fee is already shown
When the user changes the amount
Then after 500ms debounce POST /templates/transfer/{id}/calculate is re-called
And the fee display updates
```

**AC-3**: Confirm sheet shows full summary
```gherkin
Given the user taps "Continue"
Then a ConfirmSheet bottom sheet slides up
And it shows: recipient name, source wallet, amount, fee, total
And a "Send Money" button and "Cancel" button
```

### Technical Implementation

**Files**:
- `app/send-money.tsx` — debounced fee calculation
- `components/ConfirmSheet.tsx` — bottom sheet summary

**API**: `POST /templates/transfer/{id}/calculate`
```json
{ "amount": 100, "coinSerial": "coin-serial-here" }
```

### Definition of Done
- [ ] Fee displayed inline, updates on amount change
- [ ] 500ms debounce on calculation trigger
- [ ] ConfirmSheet shows all 5 summary fields

---

## US-019: Execute Transfer & Success Screen

### Story Information
- **Story ID**: US-019
- **Epic**: EPIC-05 — P2P Transfer
- **Related Documents**: PRD §4.3, §5.3, AC-03
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-018

### User Story
**As a** demo presenter,
**I want to** execute the transfer and see a success screen with the transaction ID,
**So that** clients witness real money movement on the SDK.Finance platform in real time.

### Acceptance Criteria

**AC-1**: Transfer executes and returns businessProcessId
```gherkin
Given the ConfirmSheet is showing
When I tap "Send Money"
Then POST /templates/transfer/{id}/execute is called
And on success I see a success screen with the businessProcessId
And a Success haptic (notificationAsync Success) fires
And the animated checkmark entrance plays (IOSSpring.bouncy)
```

**AC-2**: Dashboard balance updates optimistically
```gherkin
Given the transfer succeeds
When I navigate back to Dashboard
Then the wallet balance reflects the deducted amount immediately
And a background refresh reconciles the real balance
```

**AC-3**: Transfer failure handled
```gherkin
Given the transfer API returns an error
Then the ConfirmSheet dismisses
And an error toast shows the reason
And the Send Money form remains populated so the user can retry
```

### Technical Implementation

**File**: `app/send-money.tsx` — success state renders inline or navigates to a success screen

**Success screen elements**:
- Animated checkmark (scale: 0 → 1, `IOSSpring.bouncy`)
- "Transfer Successful" heading
- Amount sent + recipient name
- Transaction reference (businessProcessId) with copy button
- "Back to Dashboard" button

### Definition of Done
- [ ] `POST /templates/transfer/{id}/execute` called on confirm
- [ ] `businessProcessId` displayed on success (AC-03)
- [ ] Success haptic fires
- [ ] Spring animation on checkmark
- [ ] Error handled with toast

---

---

# EPIC-06: Currency Exchange (FX)

> Live rates, instant conversion, the platform's multi-currency engine on show.

---

## US-020: FX Screen — Currency Selection & Live Rate Polling

### Story Information
- **Story ID**: US-020
- **Epic**: EPIC-06 — Currency Exchange
- **Related Documents**: PRD §4.4, §5.5
- **Status**: Backlog
- **Story Points**: 5
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-002, US-003, US-005

### User Story
**As a** demo presenter,
**I want to** show live exchange rates that auto-refresh every 30 seconds,
**So that** clients see the platform's real-time currency engine as a demo talking point.

### Acceptance Criteria

**AC-1**: Rate banner shows current rate
```gherkin
Given I am on the Exchange screen
When POST /exchange-rates/view is called
Then the current rate for the selected currency pair is shown in a banner
And the "last updated" timestamp is shown
```

**AC-2**: Rates poll every 30 seconds
```gherkin
Given I stay on the Exchange screen for 31 seconds
Then POST /exchange-rates/view is called again automatically
And the rate banner updates with the new value
```

**AC-3**: Currency selectors work
```gherkin
Given I tap the "From" currency selector
Then a list of available currencies (from GET /currencies) is shown
And I can select a currency
And the rate banner updates for the new pair
```

**AC-4**: Polling stops when screen is unfocused
```gherkin
Given polling is active
When I navigate away from the Exchange screen
Then the 30-second interval is cleared (no background polling)
```

### Technical Implementation

**Files**:
- `app/(tabs)/exchange.tsx`
- `hooks/useExchangeRates.ts` — encapsulates polling logic
- `stores/fx.store.ts`

**Polling pattern**:
```typescript
useEffect(() => {
  fetchRates();
  const interval = setInterval(fetchRates, 30_000);
  return () => clearInterval(interval);
}, [fromCurrency, toCurrency]);
```

In-memory sparkline: store last 10 rate values in `fxStore.rateHistory[]` for the mini sparkline.

### Definition of Done
- [ ] Rate banner shows on screen mount
- [ ] Auto-refresh every 30s confirmed (key demo talking point, PRD §4.4)
- [ ] Currency selector populated from GET /currencies
- [ ] Interval cleared on screen blur

---

## US-021: FX Calculation Preview

### Story Information
- **Story ID**: US-021
- **Epic**: EPIC-06 — Currency Exchange
- **Related Documents**: PRD §4.4, §5.5
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-020

### User Story
**As a** demo presenter,
**I want to** type an amount and see the converted value update in real time,
**So that** clients see the instant calculation capability of the FX engine.

### Acceptance Criteria

**AC-1**: Converted amount previews in real time
```gherkin
Given I have selected a currency pair
When I type an amount in the "From" field
Then after 500ms debounce POST /exchange/calculate is called
And the "To" amount field updates with the result
```

**AC-2**: Rate sparkline shows history
```gherkin
Given I have been on the screen for at least 2 polling cycles
Then a mini sparkline chart shows the last 10 rate data points
And it uses Victory Native VictoryLine
```

### Technical Implementation

**File**: `app/(tabs)/exchange.tsx`

**API**: `POST /exchange/calculate`
```json
{ "from": "USD", "to": "EUR", "amount": 100, "coinSerial": "..." }
```
Debounce with 500ms using `useRef` + `setTimeout`.

### Definition of Done
- [ ] Debounced calculation (500ms) updates "To" field
- [ ] Sparkline renders from in-memory rate history
- [ ] Zero/empty amount clears the "To" field gracefully

---

## US-022: Execute Currency Exchange

### Story Information
- **Story ID**: US-022
- **Epic**: EPIC-06 — Currency Exchange
- **Related Documents**: PRD §4.4, §5.5, AC-05
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P0-Critical

### Dependencies
**Blocked by**: US-021

### User Story
**As a** demo presenter,
**I want to** execute a currency exchange and see the updated wallet balances,
**So that** clients see a live cross-currency transaction completing on the platform.

### Acceptance Criteria

**AC-1**: Exchange confirmation shown
```gherkin
Given amount and currency pair are entered
When I tap "Exchange Now"
Then a ConfirmSheet shows: from amount/currency, to amount/currency, rate, fee
And a "Confirm Exchange" button
```

**AC-2**: Exchange executes successfully
```gherkin
Given the confirmation sheet is showing
When I tap "Confirm Exchange"
Then POST /exchange/execute is called
And on success a success screen is shown with exchange summary
And a Success haptic fires
And wallets are refreshed (AC-05)
```

### Technical Implementation

**File**: `app/(tabs)/exchange.tsx`

**API**: `POST /exchange/execute`
```json
{ "from": "USD", "to": "EUR", "amount": 100, "coinSerial": "...", "rateCoinSerial": "..." }
```

### Definition of Done
- [ ] Confirm sheet shows before execution
- [ ] POST /exchange/execute called on confirm
- [ ] Success screen shown on 200 response (AC-05)
- [ ] Wallet balances refresh after exchange

---

---

# EPIC-07: QR Code Payment

> Modern UX for the PoS story — should priority.

---

## US-023: Show My QR Code

### Story Information
- **Story ID**: US-023
- **Epic**: EPIC-07 — QR Code Payment
- **Related Documents**: PRD §4.8, §5.6
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-003, US-009

### User Story
**As a** demo presenter,
**I want to** show a QR code encoding the user's default wallet,
**So that** clients can scan it to simulate a real QR payment flow.

### Acceptance Criteria

**AC-1**: QR code renders for default wallet
```gherkin
Given I am on the QR screen, "Show My QR" tab
When the screen mounts
Then a QR code is rendered encoding: { coinSerial, name }
And the user's wallet name and last-4 of coinSerial are shown below the QR
```

**AC-2**: QR is scannable
```gherkin
Given the QR is displayed
When scanned with a device camera
Then the decoded payload contains a valid coinSerial
```

### Technical Implementation

**File**: `app/(tabs)/qr.tsx`

**QR payload**:
```json
{ "coinSerial": "XXXX-XXXX-XXXX", "name": "Main USD Wallet" }
```

Use `qrcode-svg` rendered inside a `WebView` or `react-native-svg` for native rendering.

### Definition of Done
- [ ] QR renders with correct coinSerial payload
- [ ] QR is scannable (verified with device camera)
- [ ] AC-06 (PRD acceptance criterion) met

---

## US-024: Scan QR & Pre-fill Send Money

### Story Information
- **Story ID**: US-024
- **Epic**: EPIC-07 — QR Code Payment
- **Related Documents**: PRD §4.8, §5.6
- **Status**: Backlog
- **Story Points**: 3
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-017, US-023

### User Story
**As a** demo presenter,
**I want to** scan a QR code and have the Send Money form pre-filled automatically,
**So that** clients see a seamless PoS-style payment initiation.

### Acceptance Criteria

**AC-1**: Camera opens on Scan tab
```gherkin
Given I tap the "Scan" tab on the QR screen
Then the camera preview opens via expo-barcode-scanner
And a viewfinder overlay is shown
```

**AC-2**: Successful scan pre-fills Send Money
```gherkin
Given a valid SDK.Finance QR code is scanned
When the payload { coinSerial, amount, currency, recipientName } is parsed
Then the Send Money modal opens pre-filled with recipient and amount
And a Success haptic fires
```

**AC-3**: Invalid QR shows error
```gherkin
Given an unrecognised QR code is scanned
Then an error toast "Invalid payment QR code" is shown
And the camera remains open
```

### Technical Implementation

**File**: `app/(tabs)/qr.tsx`
```typescript
<BarCodeScanner onBarCodeScanned={handleScan} />
```

On successful parse: `router.push({ pathname: '/send-money', params: { coinSerial, amount } })`

### Definition of Done
- [ ] Camera opens with permission request on first use
- [ ] Valid QR navigates to pre-filled Send Money
- [ ] Invalid QR shows toast without crash

---

---

# EPIC-08: Profile & KYC

> Compliance story and demo reset — should priority.

---

## US-025: Profile Screen

### Story Information
- **Story ID**: US-025
- **Epic**: EPIC-08 — Profile & KYC
- **Related Documents**: PRD §4.6, §5.7
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-002, US-003, US-006

### User Story
**As a** demo presenter,
**I want to** show the user profile screen with account details,
**So that** clients understand that the platform stores user identity and can support KYC/AML compliance.

### Acceptance Criteria

**AC-1**: Profile data loads from API
```gherkin
Given I navigate to the Profile tab
When GET /profile is called
Then the screen shows: user initials avatar, full name, email, registration date, user ID
And the app version and "Demo Mode" indicator are shown at the bottom
```

**AC-2**: Large title on iOS
```gherkin
Given I am on the Profile screen on iOS
Then the navigation bar uses a large title "Profile"
And it collapses on scroll per iOS HIG
```

### Technical Implementation

**File**: `app/(tabs)/profile.tsx`

Avatar: if no profile image, render a circle with user initials using `Colors.primaryBlue` background.

### Definition of Done
- [ ] GET /profile data populates all fields
- [ ] Large title on iOS
- [ ] "Demo Mode" indicator visible
- [ ] App version from `expo-constants`

---

## US-026: KYC Status Badge

### Story Information
- **Story ID**: US-026
- **Epic**: EPIC-08 — Profile & KYC
- **Related Documents**: PRD §4.6, §5.7, §8.2
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-025

### User Story
**As a** demo presenter,
**I want to** show the KYC verification status as a coloured badge on the Profile screen,
**So that** clients see the platform's built-in KYC/AML compliance capability as a demo talking point.

### Acceptance Criteria

**AC-1**: KYC badge renders with correct colour
```gherkin
Given GET /kyc/status is called
When the status is "VERIFIED"
Then a green pill badge reading "✓ Verified" is shown
When the status is "PENDING"
Then an amber pill badge reading "⏳ Pending Verification" is shown
When the status is "NOT_STARTED"
Then a grey pill badge reading "Verification Required" is shown
```

**AC-2**: Badge uses StatusBadge component
```gherkin
Given the StatusBadge component is rendered
Then it accepts a status prop and renders the correct colour and label
And the badge is a rounded pill shape with 12pt corner radius
```

### Technical Implementation

**Files**:
- `app/(tabs)/profile.tsx`
- `components/StatusBadge.tsx`

**StatusBadge props**:
```typescript
type KycStatus = 'VERIFIED' | 'PENDING' | 'NOT_STARTED';
interface StatusBadgeProps {
  status: KycStatus;
}
```

| Status | Colour | SF Symbol |
|---|---|---|
| VERIFIED | `#10823B` (light) / `#30D158` (dark) | `checkmark.seal.fill` |
| PENDING | `#B45309` / `#FFD60A` | `hourglass.circle.fill` |
| NOT_STARTED | `#6B7280` / `#8E8E93` | `exclamationmark.circle` |

### Definition of Done
- [ ] `GET /kyc/status` called on Profile screen mount
- [ ] Correct badge colour and label for each of the 3 states
- [ ] StatusBadge component is reusable (not inline styles)

---

## US-027: Demo Reset (Hidden Menu)

### Story Information
- **Story ID**: US-027
- **Epic**: EPIC-08 — Profile & KYC
- **Related Documents**: PRD §8.3
- **Status**: Backlog
- **Story Points**: 2
- **Priority**: P1-High

### Dependencies
**Blocked by**: US-008, US-025

### User Story
**As a** Binariks sales manager,
**I want to** trigger a full app state reset by tapping the logo 5 times on the Profile screen,
**So that** I can silently reset the demo between client presentations without navigating menus.

### Acceptance Criteria

**AC-1**: 5-tap easter egg triggers reset
```gherkin
Given I am on the Profile screen
When I tap the user avatar/logo 5 times within 3 seconds
Then a native Alert appears: "Reset Demo?" with "Reset" (destructive) and "Cancel"
```

**AC-2**: Reset clears all state and returns to Login
```gherkin
Given the Reset alert is showing
When I tap "Reset"
Then all Zustand stores are reset to initial state
And expo-secure-store is cleared
And the user is navigated to Login
And a "Demo reset complete" toast is shown
```

**AC-3**: Tap counter resets after 3 seconds of inactivity
```gherkin
Given I have tapped the logo 3 times
When 3 seconds pass without another tap
Then the counter resets to 0
```

### Technical Implementation

**File**: `app/(tabs)/profile.tsx`

```typescript
const tapCount = useRef(0);
const tapTimer = useRef<NodeJS.Timeout>();

const handleLogoTap = () => {
  tapCount.current += 1;
  clearTimeout(tapTimer.current);
  if (tapCount.current >= 5) {
    tapCount.current = 0;
    promptDemoReset();
  } else {
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 3000);
  }
};
```

### Definition of Done
- [ ] 5 taps in 3s triggers Reset alert
- [ ] Reset clears secure store and all stores
- [ ] Counter resets after 3s inactivity
- [ ] Not discoverable from normal UI (no visible button or hint)

---

---

## Story Summary & Sprint Planning Guide

| Story | Title | Epic | Points | Priority | Depends On |
|---|---|---|---|---|---|
| US-001 | Project Setup & Env Config | Foundation | 3 | P0 | — |
| US-002 | API Service Layer | Foundation | 3 | P0 | US-001 |
| US-003 | Zustand Stores Scaffolding | Foundation | 2 | P0 | US-001 |
| US-004 | Navigation Architecture & Auth Gate | Foundation | 3 | P0 | US-001, US-003 |
| US-005 | Theme System & Design Tokens | Foundation | 2 | P0 | US-001 |
| US-006 | Login Screen | Auth | 3 | P0 | US-002–005 |
| US-007 | Auth Token Persistence | Auth | 2 | P0 | US-002–004 |
| US-008 | Logout | Auth | 1 | P0 | US-006–007 |
| US-009 | Wallet Cards — Balance Overview | Dashboard | 5 | P0 | US-002–005 |
| US-010 | Quick Action Buttons | Dashboard | 2 | P0 | US-004, US-009 |
| US-011 | Recent Transactions Widget | Dashboard | 3 | P0 | US-002–003, US-009 |
| US-012 | Pull-to-Refresh | Dashboard | 1 | P1 | US-009, US-011 |
| US-013 | Transaction History List | History | 5 | P0 | US-002–005 |
| US-014 | Transaction Filters | History | 3 | P0 | US-013 |
| US-015 | Transaction Detail Screen | History | 2 | P1 | US-013 |
| US-016 | 7-Day Spending Chart | History | 3 | P1 | US-013 |
| US-017 | Recipient Search & Transfer Setup | Send Money | 5 | P0 | US-002–003, US-009 |
| US-018 | Transfer Fee Preview | Send Money | 3 | P0 | US-017 |
| US-019 | Execute Transfer & Success Screen | Send Money | 3 | P0 | US-018 |
| US-020 | FX — Currency Selection & Rate Polling | Exchange | 5 | P0 | US-002–005 |
| US-021 | FX Calculation Preview | Exchange | 3 | P0 | US-020 |
| US-022 | Execute Currency Exchange | Exchange | 3 | P0 | US-021 |
| US-023 | Show My QR Code | QR | 3 | P1 | US-003, US-009 |
| US-024 | Scan QR & Pre-fill Send Money | QR | 3 | P1 | US-017, US-023 |
| US-025 | Profile Screen | Profile | 2 | P1 | US-002–003, US-006 |
| US-026 | KYC Status Badge | Profile | 2 | P1 | US-025 |
| US-027 | Demo Reset (Hidden Menu) | Profile | 2 | P1 | US-008, US-025 |
| | **Total** | | **78 pts** | | |

### Suggested Sprint Breakdown (2-week sprints, ~20pts each)

**Sprint 1 — Foundation & Auth** (13 pts + buffer)
US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008

**Sprint 2 — Dashboard & History** (21 pts)
US-009, US-010, US-011, US-013, US-014, US-012

**Sprint 3 — Transfers & FX** (22 pts)
US-017, US-018, US-019, US-020, US-021, US-022

**Sprint 4 — QR, Profile & Polish** (22 pts)
US-015, US-016, US-023, US-024, US-025, US-026, US-027

---

*SDK.Finance Mobile Banking Demo | User Stories | Binariks | v1.0 — March 2025*
