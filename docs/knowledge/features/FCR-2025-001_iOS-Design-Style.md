# Feature Change Request (FCR)

## Document Information
- **Change Request ID**: CR-2025-001
- **Target Feature**: UI/UX Design Guidelines (PRD Section 8)
- **Related PRD Version**: v1.0
- **Date**: March 2025
- **Requester**: Binariks PM Team
- **Status**: Draft
- **Change Scope**:
  - [x] **User Experience (UX/UI)**: Changes to visuals, flows, or user interactions.
  - [ ] **Functional Logic**: Changes to business rules or calculations.
  - [x] **Technical/Infrastructure**: Platform-specific component libraries, font loading, safe area handling.
  - [ ] **Observability**: Logging, Metrics, Alerting.

---

## Executive Summary

The original PRD (v1.0) defines a cross-platform UI design system using React Native Paper and generic design tokens. While this foundation is sound, it lacks platform-specific iOS guidelines that are critical for delivering a premium, native-feeling experience on Apple devices — the primary device used during live sales demos.

iOS users have strong expectations rooted in Apple's Human Interface Guidelines (HIG): large navigational titles, spring-physics animations, haptic feedback, SF Symbols, and SF Pro typography. Failing to meet these expectations during a demo risks undermining the "polished product" narrative that Binariks presents to prospective clients.

This FCR extends Section 8 (UI/UX Design Guidelines) of the PRD with a new sub-section (8.4) dedicated to iOS-specific design and interaction patterns. All changes are additive — existing cross-platform guidelines remain valid for Android/web targets.

---

## 1. Context and Problem Statement

### 1.1 The Need (Why Change?)
During demo preparation review it was identified that the PRD's design guidelines treat iOS and Android equally. Since most live sales demos are conducted on iPhone devices, we need an iOS-optimised layer on top of the generic design system. This change is also driven by App Store submission readiness: Apple's HIG compliance is a prerequisite for production App Store approval (production path per PRD section 13.3).

### 1.2 Current Limitation
PRD Section 8 (UI/UX Design Guidelines) specifies:
- Generic design tokens (colours, typography names) with no iOS-specific font bindings
- No reference to SF Symbols, SF Pro, or iOS navigation conventions
- No haptic feedback specification
- No safe area or Dynamic Island guidance
- No iOS dark mode token overrides beyond `userInterfaceStyle: automatic` in `app.json`
- No spring-physics animation spec (reanimated defaults are used)

### 1.3 Expected Outcome
A new sub-section 8.4 — **iOS Design & Interaction Style** — is added to the PRD that gives engineers concrete, implementation-ready specifications for:
- Typography using SF Pro via the system font stack
- SF Symbols mapped to every icon usage in the app
- Navigation patterns aligned with iOS HIG (large titles, swipe-back, modal cards)
- Haptic feedback triggers at every meaningful interaction point
- Safe Area and Dynamic Island handling rules
- iOS dark mode token overrides
- Spring-physics animation presets using `react-native-reanimated`
- Native iOS component usage (Action Sheets, Alerts, Context Menus)

---

## 2. Requirement Changes (The Delta)

### 2.1 UX & User Flow Changes (Visual/Interaction)

**Is there a UX Change?** Yes

#### Typography Delta

| Screen / Component | Current Experience (Before) | New Experience (After) | Design Ref |
|---|---|---|---|
| All screen headers | Generic bold text, no font specified | SF Pro Display Bold — `largeTitle` style (34 pt) via `useLargeTitle: true` on stack screens | HIG: Large Titles |
| Body text | System default font | SF Pro Text Regular 17 pt for body, SF Pro Text Medium 15 pt for labels | HIG: Typography |
| Numeric values (balances) | `toLocaleString` only | SF Pro Display Tabular (monospaced numbers) to prevent layout shift on balance updates | HIG: Numbers |
| WalletCard balance | Unspecified | SF Pro Display Heavy 28 pt, tracking -0.5 | Custom |

