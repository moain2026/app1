# PROJECT_MAP — Directory Layout (2 levels)

```
AbbasiTahseel/
├── android/                        # Native Android project (RN 0.74.5)
│   └── app/src/main/AndroidManifest.xml   # ← needs BT+Camera perms (Wave 5)
├── ios/                            # iOS — not the primary target
├── prepared-assets/                # git-ignored reference material
│   ├── printer/                    # cp1256 mapping + Datecs SDK research
│   ├── receipts/                   # 3 print templates (reading/bond/daily)
│   ├── i18n/                       # bulk Arabic strings (Waves 5/6/7)
│   ├── mock/                       # mock data for Waves 6+7
│   ├── proguard/                   # release minify rules (Wave 7)
│   ├── ci/                         # release workflow + keystore docs (Wave 7)
│   └── docs/                       # user/admin/migration guides (Wave 7)
├── AGENT_CONTEXT/                  # this folder
├── PROJECT_PLAYBOOK.md             # waves history + ADRs (1..14 currently)
└── src/
    ├── app/                        # App entry (App.tsx)
    ├── components/
    │   ├── cards/                  # SummaryCard, etc.
    │   ├── forms/                  # TextField, PasswordField, PinInput, PrimaryButton
    │   ├── layout/                 # AppHeader
    │   ├── readings/               # ReadingRow, ReadingStatBadge, SearchBar, FilterChips
    │   └── sync/                   # SyncBadge
    ├── database/
    │   ├── adapter.ts              # SQLite adapter (WatermelonDB)
    │   ├── index.ts                # `database` singleton
    │   ├── migrations.ts           # schema migrations
    │   ├── schema.ts               # WMDB schema (legacy column names preserved)
    │   └── models/                 # Account, Bond, BondPayment, CompanyInfo,
    │                               # Currency, Place, Reading, SyncLog,
    │                               # SyncQueueItem, TGroup, Tblh, User
    ├── design-system/
    │   ├── components/             # primitives
    │   ├── theme/                  # darkTheme.ts (default), lightTheme.ts, ThemeProvider
    │   └── tokens/                 # spacing, typography, radii
    ├── features/                   # cross-screen feature modules
    ├── hooks/                      # custom React hooks ← usePrinter goes here (Wave 5)
    ├── i18n/
    │   ├── index.ts                # i18next init
    │   └── locales/{ar,en}.json    # ar is primary; en partial
    ├── navigation/
    │   ├── AuthStack.tsx           # Splash → License → Login → PinSetup
    │   ├── MainStack.tsx           # Drawer (Tabs + secondary screens)
    │   ├── MainTabs.tsx            # Home / Readings / Bonds / Reports
    │   ├── DrawerContent.tsx       # right-side drawer with MENU_ITEMS
    │   ├── RootNavigator.tsx       # Auth vs Main switch
    │   └── types.ts                # *ParamList types
    ├── screens/
    │   ├── auth/                   # Splash, LicenseActivation, Login, PinSetup
    │   ├── main/                   # Home, Readings, ReadingDetail, Bonds (stub),
    │   │                           # Reports (stub), Profile (stub), Settings,
    │   │                           # About
    │   └── settings/               # ServerSettingsScreen
    ├── services/
    │   ├── api/                    # axios + interceptors + zod schemas
    │   ├── auth/                   # devBypass.ts, etc.
    │   ├── mock/                   # mockReadings.ts, seedMockData.ts
    │   ├── permissions/            # runtime permission helpers
    │   ├── printer/                # cp1256, escposBuilder, PrinterManager,
    │   │                           # testPage, receiptBuilders/
    │   ├── repository/             # readingsRepository (reactive queries)
    │   ├── security/               # licenseManager, secureId
    │   ├── storage/                # prefs.ts (MMKV), secureStorage.ts (Keychain)
    │   └── sync/                   # outbound queue
    ├── stores/                     # Zustand: auth, license, sync, readings, printer
    ├── types/                      # ambient types
    └── utils/                      # logger.ts, formatters, etc.
```

## Models (DB)

`Reading`, `User`, `CompanyInfo`, `Account`, `Bond` (defined, unused until
Wave 6), `BondPayment`, `Currency`, `Place`, `TGroup`, `Tblh`, `SyncLog`,
`SyncQueueItem`.

## Stores (Zustand)

`useAuthStore`, `useLicenseStore`, `useSyncStore`, `useReadingsStore`,
`usePrinterStore`.

## Services

`api`, `auth`, `database`, `license` (in security/), `mock`, `permissions`,
`printer`, `repository`, `security`, `storage`, `sync`.
