# Skill — Zustand Store Architecture (Project-Specific)

> How stores are built in THIS project. Patterns, idioms, anti-patterns.

## The 5 stores

| Store | Owns | Notes |
|---|---|---|
| `useAuthStore` | login state, tokens, user, isDevBypass | Two-stage login (PR #26) |
| `useLicenseStore` | activation state, license key | Calls /license endpoints |
| `useSyncStore` | outbound queue, sync timer, progress | Wave 3 |
| `useReadingsStore` | filters + sort, NOT the list itself | List comes from WatermelonDB observable |
| `usePrinterStore` | connection state, devices, lastError | Subscribes to PrinterManager events |

## Anatomy of a store

```ts
// src/stores/fooStore.ts
import { create } from 'zustand';
import { logger } from '@/utils/logger';

const log = logger.scope('FooStore');

export interface FooState {
  // ─── State ────────────────────────────────
  someField: string | null;
  isLoading: boolean;
  error: string | null;

  // ─── Actions (always async if they touch the network or storage) ─
  doSomething(arg: string): Promise<boolean>;
  clearError(): void;
}

export const useFooStore = create<FooState>((set, get) => ({
  someField: null,
  isLoading: false,
  error: null,

  async doSomething(arg) {
    set({ isLoading: true, error: null });
    try {
      // ... network call, storage, etc.
      set({ someField: result, isLoading: false });
      return true;
    } catch (err) {
      log.warn('doSomething failed', { message: ... });
      set({ isLoading: false, error: 'foo.error.someKey' });
      return false;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
```

## Hard rules

### 1. Stores DON'T touch navigation

```ts
// ❌ NEVER
import { navigationRef } from '@/navigation/ref';
async logout() {
  await clearTokens();
  navigationRef.current?.navigate('Login'); // ← no
}

// ✅ ALWAYS
async logout() {
  await clearTokens();
  set({ isAuthenticated: false }); // RootNavigator observes this
}
```

`RootNavigator` swaps stacks based on flags like `isAuthenticated` and
`isLicenseValid`. Stores flip flags; navigator reacts.

### 2. Actions return booleans, not errors

```ts
// ❌ Throws — caller has to wrap in try/catch
async login(...): Promise<void>

// ✅ Returns boolean; sets `error` on failure
async login(...): Promise<boolean>
```

Callers use the return value for branching:
```tsx
const ok = await useAuthStore.getState().login(username, password);
if (ok) {
  // navigation handled by RootNavigator
} else {
  // error already set in store — UI shows it via selector
}
```

### 3. Use selectors, not the whole store

```tsx
// ❌ Re-renders on EVERY state change
const auth = useAuthStore();

// ✅ Re-renders only when this slice changes
const isAuthenticated = useAuthStore(s => s.isAuthenticated);
const user = useAuthStore(s => s.user);
```

### 4. Logger scope on every store

```ts
const log = logger.scope('FooStore');
// ... use log.info / log.warn / log.error
```

This makes the logger output filterable by scope in logcat:
```bash
adb logcat -s ReactNativeJS:V | grep FooStore
```

### 5. Error keys are i18n keys, not strings

```ts
// ❌
set({ error: 'Login failed. Please try again.' });

// ✅
set({ error: 'auth.login.invalidCredentials' });
// then in the screen:
const t = useTranslation();
return <Text>{t(error)}</Text>;
```

## The login() pattern (two-stage, post-PR #26)

This is the canonical pattern for endpoints that might be implemented
multiple ways on the server:

```ts
async login(username, password) {
  set({ isLoading: true, error: null, lastLoginError: null });

  // Dev bypass shortcut
  if (isDevBypassCredentials(username, password)) {
    // ... mint local session ...
    return true;
  }

  // STAGE 1: primary endpoint
  let stage1Diagnostic: string | null = null;
  try {
    const raw = await api.call('authenticate', { body: {...} });
    const parsed = AuthenticateResponseSchema.safeParse(raw);
    if (parsed.success && parsed.data.length > 0) {
      // SUCCESS — persist and exit
      return true;
    }
    // capture diagnostic for STAGE 2 to surface later
    stage1Diagnostic = `STAGE 1 ... ${rawAsString}`;
  } catch (err) {
    stage1Diagnostic = `STAGE 1 ... HTTP ${status} ${code}`;
  }

  // STAGE 2: fallback endpoint
  try {
    const raw = await api.call('login', { body: {...} });
    // ... parse ...
    if (success) return true;
    // SET lastLoginError WITH BOTH STAGES IN responseBody
    return false;
  } catch (err) {
    // SET lastLoginError WITH BOTH STAGES IN responseBody
    return false;
  }
}
```

When you need the same pattern elsewhere (e.g. if `/SaveReading` and
`/saveReading` both work on certain server builds), copy this shape.

## Subscribing to events outside React

`usePrinterStore` subscribes to `PrinterManager` events at store-init
time:

```ts
// fooStore.ts
SomeEventSource.on('connect', () => {
  useFooStore.setState({ isConnected: true });
});
SomeEventSource.on('disconnect', () => {
  useFooStore.setState({ isConnected: false });
});
```

This pattern lets non-React modules push state into the store. Works
because Zustand's `setState` is callable from anywhere.

## Persistence

Zustand's `persist` middleware is **NOT** used here. We persist
selectively via MMKV or Keychain:

```ts
// In a store action:
await Promise.all([
  setAccessToken(access),         // → Keychain
  setLastUsername(username),       // → MMKV
]);
setLastLoginAt(new Date());       // → MMKV
```

On app launch, `loadFromStorage()` reads them back:

```ts
async loadFromStorage() {
  const [access, refresh, lastUsername] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
    getLastUsername(),
  ]);
  // ... hydrate state ...
}
```

Called once from `App.tsx` after fonts/i18n init.

## Anti-patterns to avoid

- **Don't `useState` inside the store.** Stores have no React. Use
  `set/get` only.
- **Don't make actions return data.** Return a boolean; the data lives
  in the store after `set`. Components read it via selectors.
- **Don't share state between stores.** If two stores need to coordinate,
  one of them subscribes to the other:
  ```ts
  useAuthStore.subscribe((state, prev) => {
    if (!state.isAuthenticated && prev.isAuthenticated) {
      useSyncStore.getState().reset();
    }
  });
  ```
- **Don't call `set` inside a selector.** Selectors are pure reads.

## Testing stores

No test framework is configured yet. Manual testing via:
1. Run the app in dev (`npx react-native start` + adb install debug APK)
2. Trigger the action through the UI
3. Inspect logger output via logcat or react-native debugger

When tests are added (Wave 8+), the pattern will be:
```ts
const initialState = useFooStore.getState();
afterEach(() => useFooStore.setState(initialState, true));
// then call actions directly and assert state
```