**SF Pro Font Loading:**
SF Pro is a system font on iOS — no font file bundling required. Use:
```ts
// constants/fonts.ts (iOS section)
export const IOSFonts = {
  largeTitle:  { fontFamily: 'System', fontSize: 34, fontWeight: '700' as const },
  title1:      { fontFamily: 'System', fontSize: 28, fontWeight: '700' as const },
  title2:      { fontFamily: 'System', fontSize: 22, fontWeight: '700' as const },
  title3:      { fontFamily: 'System', fontSize: 20, fontWeight: '600' as const },
  headline:    { fontFamily: 'System', fontSize: 17, fontWeight: '600' as const },
  body:        { fontFamily: 'System', fontSize: 17, fontWeight: '400' as const },
  callout:     { fontFamily: 'System', fontSize: 16, fontWeight: '400' as const },
  subheadline: { fontFamily: 'System', fontSize: 15, fontWeight: '400' as const },
  footnote:    { fontFamily: 'System', fontSize: 13, fontWeight: '400' as const },
  caption1:    { fontFamily: 'System', fontSize: 12, fontWeight: '400' as const },
  caption2:    { fontFamily: 'System', fontSize: 11, fontWeight: '400' as const },
};
```

#### SF Symbols Delta

| Feature Area | Current Icon | SF Symbol Name | Fallback (MaterialIcons, Android) |
|---|---|---|---|
| Home / Dashboard tab | `home` MaterialIcon | `house.fill` | `home` |
| History tab | `history` | `clock.arrow.circlepath` | `history` |
| Exchange tab | `swap-horiz` | `arrow.left.arrow.right.circle.fill` | `swap-horiz` |
| QR tab | `qr-code` | `qrcode.viewfinder` | `qr-code` |
| Profile tab | `person` | `person.crop.circle.fill` | `person` |
| Send Money | `send` | `paperplane.fill` | `send` |
| Top-Up | `add-circle` | `plus.circle.fill` | `add-circle` |
| Withdraw | `arrow-downward` | `arrow.down.circle.fill` | `arrow-downward` |
| Transfer (received) | `arrow-downward` | `arrow.down.left.circle.fill` | `arrow-downward` |
| Transfer (sent) | `arrow-upward` | `arrow.up.right.circle.fill` | `arrow-upward` |
| Exchange transaction | `swap-horiz` | `arrow.triangle.2.circlepath.circle.fill` | `swap-horiz` |
| KYC Verified | `check-circle` | `checkmark.seal.fill` | `check-circle` |
| KYC Pending | `schedule` | `hourglass.circle.fill` | `schedule` |
| Logout | `logout` | `rectangle.portrait.and.arrow.right` | `logout` |
| Scan QR | `camera` | `camera.viewfinder` | `camera` |
| Notification | `notifications` | `bell.fill` | `notifications` |
| Copy / Share | `content-copy` | `doc.on.doc.fill` | `content-copy` |
| Refresh | `refresh` | `arrow.clockwise` | `refresh` |
| Close / Dismiss | `close` | `xmark.circle.fill` | `close` |
| Filter | `filter-list` | `line.3.horizontal.decrease.circle` | `filter-list` |
| Chart | `bar-chart` | `chart.bar.fill` | `bar-chart` |

**Implementation:** Use `expo-symbols` (already in dependencies) for SF Symbols on iOS with `@expo/vector-icons` MaterialIcons as fallback:
```tsx
// components/ui/icon-symbol.ios.tsx — already exists, extend mapping
import { SymbolView } from 'expo-symbols';
// components/ui/icon-symbol.tsx — fallback for Android/web
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
```

#### Navigation Pattern Delta

| Screen / Component | Current Experience (Before) | New Experience (After) | Design Ref |
|---|---|---|---|
| Stack screen headers | Default Expo Router header | `headerLargeTitle: true` on Dashboard, History, Profile | HIG: Navigation Bars |
| Modal presentation | Standard push | `presentation: 'modal'` with card-style sheet for Send Money, Transaction Detail | HIG: Sheets |
| Back navigation | Default back button | Swipe-from-left-edge gesture enabled (`gestureEnabled: true`), back button label shows previous screen name | HIG: Back Buttons |
| Tab bar | Default Expo tabs | `tabBarStyle` with blur background (`BlurView` from `expo-blur`), SF Symbol icons | HIG: Tab Bars |
| Bottom sheet confirmations | react-native-bottom-sheet default | Detent-based sheet: `snapPoints: ['50%', '90%']`, `handleIndicatorStyle` matches iOS modal pill | HIG: Sheets |
| Alert dialogs | Custom modal | `Alert.alert()` native iOS Alert for destructive actions (logout, delete) | HIG: Alerts |
| Action sheets | Custom menu | `ActionSheetIOS.showActionSheetWithOptions()` for wallet selector, filter options | HIG: Action Sheets |

