# KEY_PATHS — File Location Cheat Sheet

All paths relative to `AbbasiTahseel/`.

## Printer module

```
src/services/printer/
├── cp1256.ts                       Unicode→cp1256 map + Arabic shaper + encoder
├── escposBuilder.ts                ESC/POS primitives + printText/Line/Barcode
├── PrinterManager.ts               BT Classic singleton + TinyEmitter
├── testPage.ts                     Self-test ESC/POS sequence
└── receiptBuilders/
    ├── index.ts                    Barrel
    ├── buildReadingReceipt.ts      Reading receipt composer
    ├── buildBondReceipt.ts         Bond receipt composer
    └── buildDailySummary.ts        End-of-day summary composer
```

## Stores (Zustand)

```
src/stores/
├── index.ts                        Barrel
├── authStore.ts                    Login / refresh / dev bypass / loadFromStorage
├── licenseStore.ts                 License activation state
├── syncStore.ts                    Outbound sync state
├── readingsStore.ts                Readings list filters + sort (Wave 4)
└── printerStore.ts                 Printer UI state (Wave 5)
```

## Screens

```
src/screens/auth/                   Splash, LicenseActivation, Login, PinSetup
src/screens/main/                   Home, Readings, ReadingDetail, Bonds*,
                                    Reports*, Profile*, Settings, About
src/screens/settings/               ServerSettingsScreen
                                    + PrinterSettingsScreen   ← Wave 5 NEW
                                    + CompanyInfoScreen        ← Wave 5 NEW
                                    + ScannerScreen (main/)    ← Wave 5 NEW
```
`*` = stub from Wave 3, fleshed out in Waves 6/7.

## Navigation

```
src/navigation/
├── types.ts                        MainStackParamList ← ADD: PrinterSettings,
│                                                          CompanyInfo, Scanner
├── RootNavigator.tsx               Auth vs Main switch
├── AuthStack.tsx                   Splash → License → Login → PinSetup
├── MainStack.tsx                   Drawer; mount new screens here
├── MainTabs.tsx                    Bottom tabs (Home/Readings/Bonds/Reports)
└── DrawerContent.tsx               Right-side drawer; append printer + company items
```

## Database

```
src/database/
├── index.ts                        `database` singleton + re-exports
├── adapter.ts                      SQLite adapter
├── schema.ts                       Tables + columns (legacy names preserved)
├── migrations.ts                   schema migration history
└── models/
    ├── Reading.ts                  Used in Wave 4 + (printer Wave 5)
    ├── CompanyInfo.ts              Used in CompanyInfoScreen (Wave 5) + receipts
    ├── User.ts                     Used by authStore
    ├── Bond.ts / BondPayment.ts    Defined; activated in Wave 6
    └── ...
```

## i18n

```
src/i18n/
├── index.ts                        i18next init (ar primary, en fallback)
└── locales/
    ├── ar.json                     ← MERGE printer/scanner/company keys here
    └── en.json
```

## Prepared assets (git-ignored — reference only)

```
prepared-assets/
├── INDEX.md
├── printer/                        cp1256 JSON, Datecs SDK research, ESC/POS ref
├── receipts/                       3 print templates (md)
├── i18n/                           ar-wave5-printer.json, ar-wave6-bonds.json,
│                                   ar-wave7-reports.json, ar-validation-errors.json
├── mock/                           mock-{accounts,bonds,currencies,payments,reports}.json
├── proguard/                       proguard-rules.pro (Wave 7)
├── ci/                             build-release-apk.yml, keystore-setup.md (Wave 7)
└── docs/                           USER_GUIDE_AR.md, MIGRATION_GUIDE_AR.md, etc. (Wave 7)
```

## Android native

```
android/app/src/main/
├── AndroidManifest.xml             ← ADD BT + camera permissions (Wave 5)
├── java/com/abbasi/tahseel/        Native modules (autolinked)
└── res/                            App icons, splash drawable
android/app/build.gradle            ← Wave 7: signing + ProGuard + release config
```

## Top-level

```
PROJECT_PLAYBOOK.md                 Wave history + ADR-001..014; append Wave 5 here
package.json                        Deps; bluetooth-classic + buffer just added
tsconfig.json                       Strict mode + noUncheckedIndexedAccess
```
