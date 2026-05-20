# CODING_RULES — Red Lines (Do Not Cross)

## TypeScript

- **NO `any`.** Use `unknown` + narrowing.
- **NO `@ts-ignore` / `@ts-expect-error`.** Fix the type instead.
- **NO `as unknown as X`.** Refactor types or use proper guards.
- `noUncheckedIndexedAccess` is ON → array/object lookups return `T | undefined`.
- Run `npx tsc --noEmit` before every commit; **0 errors** required.

## Legacy compatibility (CRITICAL)

DB columns that MUST keep their exact lowercase names (server-side depends
on them via /Login, /pushReading, /pushBond):

```
num   name   namet   ind   nomstlm   notblh   noadad   nog
ks    kh     cas     asts  sync_status
```

In TS models, the **column name** stays legacy; only **TypeScript property
names** can be aliased. Example: `@text('sync_status') pushStatus!: PushStatus`.

Computed accessors (e.g. `meterNumber`, `customerName`) live as getters on
the model — they don't change storage.

## Styling

- **No hardcoded `#hex`.** Always pull from `useTheme().colors`.
- **Icons:** Feather only (ADR-008). `react-native-vector-icons/Feather`.
- **RTL:** screens must work with `I18nManager.isRTL === true`. Avoid
  `marginLeft/Right`; prefer `marginStart/End`.
- **All UI strings:** go through i18next (`t('…')`). Arabic is primary.
  Add new keys to `src/i18n/locales/ar.json`. English is best-effort.

## State management

- **Zustand only** (ADR-001). No Redux / Recoil / Jotai.
- **WatermelonDB observables** for list data (ADR-002). Use `observe()`
  + `Q.where(...)` + rxjs `map` if cross-column filtering is needed.
- Stores never call `navigation.navigate()`. RootNavigator swaps stacks
  based on auth/license flags.

## Receipts / Printer

- All print bytes flow through `escposBuilder` helpers. Don't write raw
  ESC/POS bytes inline in screens.
- Arabic text is automatically shaped + reversed by `printText()` —
  callers pass raw Unicode strings.
- `PrinterManager.print()` requires `isConnected() === true` — callers
  must check or rely on the store action which sets `lastError`.

## Commits

- Format: `type(scope): description` (e.g. `feat(printer): ...`).
- One concern per commit. No mixed waves.
- **Push immediately after each commit.** No local-only history.
- WIP commits allowed during long sessions; squash before PR.

## Testing

- No unit-test framework configured yet. Manual verification via Metro
  + adb install of CI APK.
- Use `__DEV__` guards for dev-only paths (see `services/auth/devBypass.ts`).

## File length

- Soft cap: 500 lines per screen, 300 lines per store / service module.
- Split into helper files when crossing the cap.

## Imports

- Use the `@/` alias (resolves to `src/`). Don't use deep `../../../`.
- Barrel exports (`index.ts`) where they exist — don't import from internal
  paths if a barrel is provided.
