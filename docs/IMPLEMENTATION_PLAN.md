# SDK.Finance Mobile Banking Demo — Implementation Plan

**Project**: SDK.Finance RND — Mobile Banking Demo
**Stack**: React Native · Expo SDK 54 · TypeScript · expo-router v6
**Target**: iOS 16+ (iPhone) · Android 12+ (physical device + emulator)
**Source PRD**: `Project Docs/sdk_finance_banking_demo_PRD.txt` v1.0
**User Stories**: `docs/user-stories/UserStories_SDK-Finance-Demo.md`
**Last updated**: March 2025

---

## Current Baseline State

The repo contains a **blank Expo starter** with:
- ✅ expo-router v6 with 2 placeholder tabs (Home, Explore)
- ✅ `components/ui/icon-symbol.ios.tsx` + fallback (SF Symbols ready)
- ✅ `components/haptic-tab.tsx` (haptic tab bar ready)
- ✅ `hooks/use-color-scheme.ts` + web variant
- ✅ `hooks/use-theme-color.ts`
- ✅ `constants/theme.ts` (generic colours — needs PRD tokens)
- ✅ `react-native-reanimated` imported in root layout
- ❌ No auth, API layer, stores, or business screens
- ❌ Missing dependencies: axios, zustand, victory-native, expo-blur, expo-linear-gradient, etc.

---

## How to Use This Plan

- Work top-to-bottom — each phase builds on the previous
- Check off `[ ]` items as you complete them
- Test on **both platforms** at the checkpoints marked 🧪
- PRD acceptance criteria references: **AC-01** through **AC-10**
- User story references: **US-001** through **US-027**

---

## Phase 0 — Device & Tooling Setup

> One-time setup. Do this before writing any code.

### 0.1 Development Machine

- [ ] Node.js ≥ 20 installed (`node --version`)
- [ ] Expo CLI installed globally (`npm install -g expo-cli` or use `npx expo`)
- [ ] Git repo cloned and `npm install` runs cleanly

### 0.2 iOS Testing (Mac required for Simulator)

- [ ] **Physical device (preferred for demo)**: Install **Expo Go** from the App Store on an iPhone (iOS 16+)
- [ ] **Simulator**: Xcode installed, at least one iOS 16+ simulator available (`Simulator.app`)
- [ ] Confirm `npm run ios` opens the simulator successfully

### 0.3 Android Testing

- [ ] **Physical device (preferred)**: Install **Expo Go** from Google Play on an Android phone (Android 12+)
  - Enable Developer Options → USB Debugging on the device
  - Connect via USB, confirm `adb devices` shows the device
- [ ] **Emulator**: Android Studio installed, at least one AVD with API 31+ created
- [ ] Confirm `npm run android` opens the emulator successfully

### 0.4 Expo Go QR Workflow (both platforms)

- [ ] Run `npm start` — Expo dev server starts and shows a QR code
- [ ] Scan QR with **Expo Go** on iOS (Camera app) — app loads
- [ ] Scan QR with **Expo Go** on Android — app loads
- [ ] Both devices connected to the **same Wi-Fi network** as the dev machine

> 🧪 **Checkpoint 0**: Blank starter app loads on both iOS and Android via Expo Go before writing any feature code.

---

## Phase 1 — Dependencies & Environment

> US-001 | Points: 3

### 1.1 Install Missing Packages

- [ ] Run the following install commands:
  ```bash
  npx expo install expo-linear-gradient expo-blur expo-barcode-scanner
  npm install axios
  npm install zustand
  npm install react-native-paper
  npm install react-native-bottom-sheet
  npm install victory-native react-native-svg
  ```
- [ ] Verify `package.json` contains all packages listed in PRD §2 tech stack
- [ ] Run `npm start` — no errors after install

### 1.2 Environment Variables

- [ ] Create `.env` file at project root:
  ```
  EXPO_PUBLIC_API_URL=https://api-back.sdk.finance/api
  EXPO_PUBLIC_DEMO_EMAIL=<your-sandbox-email>
  EXPO_PUBLIC_DEMO_PASSWORD=<your-sandbox-password>
  ```
- [ ] Create `.env.example` with placeholder values (commit this, not `.env`)
- [ ] Add `.env` to `.gitignore`
- [ ] Verify `process.env.EXPO_PUBLIC_API_URL` resolves in app code (**AC-09**)

### 1.3 TypeScript & Path Aliases

- [ ] Confirm `tsconfig.json` has `"strict": true`
- [ ] Confirm `@/` alias maps to project root
- [ ] Run `npx tsc --noEmit` — zero errors on the blank starter

> 🧪 **Checkpoint 1**: `npm start` → app loads on both devices. No TypeScript errors. `.env` not committed.

---

## Phase 2 — Theme System & Design Tokens

> US-005 | Points: 2

### 2.1 Update `constants/theme.ts` — PRD Colours