**Stack navigator options (app/(tabs)/_layout.tsx additions):**
```tsx
// For iOS large title screens
screenOptions={{
  headerLargeTitle: true,
  headerLargeTitleShadowVisible: false,
  headerBlurEffect: 'regular',
  headerTransparent: true,
}}
```

**Description of Flow Change:**
Navigational chrome changes are entirely additive — no business logic flows change. On iOS, users will experience native large-title collapse-on-scroll behaviour on the Dashboard, History, and Profile tabs. Send Money and Transaction Detail will slide up as modal cards (iOS 15+ style card sheet) rather than push screens, matching the UX pattern users expect from Apple Pay, Revolut, and N26. Destructive actions (Logout) will use the native `Alert.alert()` with a destructive-styled button in red per HIG.

---

#### Haptic Feedback Specification

All haptic calls use `expo-haptics` (already in dependencies).

| Trigger Event | Haptic Type | `expo-haptics` Call |
|---|---|---|
| Successful login | `notificationAsync(Success)` | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` |
| Transfer executed successfully | `notificationAsync(Success)` | same |
| FX exchange executed | `notificationAsync(Success)` | same |
| Form validation error | `notificationAsync(Error)` | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` |
| Network error toast | `notificationAsync(Warning)` | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` |
| Tap primary button (Sign In, Exchange Now, Send) | `impactAsync(Medium)` | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` |
| Tap tab bar icon | `impactAsync(Light)` | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` |
| Tap WalletCard (carousel scroll snap) | `selectionAsync()` | `Haptics.selectionAsync()` |
| QR code successfully scanned | `notificationAsync(Success)` | same as login |
| Pull-to-refresh triggered | `impactAsync(Light)` | Light impact on drag past threshold |
| Toggle filter chip | `selectionAsync()` | `Haptics.selectionAsync()` |
| Copy transaction ID | `impactAsync(Light)` | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` |

---

#### Safe Area & Dynamic Island

| Rule | Specification |
|---|---|
| Safe area insets | All screens wrapped in `<SafeAreaView>` from `react-native-safe-area-context`. Never use hardcoded top padding. |
| Dynamic Island / notch | `useSafeAreaInsets()` hook — use `insets.top` for any custom header positioning |
| Home indicator bar | `<SafeAreaView edges={['bottom']}>` on all tab screens. Add `paddingBottom: insets.bottom` to floating action buttons. |
| Landscape orientation | Locked to portrait per `app.json` (`orientation: 'portrait'`) — no landscape safe area handling required |
| Keyboard avoidance | Use `KeyboardAvoidingView` with `behavior='padding'` on iOS for Send Money amount input and Login form |

---

#### iOS Dark Mode Token Overrides

Extends PRD Section 8.1 Design Tokens for iOS dark mode (system `Dark` appearance).

| Token | Light Value (existing) | iOS Dark Override |
|---|---|---|
| Background | `#F5F7FA` | `#000000` (true black — OLED optimised) |
| Card BG | `#FFFFFF` | `#1C1C1E` (iOS system grouped background) |
| Text Primary | `#1A1A2E` | `#FFFFFF` |
| Text Secondary | `#6B7280` | `#8E8E93` (iOS system secondary label) |
| Border | `#E5E7EB` | `#38383A` (iOS system separator) |
| Primary Blue | `#1A56DB` | `#0A84FF` (iOS system blue dark) |
| Success Green | `#10823B` | `#30D158` (iOS system green dark) |
| Error Red | `#9B1C1C` | `#FF453A` (iOS system red dark) |
| WalletCard gradient start | `#0E4D99` | `#1C3D6E` |
| WalletCard gradient end | `#1A56DB` | `#0A84FF` |
| Tab bar background | `#FFFFFF` | Blur effect via `BlurView` (replaces solid colour) |

**Implementation** — Use the existing `useThemeColor` hook pattern. In `constants/theme.ts`, add `iosDark` overrides:
```ts
export const Colors = {
  light: { ... },   // existing
  dark:  { ... },   // existing — update to iOS dark values above
};
```

---

#### iOS Spring-Physics Animation Presets

