# 📱 العباسي تحصيل — Al-Abbasi Tahsil

> تطبيق التحصيل الميداني الرسمي لـ **شركة العباسي لتوليد الكهرباء التجارية**.
>
> React Native (Bare) · TypeScript Strict · Offline-First · Android only · Arabic 100% RTL

---

## 🧭 ابدأ من هنا

- 📘 **[PROJECT_PLAYBOOK.md](./PROJECT_PLAYBOOK.md)** ← **وثيقة المرجع الكاملة** (مهام / حالة المشروع / معمارية / قواعد جودة).
  > أي وكيل / مطوّر / مراجع يجب أن يقرأها أولاً.

---

## 📂 بنية المشروع

```
AbbasiTahseel/
├── PROJECT_PLAYBOOK.md          ← المرجع المركزي
├── README.md                    ← هذا الملف
├── package.json
├── tsconfig.json                ← TS Strict Mode
├── babel.config.js              ← Decorators + Module Resolver + Reanimated
├── metro.config.js
├── .eslintrc.js                 ← ESLint + Import Order + RN rules
├── .prettierrc.js
├── react-native.config.js       ← Font linking
│
├── assets/
│   ├── fonts/                   ← Tajawal-*.ttf
│   ├── images/
│   └── logo/
│       └── abbasi_logo.png      ← شعار العباسي (درع العامل)
│
└── src/
    ├── app/                     ← Root entry, App.tsx, providers
    ├── design-system/           ✅ Phase 1 complete
    │   ├── tokens/              ← colors, typography, spacing, radii, shadows, motion
    │   ├── theme/               ← darkTheme, lightTheme, ThemeProvider
    │   └── components/          ← Button, Card, Input, BottomSheet (next)
    │
    ├── database/                ✅ Phase 2 complete
    │   ├── schema.ts            ← 12 tables, legacy field names preserved
    │   ├── adapter.ts           ← SQLite + JSI
    │   ├── migrations.ts
    │   ├── index.ts             ← database singleton
    │   ├── models/              ← 12 WatermelonDB models
    │   └── README.md
    │
    ├── services/
    │   ├── api/                 ← Phase 3 — Axios + endpoints + DTO mappers
    │   ├── sync/                ← Phase 4 — SyncWorker + queue
    │   ├── printer/             ← Phase 10 — BIXOLON SPP-R310 bridge (Mock first)
    │   ├── storage/             ← Keychain + MMKV
    │   └── permissions/
    │
    ├── features/                ← Feature-first organization
    │   ├── auth/
    │   ├── readings/            ← القراءات (core feature)
    │   ├── bonds/               ← السندات
    │   ├── reports/             ← التقارير
    │   ├── profile/
    │   ├── sync-dashboard/
    │   └── settings/
    │
    ├── navigation/              ← React Navigation v6 (Tabs + Stack + Drawer)
    ├── stores/                  ← Zustand stores
    ├── hooks/
    ├── utils/
    ├── i18n/                    ← Arabic only
    └── types/
```

---

## 🚦 الحالة الحالية

| Phase | الحالة |
|---|---|
| Phase 0 — Setup & Foundation | ✅ Complete |
| Phase 1 — Design System Tokens | ✅ Complete |
| Phase 2 — Database Schema + Models | ✅ Complete |
| Phase 3 — Network Layer | ⏳ Next |
| Phase 4 — Sync Engine | ⏳ |
| Phases 5–13 | ⏳ |

(تفاصيل كاملة في [PROJECT_PLAYBOOK.md § 14](./PROJECT_PLAYBOOK.md#-14-الحالة-الحالية-current-progress--live))

---

## 🛠️ الأوامر السريعة

```bash
npm install                    # تثبيت الاعتماديات
npm run typecheck              # فحص الأنواع (TS strict)
npm run lint                   # ESLint
npm run format                 # Prettier
npm run check                  # typecheck + lint + test
npm run android                # تشغيل على جهاز / محاكي
npm run build:android:release  # APK release
npm run assets                 # ربط ملفات الخطوط
npm run deps:graph             # فحص circular dependencies
```

---

## 🎯 القرارات المعمارية الحرجة

1. ✅ **WatermelonDB كـ Source of Truth** — كل قراءة UI من WatermelonDB.
2. ✅ **الحفاظ على أسماء حقول Backend** — `noadad`, `ks`, `kh`, `asts`, `cas`, إلخ.
3. ✅ **Offline-First** — كل كتابة محلية أولاً، ثم تدخل sync_queue.
4. ✅ **Android فقط** — minSdk 24.
5. ✅ **Arabic فقط + RTL 100%**.
6. ✅ **BIXOLON SPP-R310** — Mock interface أولاً.
7. ✅ **react-native-keychain** — لا بصمة (العمال يلبسون قفازات).
8. ✅ **Bypass Defence XOR** — إرسال secureId صامتاً عند الحاجة.

تفاصيل ADRs الكاملة: [PROJECT_PLAYBOOK.md § 15](./PROJECT_PLAYBOOK.md#-15-قرارات-معمارية-تم-تثبيتها-adr--architecture-decision-records).