- [ ] Replace existing `Colors` with PRD §8.1 design tokens:
  - Light: `primaryBlue: #1A56DB`, `darkNavy: #0E4D99`, `background: #F5F7FA`, `cardBg: #FFFFFF`, `successGreen: #10823B`, `errorRed: #9B1C1C`, `textPrimary: #1A1A2E`, `textSecondary: #6B7280`, `border: #E5E7EB`
  - Dark (iOS system): `background: #000000`, `cardBg: #1C1C1E`, `textPrimary: #FFFFFF`, `textSecondary: #8E8E93`, `border: #38383A`, `primaryBlue: #0A84FF`, `successGreen: #30D158`, `errorRed: #FF453A`
- [ ] Keep existing `tint`, `tabIconDefault`, `tabIconSelected` fields (used by tab bar)
- [ ] Add `IOSFonts` type scale (largeTitle 34pt → caption2 11pt) using `fontFamily: 'System'`

### 2.2 Create `constants/animations.ts`

- [ ] Create file with `IOSSpring` presets: `standard`, `bouncy`, `snappy`, `gentle`
- [ ] Create `IOSTiming` presets: `easeOut`, `easeInOut`, `fast`

### 2.3 Update `components/ThemedText.tsx`

- [ ] Add `variant` prop supporting: `largeTitle`, `title1`, `title2`, `headline`, `body`, `subheadline`, `footnote`, `caption1`
- [ ] Default variant is `body`

### 2.4 Verify Dark Mode on Both Platforms

- [ ] Toggle device to Dark mode — background and text colours update
- [ ] Toggle back to Light — colours restore

> 🧪 **Checkpoint 2**: Both platforms show correct brand colours in light and dark mode.

---

## Phase 3 — TypeScript Types & API Service Layer

> US-002 | Points: 3

### 3.1 Create `types/api.types.ts`

- [ ] Define interfaces for all API responses:
  - `AuthResponse` — `{ token: string, user: UserProfile }`
  - `Coin` — `{ coinSerial, balance, currency: { code, symbol }, name, type }`
  - `Transaction` — `{ id, type, amount, fee, date, status, counterparty, currency }`
  - `ExchangeRate` — `{ from, to, rate, timestamp }`
  - `TransferTemplate` — `{ id, paymentToolType, ... }`
  - `UserProfile` — `{ id, email, name, registrationDate }`
  - `KycStatus` — `'VERIFIED' | 'PENDING' | 'NOT_STARTED'`

### 3.2 Create `services/api.ts` — Axios Instance

- [ ] Create Axios instance with `baseURL: process.env.EXPO_PUBLIC_API_URL`
- [ ] Add request interceptor: reads JWT from `expo-secure-store`, injects `Authorization: Bearer` header
- [ ] Add response interceptor: on 401, calls `authStore.logout()` and shows "Session expired" toast
- [ ] Add network error handler: shows user-friendly toast (never raw error objects — **AC-10**)

### 3.3 Create Service Files

- [ ] `services/auth.service.ts` — `login(email, password)`, `register()`
- [ ] `services/wallet.service.ts` — `getCoins()`, `validateCoin(coinSerial)`
- [ ] `services/transfer.service.ts` — `getTemplates()`, `calculateTransfer(id, params)`, `executeTransfer(id, params)`
- [ ] `services/exchange.service.ts` — `getCurrencies()`, `getRates(from, to)`, `calculateExchange(params)`, `executeExchange(params)`
- [ ] `services/transactions.service.ts` — `getTransactions(filters)`, `getTransaction(id)`
- [ ] `services/profile.service.ts` — `getProfile()`, `getKycStatus()`

### 3.4 Manual API Smoke Test

- [ ] Call `POST /authorization` with demo credentials via a temporary test component or Postman
- [ ] Verify JWT token is returned
- [ ] Call `GET /coins` with the token — verify wallet data returns

> 🧪 **Checkpoint 3**: API layer compiles. Auth token retrieved from sandbox. At least one wallet returned from `GET /coins`.

---

## Phase 4 — State Management (Zustand Stores)

> US-003 | Points: 2

### 4.1 Create Store Files

- [ ] `stores/auth.store.ts`
  - State: `token: string | null`, `user: UserProfile | null`, `isAuthenticated: boolean`
  - Actions: `login(token, user)` — saves token to `expo-secure-store`; `logout()` — clears store + SecureStore
- [ ] `stores/wallet.store.ts`
  - State: `coins: Coin[]`, `selectedCoin: Coin | null`, `loading: boolean`
  - Actions: `fetchCoins()`, `setSelectedCoin(coin)`
- [ ] `stores/tx.store.ts`
  - State: `transactions: Transaction[]`, `filters: TxFilters`, `page: number`, `total: number`, `loading: boolean`
  - Actions: `fetchTransactions()`, `setFilters(filters)`, `loadMore()`
- [ ] `stores/fx.store.ts`
  - State: `rates: Record<string, number>`, `rateHistory: number[]`, `lastUpdated: Date | null`, `loading: boolean`
  - Actions: `fetchRates(from, to)`, `calculate(from, to, amount)`