All animations use `react-native-reanimated` (already in dependencies). Define standard presets in `constants/animations.ts`:

```ts
// constants/animations.ts
import { withSpring, withTiming, Easing } from 'react-native-reanimated';

export const IOSSpring = {
  // Standard iOS spring — used for card appearance, modal entry
  standard: { damping: 18, stiffness: 300, mass: 1 },
  // Bouncy — used for success checkmark, wallet card selection
  bouncy:   { damping: 12, stiffness: 350, mass: 0.8 },
  // Snappy — used for tab bar press, button feedback
  snappy:   { damping: 22, stiffness: 400, mass: 0.9 },
  // Gentle — used for number counting animation on balance
  gentle:   { damping: 25, stiffness: 200, mass: 1.2 },
};

export const IOSTiming = {
  // Standard easing curves from iOS HIG
  easeOut:    { duration: 250, easing: Easing.out(Easing.cubic) },
  easeInOut:  { duration: 350, easing: Easing.inOut(Easing.cubic) },
  fast:       { duration: 150, easing: Easing.out(Easing.quad) },
};
```

| Animation | Preset | Applied To |
|---|---|---|
| WalletCard scroll-snap | `IOSSpring.standard` | Horizontal FlatList `scrollToIndex` |
| WalletCard selection scale | `IOSSpring.bouncy` `scale: 1.04 → 1.0` | Card tap feedback |
| Balance number count-up | `IOSSpring.gentle` with `withSpring` | Balance display on Dashboard load |
| Success checkmark reveal | `IOSSpring.bouncy` `scale: 0 → 1` | Transfer/FX success screen |
| Modal sheet entry | Reanimated `withSpring(IOSSpring.standard)` | ConfirmSheet, Transaction Detail |
| Tab bar icon press | `IOSSpring.snappy` `scale: 0.85 → 1.0` | Tab icon feedback |
| Skeleton → content fade | `IOSTiming.easeOut` `opacity: 0 → 1` | SkeletonLoader → real content |
| Toast slide-in | `IOSTiming.easeOut` `translateY: -60 → 0` | Toast notification |
| Quick action buttons | `IOSSpring.snappy` `scale: 0.92 → 1.0` | Send, Receive, Exchange, Top-Up |

---

#### iOS Layout Grid & Spacing

| Token | Value | Usage |
|---|---|---|
| Base unit | 4 pt | All spacing is a multiple of 4 |
| Screen horizontal margin | 16 pt | `paddingHorizontal: 16` on all screens |
| Card corner radius | 16 pt | WalletCard, list item cards |
| Button corner radius | 14 pt | Primary buttons (matches iOS 17 pill style) |
| List separator inset | 16 pt left | TransactionRow separator inset |
| Section header height | 28 pt | Filter bar, section headers |
| Tab bar height | 83 pt (49 pt bar + 34 pt home indicator area) | Managed by SafeAreaView |
| Bottom sheet handle width | 36 pt | ConfirmSheet drag handle |
| Minimum tappable area | 44 × 44 pt | All interactive elements per HIG |

---

### 2.2 Technical & Data Changes

**Database / Data Model Updates:**
N/A — this is a pure UI/design change. No data model modifications required.

**API & Logic Updates:**
| Endpoint / Service | Type | Change Description |
|---|---|---|
| N/A | — | No API changes. All changes are presentational. |

**New Package Dependencies:**
| Package | Version | Purpose | Already in package.json? |
|---|---|---|---|
| `expo-blur` | `~14.0.x` | Tab bar blur background (`BlurView`) | No — add |
| `expo-haptics` | `~15.0.8` | Haptic feedback | Yes ✓ |
| `expo-symbols` | `~1.0.8` | SF Symbols on iOS | Yes ✓ |
| `react-native-safe-area-context` | `~5.6.0` | Safe area insets | Yes ✓ |
| `react-native-reanimated` | `~4.1.1` | Spring animations | Yes ✓ |
| `expo-linear-gradient` | — | WalletCard gradient (already in PRD) | No — add |

Install commands:
```bash
npx expo install expo-blur expo-linear-gradient
```

**New Files Required:**
| File Path | Purpose |
|---|---|
| `constants/animations.ts` | iOS spring/timing animation presets |
| `components/ui/icon-symbol.ios.tsx` | SF Symbols map (extend existing file) |
| `constants/theme.ts` | Update dark mode tokens to iOS system colours |

