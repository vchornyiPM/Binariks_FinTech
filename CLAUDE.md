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

## Architecture

This is an **Expo (React Native) app** using **expo-router** for file-based routing with TypeScript strict mode. The New Architecture (`newArchEnabled: true`) and React Compiler (`reactCompiler: true`) experiments are both enabled.

### Routing

expo-router uses the filesystem. The entry point is `expo-router/entry` (set in `package.json`).

- `app/_layout.tsx` — Root layout: wraps the entire app in `ThemeProvider` (light/dark), defines a `Stack` navigator with `(tabs)` as the anchor
- `app/(tabs)/_layout.tsx` — Tab navigator with Home and Explore tabs
- `app/(tabs)/index.tsx` — Home tab screen
- `app/(tabs)/explore.tsx` — Explore tab screen
- `app/modal.tsx` — Modal screen (presented over tabs)

### Theming

Theme is driven by `useColorScheme` (from `react-native`, re-exported via `hooks/use-color-scheme.ts`; web variant in `hooks/use-color-scheme.web.ts`).

- `constants/theme.ts` — Exports `Colors` (light/dark palette) and `Fonts` (platform-specific font stacks)
- `hooks/use-theme-color.ts` — Hook that resolves a color name to the correct light/dark value, with prop override support
- `ThemedText` and `ThemedView` in `components/` wrap RN primitives and apply theme colors automatically

### Path Aliases

`@/` maps to the project root (configured in `tsconfig.json`). Use `@/components/...`, `@/hooks/...`, `@/constants/...` throughout.

### Platform-Specific Files

Files ending in `.ios.tsx` or `.web.ts` are automatically resolved by the platform. For example:
- `components/ui/icon-symbol.ios.tsx` — SF Symbols implementation for iOS
- `components/ui/icon-symbol.tsx` — Fallback for Android/web
- `hooks/use-color-scheme.web.ts` — Web-specific color scheme hook