- [ ] `stores/ui.store.ts`
  - State: `toast: { message: string, type: 'success' | 'error' | 'warning' | 'info' } | null`
  - Actions: `showToast(message, type)`, `hideToast()`

### 4.2 Verify Stores

- [ ] `authStore.logout()` clears `expo-secure-store` key `'jwt'`
- [ ] No store imports another store directly (no circular dependencies)
- [ ] All state fields are typed (no `any`)

---

## Phase 5 — Navigation Architecture & Auth Gate

> US-004 | Points: 3

### 5.1 Create Route File Structure

- [ ] Create `app/(auth)/login.tsx` — placeholder `<View>` with "Login" text
- [ ] Create `app/(auth)/register.tsx` — placeholder
- [ ] Create `app/(auth)/register-confirm.tsx` — placeholder
- [ ] Create `app/send-money.tsx` — placeholder
- [ ] Create `app/transaction/[id].tsx` — placeholder
- [ ] Create `app/card/[id].tsx` — placeholder
- [ ] Rename `app/(tabs)/explore.tsx` → remove or rename — replace with the 5 demo tabs:
  - `app/(tabs)/index.tsx` — Dashboard (already exists)
  - `app/(tabs)/history.tsx` — Transaction History
  - `app/(tabs)/exchange.tsx` — Currency Exchange
  - `app/(tabs)/qr.tsx` — QR Payment
  - `app/(tabs)/profile.tsx` — Profile

### 5.2 Update `app/(tabs)/_layout.tsx` — 5-Tab Bar

- [ ] Replace `explore` tab with `history`, `exchange`, `qr`, `profile`
- [ ] Set correct SF Symbol for each tab:
  - Home: `house.fill` | History: `clock.arrow.circlepath` | Exchange: `arrow.left.arrow.right.circle.fill` | QR: `qrcode.viewfinder` | Profile: `person.crop.circle.fill`
- [ ] Set correct Android MaterialIcons fallback in `components/ui/icon-symbol.tsx`
- [ ] Add `tabBarBlurEffect: 'regular'` (iOS) via `expo-blur` `BlurView` background component
- [ ] Set `tabBarActiveTintColor: Colors[scheme].primaryBlue`

### 5.3 Update `app/_layout.tsx` — Auth Gate

- [ ] On mount, read JWT from `expo-secure-store`
- [ ] If no token → `router.replace('/(auth)/login')`
- [ ] If token → stay on `(tabs)` anchor
- [ ] Register `(auth)` group as a Stack.Screen with `headerShown: false`
- [ ] Register `send-money` as `presentation: 'modal'`
- [ ] Register `transaction/[id]` as `presentation: 'modal'`

### 5.4 Verify Navigation

- [ ] App with no token → lands on Login screen (**AC-07** prerequisite)
- [ ] 5-tab bar renders on both iOS and Android
- [ ] Tab bar uses blur background on iOS, solid on Android

> 🧪 **Checkpoint 5**: 5-tab navigation works on both platforms. Unauthenticated state redirects to Login. Modal route opens correctly.

---

## Phase 6 — Authentication Screens

> US-006, US-007, US-008 | Points: 6

### 6.1 Build Login Screen (`app/(auth)/login.tsx`)