**Observability & Logging Requirements:**
N/A for this change.

---

## 3. Impact Analysis

### 3.1 Impact on Epics and Stories

| Impact Type | Epic/Story ID | Title | Action Required |
|---|---|---|---|
| Modify | AC-08 | All screens render on iOS 16+ via Expo Go | Extend acceptance criteria: verify large titles, haptics, SF Symbols, safe area on iPhone 14+ (Dynamic Island) and iPhone 16 Pro |
| Modify | PRD §8 | UI/UX Design Guidelines | Add Section 8.4 — iOS Design & Interaction Style (this FCR) |
| Modify | PRD §5.1 | Login Screen spec | Add: `KeyboardAvoidingView behavior='padding'`, haptic on Sign In tap |
| Modify | PRD §5.2 | Dashboard spec | Add: large title, SF Symbols on quick actions, spring animation on balance count-up |
| Modify | PRD §5.3 | Send Money spec | Add: modal card presentation, haptic on Confirm, ActionSheetIOS for wallet picker |
| Modify | PRD §5.4 | History Screen spec | Add: large title collapse, SF Symbols on filter chips, haptic on filter toggle |
| Modify | PRD §5.5 | FX Screen spec | Add: spring animation on rate update, haptic on Exchange Now |
| Modify | PRD §5.7 | Profile/KYC spec | Add: large title, native Alert for Logout confirmation, SF Symbol KYC badge |
| New | N/A | `constants/animations.ts` | Create file with iOS spring presets |
| New | N/A | iOS dark mode token audit | Engineer task: update `constants/theme.ts` dark palette to iOS system colours |

### 3.2 Impact on Documentation (PRD/SRS)

- **[x] User Interface / UX Flows**: Add Section 8.4 iOS Design & Interaction Style to PRD v1.0 → bump to v1.1
- **[x] Functional Requirements**: Per-screen spec sections (§5.1–§5.7) need iOS-specific notes added
- **[ ] Problem Statement**: No change
- **[ ] User Stories/Acceptance Criteria**: AC-08 extended (see 3.1 above)
- **[ ] Data Dictionary / Schema**: No change
- **[ ] Security / Compliance**: No change

---

## 4. Risks and Dependencies

### 4.1 New Dependencies
- `expo-blur` must be added to `package.json` and `npx expo install` run before tab bar blur can be implemented
- `expo-linear-gradient` required for WalletCard gradient (referenced in PRD §8.2 but not yet in `package.json`)
- SF Symbols availability: `expo-symbols` (`SymbolView`) requires iOS 13+ — covered by PRD requirement of iOS 16+
- `ActionSheetIOS` is iOS-only — Android equivalent must remain `react-native-bottom-sheet` or custom menu (no change to Android path)

### 4.2 Risks

| Risk | Probability | Impact | Mitigation Strategy |
|---|---|---|---|
| `react-native-reanimated` v4 API differences from PRD spec examples | Low | Medium | Verify animation API against installed version (`~4.1.1`). The `withSpring` config object shape may differ from v3. Test on device. |
| `headerLargeTitle` conflicts with custom header components | Low | Low | Use `headerLargeTitle` only on screens with no custom header. Send Money uses modal — not affected. |
| Tab bar `BlurView` performance on older iPhones (iPhone SE 2nd gen) | Low | Low | Fallback: `tabBarStyle={{ backgroundColor: 'rgba(255,255,255,0.9)' }}` for devices below iPhone 12 |
| `expo-symbols` SF Symbol name changes between iOS versions | Low | Low | All symbols listed in §2.1 are available iOS 15+. App targets iOS 16+. |
| `ActionSheetIOS` unavailable on Android — forgot platform guard | Medium | Medium | Wrap all `ActionSheetIOS` calls with `Platform.OS === 'ios'` guard. Android uses `react-native-bottom-sheet`. |

---

## 5. New PRD Section — Ready to Merge

The following section is ready to be inserted as **Section 8.4** in the PRD (`Project Docs/sdk_finance_banking_demo_PRD.txt`), after the existing Section 8.3 Demo Experience Rules:

---

### 8.4 iOS Design & Interaction Style

> This section applies to iOS builds only. Android continues to follow the cross-platform guidelines in §8.1–8.3.

