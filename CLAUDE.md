# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm start            # Start Expo dev server (opens QR code for Expo Go)
npm run android      # Start with Android emulator
npm run ios          # Start with iOS simulator
npm run web          # Start web version
npm run lint         # Run ESLint via expo lint
npm run reset-project  # Move starter code to app-example/ and reset app/
```

There is no test runner configured yet.

## Environment

Copy `.env.example` to `.env` and set:
```
EXPO_PUBLIC_API_URL=https://api-back.sdk.finance/api
EXPO_PUBLIC_DEMO_EMAIL=...
EXPO_PUBLIC_DEMO_PASSWORD=...
```

## Architecture

This is an **Expo (React Native) fintech app** using **expo-router** for file-based routing with TypeScript strict mode. The New Architecture (`newArchEnabled: true`) and React Compiler (`reactCompiler: true`) experiments are both enabled. Targets the **SDK Finance** banking API.

### Routing

expo-router uses the filesystem. Entry point is `expo-router/entry`.

- `app/_layout.tsx` — Root layout with `AuthGate` (redirects unauthenticated users to `/(auth)/login`), wraps in `ThemeProvider`, renders global `Toast`
- `app/(auth)/login.tsx` — Login screen (no authenticated access)
- `app/(tabs)/_layout.tsx` — 4 visible tabs: Home, Transactions, Profile, Scan QR; `exchange.tsx` is hidden (`href: null`) and pushed from Home
- Modal screens are presented over tabs via `presentation: 'modal'`: `send-money`, `top-up/bank`, `withdrawal/bank`, `transaction/[id]`, `card/[id]`, `cards/index`, `invoices/*`, `profile/edit-*`, `analytics`, `bank-accounts/index`

### State Management (Zustand)

All global state lives in `stores/`:

- `auth.store.ts` — JWT token + refresh token persisted to `expo-secure-store`; `hydrate()` restores session on start; `login()` / `logout()`
- `wallet.store.ts` — User's coin/wallet list; CRUD operations call `walletService`
- `tx.store.ts` — Transactions with pagination (`fetchTransactions()` resets, `loadMore()` appends); filter by type/coin
- `fx.store.ts` — Exchange rate lookups; keeps last 10 rate history entries
- `ui.store.ts` — Global toast state (`showToast(message, type)`)

### API / Service Layer

`services/api.ts` — Axios instance:
- Attaches `Authorization: Bearer {token}` from SecureStore on every request
- **401 handling**: queues concurrent requests, refreshes token via `PUT /v1/authorization`, replays queue; on refresh failure calls `authStore.logout()` and shows toast
- Network errors show a "No connection" toast

Service files in `services/` (one per domain: auth, wallet, transactions, transfer, exchange, cards, invoices, bank-accounts, profile, reporting) wrap Axios calls and map raw API types → app types defined in `types/api.types.ts`.

**Data flow:** Component → Zustand store action → service → `api.ts` → Axios → API

### Theming

- `constants/theme.ts` — `Colors` (light/dark palette), `Fonts` (platform-specific stacks)
- `hooks/use-theme-color.ts` — Resolves a color key to the correct light/dark value; supports prop overrides
- `ThemedText` / `ThemedView` apply theme colors automatically
- `useColorScheme` re-exported from `hooks/`; web variant at `hooks/use-color-scheme.web.ts`

### Path Aliases

`@/` maps to the project root (`tsconfig.json`). Use `@/components/...`, `@/hooks/...`, `@/constants/...`, `@/stores/...`, `@/services/...`, `@/types/...`.

### Platform-Specific Files

Files ending in `.ios.tsx` or `.web.ts` are auto-resolved per platform:
- `components/ui/icon-symbol.ios.tsx` — SF Symbols (iOS); `icon-symbol.tsx` — fallback
- `hooks/use-color-scheme.web.ts` — Web color scheme hook

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `zustand ^5` | State management |
| `axios ^1.7` | HTTP client with interceptors |
| `expo-secure-store` | Secure JWT storage |
| `react-native-reanimated ~4.1` | Animations |
| `expo-linear-gradient` | Gradient cards |
| `react-native-bottom-sheet ^5` | Bottom sheet modals |
| `victory-native 36.9` | Charts |
| `react-native-qrcode-svg` | QR code generation |
| `expo-barcode-scanner` | QR scanning |
| `react-native-paper ^5` | Material Design components |
| `expo-haptics` | Haptic feedback |