- [ ] Email input field — `defaultValue={process.env.EXPO_PUBLIC_DEMO_EMAIL}`
- [ ] Password input field — `secureTextEntry` — `defaultValue={process.env.EXPO_PUBLIC_DEMO_PASSWORD}`
- [ ] "Sign In" button — calls `authService.login()` on press
- [ ] Loading spinner on button while API call is in-flight
- [ ] Button disabled during loading (prevents double-submit)
- [ ] On success: save token via `authStore.login()`, navigate to `/(tabs)`
- [ ] On success: fire `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- [ ] On 401: show error toast "Invalid credentials. Please try again."
- [ ] On 401: fire `Haptics.notificationAsync(NotificationFeedbackType.Error)`
- [ ] `KeyboardAvoidingView behavior='padding'` wrapping the form (iOS keyboard handling)
- [ ] SDK.Finance logo / branding at top
- [ ] "Demo Mode" indicator text at bottom

### 6.2 Token Persistence (US-007)

- [ ] On app launch, `app/_layout.tsx` reads token from SecureStore and hydrates `authStore`
- [ ] Valid token → user skips Login and lands on Dashboard
- [ ] Token stored under key `'jwt'` in `expo-secure-store`

### 6.3 Logout (US-008) — implement alongside Profile (Phase 11)

> Mark this done when US-025 + US-008 are complete together.

### 6.4 Test Authentication on Both Platforms

- [ ] **iOS**: Tap "Sign In" with pre-filled credentials → lands on Dashboard
- [ ] **Android**: Same flow works identically
- [ ] **iOS**: Kill app, reopen → lands directly on Dashboard (token persisted)
- [ ] **Android**: Same persistence test
- [ ] **Both**: Enable Airplane mode → tap Sign In → error toast shown, no crash (**AC-10**)

> 🧪 **Checkpoint 6**: Login works on both platforms. Token persists across app restarts. Error states handled gracefully (**AC-01**).

---

## Phase 7 — Dashboard Screen

> US-009, US-010, US-011, US-012 | Points: 11

### 7.1 Wallet Cards Component (`components/WalletCard.tsx`)

- [ ] Create `WalletCard` component accepting: `coinSerial`, `balance`, `currencyCode`, `currencySymbol`, `name`, `isSelected`, `onPress`
- [ ] Apply `LinearGradient` from `expo-linear-gradient` with `colors: ['#0E4D99', '#1A56DB']`
- [ ] Balance displayed with SF Pro Display Heavy style (28pt, tabular numbers via `fontVariant: ['tabular-nums']`)
- [ ] Currency name in subheadline style (15pt)
- [ ] Card corner radius: 16pt
- [ ] Minimum card dimensions: full-width with consistent height (~160pt)

### 7.2 Skeleton Loader (`components/SkeletonLoader.tsx`)

- [ ] Create shimmer-style skeleton placeholder for cards and list rows
- [ ] Animates using `react-native-reanimated` opacity loop
- [ ] Used for: wallet cards, transaction rows during loading

### 7.3 Dashboard Screen (`app/(tabs)/index.tsx`)

- [ ] Large title "Dashboard" on iOS (`headerLargeTitle: true`)
- [ ] On mount: call `walletStore.fetchCoins()`
- [ ] Show `SkeletonLoader` cards while `loading: true`
- [ ] Render horizontal `FlatList` of `WalletCard` items
- [ ] Scroll snap on card swipe: `snapToInterval`, `decelerationRate: 'fast'`
- [ ] Haptic `selectionAsync()` on each card snap
- [ ] Scale animation (IOSSpring.bouncy, scale 1.04→1.0) on card tap
- [ ] Selected card highlighted (slightly scaled up)
- [ ] Quick action buttons row: Send, Receive, Exchange, Top-Up (US-010)
  - Each button: SF Symbol icon + label below
  - `impactAsync(Medium)` + `IOSSpring.snappy` scale on press
  - Send → `router.push('/send-money')`
  - Receive → `router.push('/(tabs)/qr')`
  - Exchange → `router.push('/(tabs)/exchange')`
  - Top-Up → `uiStore.showToast('Top-up coming soon', 'info')`
- [ ] "Recent Transactions" section header
- [ ] On mount: call `txStore.fetchTransactions()` with `pageSize: 5`
- [ ] Render up to 5 `TransactionRow` items
- [ ] Tap row → `router.push('/transaction/' + id)`
- [ ] Empty transactions state: "No transactions yet" placeholder
- [ ] `RefreshControl` on `ScrollView` (US-012)
  - Refreshes both coins and transactions in parallel
  - Light haptic at pull threshold

### 7.4 TransactionRow Component (`components/TransactionRow.tsx`)

- [ ] Create reusable `TransactionRow` accepting: `id`, `type`, `counterparty`, `date`, `amount`, `currency`, `onPress`
- [ ] Left SF Symbol icon colour-coded by type (blue=transfer, amber=exchange, green=top-up, red=withdraw)
- [ ] Amount: green text for positive, red text for negative
- [ ] 44×44pt minimum tappable area
- [ ] Right-side chevron indicator

### 7.5 Test Dashboard on Both Platforms

- [ ] **iOS**: Wallet cards render with gradient, scroll snaps, haptic on snap
- [ ] **Android**: Wallet cards render (LinearGradient works), scroll snaps work
- [ ] **Both**: At least 2 wallet cards with real balances (**AC-02**)
- [ ] **Both**: Recent 5 transactions shown
- [ ] **Both**: Pull-to-refresh updates data
- [ ] **Both**: All 4 quick action buttons navigate correctly

> 🧪 **Checkpoint 7**: Dashboard "wow" screen complete on both platforms (**AC-02**).

---

## Phase 8 — Transaction History Screen

> US-013, US-014, US-015, US-016 | Points: 13

### 8.1 History Screen (`app/(tabs)/history.tsx`)

- [ ] Large title "History" on iOS
- [ ] On mount: call `txStore.fetchTransactions()` with `pageSize: 20, pageNumber: 0`
- [ ] Render `FlatList` of `TransactionRow` items
- [ ] Show `SkeletonLoader` rows during initial load
- [ ] Infinite scroll: `onEndReached` triggers `txStore.loadMore()`
- [ ] Loading indicator at list bottom during pagination fetch
- [ ] `RefreshControl` resets to page 0

### 8.2 Filter Bar (US-014)

- [ ] Horizontal scrollable chip row: "All", "Transfer", "Exchange", "Top-Up"
- [ ] "All" selected by default (highlighted)
- [ ] Tap chip → `txStore.setFilters({ type })` → re-fetch from page 0
- [ ] Active chip: filled background (`primaryBlue`), white text
- [ ] Inactive chip: outline style
- [ ] `selectionAsync()` haptic on chip tap (**AC-04** filter demo)

### 8.3 Transaction Detail Screen (US-015) (`app/transaction/[id].tsx`)

- [ ] Modal presentation (card sheet style)
- [ ] On mount: call `transactionService.getTransaction(id)`
- [ ] Display: transaction ID, type badge, amount (large), fee, date/time, status badge, counterparty
- [ ] "Copy ID" button → `Clipboard.setStringAsync(id)` + Light haptic + "Copied!" toast
- [ ] Close button / swipe-down to dismiss

### 8.4 7-Day Spending Chart (US-016)

- [ ] At top of History screen, above filter chips
- [ ] Group `txStore.transactions` by date for last 7 days, sum outgoing amounts
- [ ] Render `VictoryBar` chart with 7 bars
- [ ] Bar colour: `primaryBlue` (#1A56DB)
- [ ] X-axis labels: day abbreviations (Mon, Tue…)
- [ ] Zero-fill missing days (no crash on sparse data)

### 8.5 Test History on Both Platforms

- [ ] **iOS**: Transactions load, filter chips work, infinite scroll loads more
- [ ] **Android**: Same functionality
- [ ] **Both**: Filter by "Transfer" shows only transfers (**AC-04**)
- [ ] **Both**: Tap row → detail modal opens with full info
- [ ] **Both**: Copy transaction ID works

> 🧪 **Checkpoint 8**: History screen complete. Filters verified on both platforms (**AC-04**).

---

## Phase 9 — Send Money Screen

> US-017, US-018, US-019 | Points: 11

### 9.1 Send Money Screen (`app/send-money.tsx`)

- [ ] Presented as modal (already configured in navigation)
- [ ] Header: "Send Money" with close button (dismisses modal)

**Recipient search (US-017)**:
- [ ] Search input field with debounced (300ms) calls to `POST /users/view`
- [ ] Dropdown list of matching users appears below field
- [ ] Tap user → sets recipient, dismisses dropdown
- [ ] Selected recipient shown as a chip with clear button

**Wallet selector (US-017)**:
- [ ] Shows currently selected wallet (from `walletStore.selectedCoin`)
- [ ] Tap → `ActionSheetIOS.showActionSheetWithOptions()` on iOS / bottom sheet on Android
- [ ] Shows all available coins with balance
- [ ] Selected coin's available balance shown below amount input

**Amount input (US-017)**:
- [ ] Large `CurrencyInput` component with currency symbol badge
- [ ] Locale-formatted display (`toLocaleString`)
- [ ] Inline error "Insufficient balance" if amount > available balance
- [ ] Confirm button disabled when validation fails

### 9.2 Fee Preview (US-018)

- [ ] When recipient + amount are entered, call `POST /templates/transfer/{id}/calculate` (debounced 500ms)
- [ ] Show fee inline: "Fee: $X.XX"
- [ ] Show total: "Total: $X.XX"
- [ ] Fee updates when amount changes

### 9.3 Confirm Sheet (US-018)

- [ ] Create `components/ConfirmSheet.tsx` using `react-native-bottom-sheet`
- [ ] `snapPoints: ['50%', '90%']`
- [ ] Shows: recipient name, from wallet, amount, fee, total
- [ ] "Send Money" confirm button (primary style)
- [ ] "Cancel" button

### 9.4 Execute Transfer & Success (US-019)

- [ ] Tap "Send Money" → call `POST /templates/transfer/{id}/execute`
- [ ] Show loading state on button during API call
- [ ] On success:
  - [ ] `notificationAsync(Success)` haptic
  - [ ] Animate checkmark entrance (scale 0→1, `IOSSpring.bouncy`)
  - [ ] Show: "Transfer Successful", amount, recipient, businessProcessId
  - [ ] Copy businessProcessId button
  - [ ] "Back to Dashboard" button → dismiss modal + refresh wallets
- [ ] On error: dismiss sheet, show error toast, preserve form state

### 9.5 Test Send Money on Both Platforms

- [ ] **iOS**: Full flow — search recipient, enter amount, see fee, confirm, see success
- [ ] **Android**: Same flow works
- [ ] **Both**: `businessProcessId` displayed (**AC-03**)
- [ ] **Both**: Balance on Dashboard reduces after successful transfer (optimistic update)
- [ ] **Both**: Error during transfer → toast shown, no crash (**AC-10**)
- [ ] **Both**: Transfer with zero amount → disabled button, no API call

> 🧪 **Checkpoint 9**: End-to-end P2P transfer complete on both platforms (**AC-03**).

---

## Phase 10 — Currency Exchange Screen

> US-020, US-021, US-022 | Points: 11

### 10.1 Exchange Screen (`app/(tabs)/exchange.tsx`)

**Currency selectors (US-020)**:
- [ ] "From" and "To" currency pickers with flag emoji + currency code
- [ ] Tap picker → shows currency list from `GET /currencies`
- [ ] Swap button between pickers (swaps From/To)

**Live rate banner (US-020)**:
- [ ] Shows current rate: "1 USD = 0.92 EUR"
- [ ] Shows last updated timestamp
- [ ] Polls `POST /exchange-rates/view` every **30 seconds** (key demo talking point)
- [ ] Interval cleared when screen loses focus (`useEffect` cleanup)
- [ ] Store last 10 rate values in `fxStore.rateHistory[]`

**Amount input (US-021)**:
- [ ] Large `CurrencyInput` for "From" amount
- [ ] "To" amount field (read-only, shows calculated result)
- [ ] On amount change: 500ms debounced call to `POST /exchange/calculate`
- [ ] Zero or empty amount clears the "To" field

**Rate sparkline (US-021)**:
- [ ] `VictoryLine` mini chart showing last 10 polled rate values
- [ ] Appears below the rate banner
- [ ] Renders only when ≥2 data points available

### 10.2 Execute Exchange (US-022)

- [ ] "Exchange Now" button → show `ConfirmSheet` with: from amount/currency, to amount/currency, rate, fee
- [ ] Tap "Confirm Exchange" → call `POST /exchange/execute`
- [ ] On success:
  - [ ] `notificationAsync(Success)` haptic
  - [ ] Success screen with exchange summary
  - [ ] Wallets refresh in background
- [ ] On error: toast with reason

### 10.3 Test Exchange on Both Platforms

- [ ] **iOS**: Rate banner shows and updates after 30s
- [ ] **Android**: Same rate polling works
- [ ] **Both**: Typing amount updates conversion result (debounced)
- [ ] **Both**: Exchange executes, success shown, wallet balances update (**AC-05**)
- [ ] **Both**: Navigate away and back — polling restarts correctly

> 🧪 **Checkpoint 10**: FX screen live rate polling and exchange execution verified (**AC-05**).

---

## Phase 11 — QR Code Payment

> US-023, US-024 | Points: 6

### 11.1 QR Screen (`app/(tabs)/qr.tsx`)

- [ ] Two tab layout within the screen: "Show My QR" and "Scan"

**Show My QR (US-023)**:
- [ ] Read default wallet's `coinSerial` from `walletStore.selectedCoin`
- [ ] Render QR code encoding: `JSON.stringify({ coinSerial, name })`
- [ ] Use `react-native-svg` + `qrcode-svg` to render QR natively
- [ ] Show wallet name and last-4 of coinSerial below QR
- [ ] QR must be scannable with a device camera (**AC-06**)

**Scan QR (US-024)**:
- [ ] Request camera permission on first use (`expo-barcode-scanner`)
- [ ] Show camera preview with viewfinder overlay
- [ ] On scan: parse JSON payload `{ coinSerial, amount, currency, recipientName }`
- [ ] Valid SDK.Finance QR → `notificationAsync(Success)` haptic → navigate to Send Money pre-filled
- [ ] Invalid/unrecognised QR → error toast "Invalid payment QR code" → camera stays open
- [ ] Handle "permission denied" gracefully with a prompt to open Settings

### 11.2 Test QR on Both Platforms

- [ ] **iOS**: QR renders, scan with a second phone confirms `coinSerial` is decodable (**AC-06**)
- [ ] **Android**: QR renders and is scannable
- [ ] **Both**: Scan a QR code → Send Money opens pre-filled
- [ ] **Both**: Scan an invalid QR → error toast, no crash

> 🧪 **Checkpoint 11**: QR show and scan work on both platforms (**AC-06**).

---

## Phase 12 — Profile & KYC Screen

> US-025, US-026, US-027 | Points: 7

### 12.1 Profile Screen (`app/(tabs)/profile.tsx`)

- [ ] Large title "Profile" on iOS
- [ ] On mount: call `GET /profile` and `GET /kyc/status`
- [ ] User initials avatar (circle, `primaryBlue` background, white initials text)
- [ ] Display: full name, email, registration date, user ID
- [ ] App version from `Constants.expoConfig?.version`
- [ ] "Demo Mode" indicator text

### 12.2 KYC Status Badge (`components/StatusBadge.tsx`) — US-026

- [ ] Create `StatusBadge` component accepting `status: 'VERIFIED' | 'PENDING' | 'NOT_STARTED'`
- [ ] VERIFIED → green pill `#10823B` / `#30D158` dark, SF Symbol `checkmark.seal.fill`
- [ ] PENDING → amber pill, SF Symbol `hourglass.circle.fill`
- [ ] NOT_STARTED → grey pill, SF Symbol `exclamationmark.circle`
- [ ] Rounded pill shape, 12pt corner radius