#### 8.4.1 Typography — SF Pro System Font

Use iOS system font stack (`fontFamily: 'System'`) — SF Pro is loaded automatically. Define all text styles using `constants/animations.ts` → `IOSFonts` scale (matching Apple HIG type ramp). Key rules:
- Balance figures use tabular (monospaced) numerals — prevents layout shift on update
- Screen titles use `largeTitle` (34 pt Bold) collapsing to `headline` (17 pt Semibold) on scroll
- Never specify `fontFamily: 'SF Pro'` explicitly — this causes a crash; use `'System'`

#### 8.4.2 SF Symbols

Use `expo-symbols` (`SymbolView`) for all icons on iOS. Every icon in the app is mapped to an SF Symbol name in §2.1 of this FCR. `components/ui/icon-symbol.ios.tsx` provides the platform-specific implementation; `icon-symbol.tsx` provides the MaterialIcons fallback for Android/web.

#### 8.4.3 Navigation Patterns

- **Large Titles**: Enabled on Dashboard, History, and Profile tab screens via `headerLargeTitle: true`
- **Swipe Back**: `gestureEnabled: true` on all stack push screens (default in Expo Router — do not disable)
- **Modal Cards**: Send Money and Transaction Detail presented as `presentation: 'modal'` — iOS 15+ card sheet style
- **Tab Bar**: Blur background via `expo-blur` `BlurView` with `intensity={80}` and SF Symbol icons
- **Back Button**: Back button label displays the previous screen name (Expo Router default — preserve this)

#### 8.4.4 Native iOS Components

| Scenario | Component |
|---|---|
| Destructive confirmation (Logout, Cancel Transfer) | `Alert.alert()` with `style: 'destructive'` button |
| Wallet / currency picker | `ActionSheetIOS.showActionSheetWithOptions()` |
| Share transaction ID | `Share.share()` from `react-native` |
| Context menu on WalletCard long-press | `ContextMenuView` (optional, stretch goal) |

All native component calls must be guarded with `Platform.OS === 'ios'`.

#### 8.4.5 Haptic Feedback

All haptics via `expo-haptics`. Full trigger map in §2.1 of this FCR. Key rules:
- Every successful async operation (transfer, FX, login) triggers `notificationAsync(Success)`
- Every error triggers `notificationAsync(Error)` or `notificationAsync(Warning)`
- Every primary button tap triggers `impactAsync(Medium)`
- Selection changes (tabs, filter chips, wallet cards) trigger `selectionAsync()`

#### 8.4.6 Safe Area & Dynamic Island

- Wrap all screens in `<SafeAreaView edges={['top', 'bottom']}>` from `react-native-safe-area-context`
- Use `useSafeAreaInsets()` for custom headers and floating buttons
- Never hardcode `paddingTop: 44` or `paddingBottom: 34` — always derive from insets
- `orientation: 'portrait'` is locked — no landscape handling required

#### 8.4.7 Dark Mode

The app uses `userInterfaceStyle: automatic` (already in `app.json`). Dark mode tokens follow iOS system colour semantics (see §2.1 token table in this FCR). True black background (`#000000`) is used for OLED displays. All colour decisions use `useThemeColor()` hook — no hardcoded colours in components.

#### 8.4.8 Spring-Physics Animations

Define presets in `constants/animations.ts` using `react-native-reanimated`. Key conventions:
- `IOSSpring.standard` — default for most enter/exit transitions
- `IOSSpring.bouncy` — success states, selection feedback
- `IOSSpring.snappy` — button press micro-feedback
- Never use `Animated` from `react-native` — use `react-native-reanimated` exclusively

#### 8.4.9 Layout Grid

- All spacing is a multiple of **4 pt** (base unit)
- Screen horizontal padding: **16 pt**
- Card corner radius: **16 pt** (WalletCard), **12 pt** (list items)
- Button corner radius: **14 pt** (primary), **10 pt** (secondary)
- Minimum tap target: **44 × 44 pt** on all interactive elements

---

## 6. Sign-off

| Role | Name | Signature | Decision | Date |
|---|---|---|---|---|
| Product Owner | Binariks PM Team | | [Approve/Reject] | |
| Engineering Lead | | | [Feasible/Not Feasible] | |
| UX Lead | | | [Reviewed] | |