### 12.3 Logout (US-008)

- [ ] "Logout" button at bottom of Profile screen
- [ ] iOS: `Alert.alert('Log Out?', ...)` with `style: 'destructive'` button, `Platform.OS === 'ios'` guard
- [ ] Android: custom confirm bottom sheet or `Alert.alert` fallback
- [ ] On confirm: `authStore.logout()` → clears SecureStore → all stores reset → navigate to Login (**AC-07**)
- [ ] On cancel: dismiss, remain on Profile

### 12.4 Demo Reset Easter Egg (US-027)

- [ ] Track tap count on avatar with `useRef<number>`
- [ ] Reset tap counter after 3 seconds of inactivity
- [ ] 5 taps in 3s → `Alert.alert('Reset Demo?', ...)` with destructive "Reset" button
- [ ] On confirm: clear SecureStore, reset all stores, navigate to Login, show "Demo reset complete" toast
- [ ] Hidden — no visible UI hint

### 12.5 Test Profile on Both Platforms

- [ ] **iOS**: Profile data loads, large title collapses on scroll, KYC badge correct colour
- [ ] **Android**: Same data loads, native alert (or equivalent) for logout
- [ ] **Both**: Logout clears token and returns to Login (**AC-07**)
- [ ] **Both**: Demo reset (5-tap) works silently

> 🧪 **Checkpoint 12**: Profile, KYC badge, and logout verified on both platforms (**AC-07**).

---

## Phase 13 — Toast Notification System

> Shared across all features. Implement once, use everywhere.

### 13.1 Toast Component

- [ ] Create `components/Toast.tsx` using `react-native-reanimated` `withSpring(IOSTiming.easeOut)`
- [ ] Slide in from top: `translateY: -60 → 0`
- [ ] Auto-dismiss after 3 seconds
- [ ] Types: `success` (green), `error` (red), `warning` (amber), `info` (blue)
- [ ] Shows message text, optional icon
- [ ] Dismiss on tap

### 13.2 Mount Toast in Root Layout

- [ ] Add `<Toast />` component to `app/_layout.tsx` above `<Stack>`
- [ ] Connected to `uiStore.toast` state
- [ ] `uiStore.hideToast()` clears after auto-dismiss

### 13.3 Offline Banner

- [ ] Use `@react-native-community/netinfo` or equivalent to detect connectivity
- [ ] Show "Demo Mode — No Connection" banner when offline
- [ ] Banner visible on all screens

### 13.4 Test Toasts on Both Platforms

- [ ] **Both**: Enable Airplane mode mid-app → offline banner appears
- [ ] **Both**: Trigger a success action → green toast shown
- [ ] **Both**: Trigger an error → red toast shown
- [ ] **Both**: Toast auto-dismisses after 3s (**AC-10** — no raw error objects)

---

## Phase 14 — Final Integration & Polish

### 14.1 Animations Polish

- [ ] WalletCard scroll snap spring animation smooth on both platforms
- [ ] Balance number count-up on Dashboard load (`IOSSpring.gentle`)
- [ ] Success checkmark on transfer/exchange scales with `IOSSpring.bouncy`
- [ ] Skeleton loader → content fade-in (`IOSTiming.easeOut`)
- [ ] Quick action button press scale feedback (`IOSSpring.snappy`)

### 14.2 iOS-Specific Polish (per FCR CR-2025-001)

- [ ] Large titles collapse on scroll: Dashboard, History, Profile
- [ ] Swipe-back gesture works on all push screens
- [ ] Tab bar blur background renders correctly
- [ ] `ActionSheetIOS` used for wallet picker on iOS
- [ ] Native `Alert.alert` with destructive button style for Logout
- [ ] All haptic triggers fire at correct points (full trigger map per FCR)
- [ ] Safe area handled correctly on iPhone with Dynamic Island

### 14.3 Android-Specific Polish

- [ ] `edgeToEdgeEnabled: true` is set in `app.json` (already present)
- [ ] No unsafe area overlap on devices with navigation bar
- [ ] Tab bar icons use MaterialIcons fallback (not SF Symbols)
- [ ] Bottom sheet used instead of `ActionSheetIOS` for pickers
- [ ] Ripple feedback on buttons (React Native Paper default)

### 14.4 Error & Edge Case Audit

- [ ] Every API call has try/catch that routes to `uiStore.showToast`
- [ ] No raw error objects shown to user anywhere in the app
- [ ] Zero amounts/empty inputs do not trigger API calls
- [ ] App does not crash when API returns unexpected shapes

---

## Phase 15 — Acceptance Criteria Verification

> Run through each PRD acceptance criterion on both iOS and Android.

| # | Criterion | iOS ✅ | Android ✅ |
|---|---|---|---|
| AC-01 | Login with demo credentials → Dashboard | ☐ | ☐ |
| AC-02 | Dashboard shows ≥2 wallet cards with real balances | ☐ | ☐ |
| AC-03 | P2P transfer completes, businessProcessId shown | ☐ | ☐ |
| AC-04 | Transaction history loads, type filters work | ☐ | ☐ |
| AC-05 | FX screen shows live rates, exchange executes | ☐ | ☐ |
| AC-06 | QR "Show My QR" renders scannable code | ☐ | ☐ |
| AC-07 | Logout clears token, returns to Login | ☐ | ☐ |
| AC-08 | All screens render on iOS 16+ and Android 12+ via Expo Go | ☐ | ☐ |
| AC-09 | No hardcoded credentials in source (`grep -r "password" src/`) | ☐ | ☐ |
| AC-10 | Network errors show toast, app does not crash (Airplane mode test) | ☐ | ☐ |

### Stretch Goals (Should-Have)

- [ ] KYC status badge shown on Profile screen
- [ ] QR Scan opens pre-filled Send Money screen
- [ ] 7-day spending bar chart renders on History screen
- [ ] Demo Reset hidden 5-tap menu accessible

---

## Phase 16 — Demo Readiness

### 16.1 Pre-Demo Checklist

- [ ] `.env` updated with valid SDK.Finance sandbox credentials
- [ ] Demo credentials tested — login works
- [ ] At least 2 funded wallets in sandbox (USD + EUR minimum)
- [ ] At least 10 historical transactions in sandbox account
- [ ] App tested on the specific iPhone to be used in demos
- [ ] App tested on backup Android device
- [ ] Expo Go is up-to-date on demo devices
- [ ] App loads within 3 seconds on demo device Wi-Fi

### 16.2 Demo Flow Verification (end-to-end dry run)

- [ ] Start app → Login screen pre-populated → tap Sign In → Dashboard ✓
- [ ] Dashboard shows multi-currency wallet cards → scroll through cards ✓
- [ ] Tap "Send" → enter recipient → see fee → confirm → success screen with ID ✓
- [ ] Navigate to History → filter by "Transfer" → see the just-executed transfer ✓
- [ ] Navigate to Exchange → live rate shown → type amount → see conversion → execute ✓
- [ ] Navigate to QR → Show My QR renders → scan with second phone ✓
- [ ] Navigate to Profile → KYC badge visible ✓
- [ ] Tap Logout → confirm → returns to Login ✓

### 16.3 Demo Reset Test

- [ ] Tap avatar 5 times → Reset alert appears → confirm → lands on Login with clean state ✓

---

## File Structure Reference

Final expected project structure when all phases are complete:

```
SDK_Finance/
├── app/
│   ├── _layout.tsx              ← auth gate, root stack
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── register-confirm.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx          ← 5-tab bar
│   │   ├── index.tsx            ← Dashboard
│   │   ├── history.tsx
│   │   ├── exchange.tsx
│   │   ├── qr.tsx
│   │   └── profile.tsx
│   ├── send-money.tsx           ← modal
│   ├── transaction/
│   │   └── [id].tsx             ← modal
│   └── card/
│       └── [id].tsx
├── components/
│   ├── WalletCard.tsx
│   ├── TransactionRow.tsx
│   ├── CurrencyInput.tsx
│   ├── StatusBadge.tsx
│   ├── ConfirmSheet.tsx
│   ├── SkeletonLoader.tsx
│   ├── Toast.tsx
│   ├── ThemedText.tsx           ← updated with variants
│   ├── ThemedView.tsx
│   ├── haptic-tab.tsx           ← existing
│   └── ui/
│       ├── icon-symbol.ios.tsx  ← SF Symbols (extended)
│       └── icon-symbol.tsx      ← MaterialIcons fallback (extended)
├── services/
│   ├── api.ts
│   ├── auth.service.ts
│   ├── wallet.service.ts
│   ├── transfer.service.ts
│   ├── exchange.service.ts
│   ├── transactions.service.ts
│   └── profile.service.ts
├── stores/
│   ├── auth.store.ts
│   ├── wallet.store.ts
│   ├── tx.store.ts
│   ├── fx.store.ts
│   └── ui.store.ts
├── hooks/
│   ├── use-wallets.ts
│   ├── use-transactions.ts
│   ├── use-exchange-rates.ts
│   ├── use-color-scheme.ts      ← existing
│   └── use-theme-color.ts       ← existing
├── constants/
│   ├── theme.ts                 ← updated with PRD tokens
│   └── animations.ts            ← new: IOSSpring presets
├── types/
│   └── api.types.ts
├── .env                         ← gitignored
├── .env.example                 ← committed
├── app.json
└── package.json
```

---

## Progress Summary

| Phase | Description | Stories | Points | Status |
|---|---|---|---|---|
| 0 | Device & tooling setup | — | — | ☐ |
| 1 | Dependencies & env | US-001 | 3 | ☐ |
| 2 | Theme & design tokens | US-005 | 2 | ☐ |
| 3 | API service layer | US-002 | 3 | ☐ |
| 4 | Zustand stores | US-003 | 2 | ☐ |
| 5 | Navigation & auth gate | US-004 | 3 | ☐ |
| 6 | Authentication | US-006–008 | 6 | ☐ |
| 7 | Dashboard | US-009–012 | 11 | ☐ |
| 8 | Transaction history | US-013–016 | 13 | ☐ |
| 9 | Send money | US-017–019 | 11 | ☐ |
| 10 | Currency exchange | US-020–022 | 11 | ☐ |
| 11 | QR payment | US-023–024 | 6 | ☐ |
| 12 | Profile & KYC | US-025–027 | 7 | ☐ |
| 13 | Toast system | shared | — | ☐ |
| 14 | Polish & animations | — | — | ☐ |
| 15 | AC verification | all | — | ☐ |
| 16 | Demo readiness | — | — | ☐ |
| | **Total story points** | | **78 pts** | |
