# 📘 PROJECT PLAYBOOK — العباسي تحصيل (Al-Abbasi Tahsil)

> **وثيقة المرجع المركزية — Single Source of Truth**
> أي وكيل / مطوّر / مراجع يقرأ هذا الملف فقط ليفهم: ماذا نبني، لماذا، كيف، أين وصلنا، وما المتبقي.
>
> - **Version:** 1.0.0
> - **Status:** 🟢 Active Development — Phase 0/1/2 in Progress
> - **Last Updated:** 2026-05-20
> - **Owner:** Al-Abbasi Commercial Electricity Generation Company (شركة العباسي لتوليد الكهرباء التجارية)
> - **Repo:** https://github.com/moain2026/app1

---

## 🎯 1. هوية المشروع (Project Identity)

| Field | Value |
|---|---|
| **App Display Name (AR)** | العباسي تحصيل |
| **App Display Name (EN)** | Al-Abbasi Tahsil |
| **Android Package Name** | `com.alabbasi.tahseel` |
| **Brand Owner** | شركة العباسي لتوليد الكهرباء التجارية |
| **Brand Logo** | درع العامل بألوان الأصفر/الأزرق (`assets/logo/abbasi_logo.png`) |
| **Brand Colors** | Yellow `#F4C20D` + Navy Blue `#1B2A4E` (مشتقة من الشعار) |
| **Primary Accent (UI)** | Red `#E5232A` (من لغة تصميم جيب — للأزرار الفعّالة فقط) |
| **Language** | العربية فقط — RTL 100% |
| **Platform** | Android فقط (minSdk 24 / Android 7.0+) |
| **Screen Range** | 5" — 6.5" |
| **Type** | Field Data Collection — Offline-First |

> ⚠️ **ملاحظة هوية مهمّة:**
> - استعرنا **لغة التصميم (UI/UX style)** من تطبيق "محفظة جيب" فقط — كجماليات بصرية (Bottom Sheets، Cards، Pills، Notched Tab Bar).
> - **لكن الهوية الكاملة (الاسم، الشعار، الألوان الأساسية) هي للعباسي حصراً.**
> - لا يُذكر اسم "جيب" أو شعارها في أي مكان داخل التطبيق.

---

## 🧭 2. الهدف العام (Vision)

> بناء **خَلَف عصري وآمن وسريع** لتطبيق `ElectricCollector28` القديم (الذي بُني عام 2020 بـ Java + Retrofit + SQLite بدائي)، مع:
>
> 1. **الحفاظ على المنطق التجاري وحساباته كما هي 1:1** — التطبيق الجديد يُنتج نفس الأرقام والنتائج تماماً.
> 2. **الحفاظ على أسماء حقول الـ Backend الأصلية** (`noadad`, `ks`, `kh`, `asts`, `cas`, `nomstlm`, `notblh`, `nog`, `ind`) — لضمان مزامنة شفافة مع السيرفر القديم بدون أي تغيير على الباك إند.
> 3. **تحسين تجربة المستخدم فقط** — واجهات نظيفة، خطوات أقل، شاشات أقل تعقيداً، طباعة احترافية، عمل بدون انترنت.
> 4. **حل عيوب التطبيق القديم:**
>    - ❌ كلمة سر مكتوبة بصيغة نصّية (plain text) في `SharedPreferences("prefs")` → ✅ `react-native-keychain` مع تشفير قائم على نظام التشغيل.
>    - ❌ خوارزمية ترخيص XOR ضعيفة (Defence.java) → ✅ تجاوزها محلياً + إرسال `secureId` صامتاً.
>    - ❌ Bug في `CustomAuthenticator.java` يضيف `"a"` (HtmlTags.A من iText) لنهاية الـ refresh-token → ✅ Interceptor نظيف.
>    - ❌ PIN ثابت `"0000"` للإعدادات → ✅ PIN مشفّر يضبطه المسؤول ويمكن تغييره.
>    - ❌ `usesCleartextTraffic="true"` + HTTP فقط → ✅ دعم HTTPS اختياري + Network Security Config.
>    - ❌ ListView مع SQLite Cursor بطيء على 2000 قراءة → ✅ FlashList + WatermelonDB (60fps دائماً).
>    - ❌ AsyncHttpClient (loopj — مهجور منذ 2017) → ✅ Axios + Interceptors + Retry حديثة.
>    - ❌ لا يوجد Sync Queue → فقدان بيانات عند فقد الاتصال → ✅ WatermelonDB كـ Source of Truth + Sync Engine مع Exponential Backoff.

---

## 🚫 3. خارج النطاق (Non-Goals)

> هذه نقاط **لن** ينفذها التطبيق الجديد، لكي يبقى التركيز:

1. ❌ **لا iOS** — Android فقط.
2. ❌ **لا تغيير على الـ Backend** — نتعامل معه كما هو (Black Box).
3. ❌ **لا دعم متعدد اللغات** — العربية فقط.
4. ❌ **لا بصمة (Biometric)** — العمال يلبسون قفازات / أيديهم متسخة.
5. ❌ **لا دعم Tablets الكبيرة (>7")** — الميدان فقط.
6. ❌ **لا إعادة تصميم منطق الأعمال** — نسخ حرفي مع تحسين UI فقط.
7. ❌ **لا تغيير لأسماء حقول JSON** — `noadad` يبقى `noadad` في API و DB Schema (تتم الترجمة في طبقة العرض فقط).

---

## 🧱 4. المعمارية (Architecture)

### 4.1 نظرة عامة

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (Screens)                       │
│      React Native + TS Strict + Reanimated 3 + FlashList    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  State Layer (Zustand)                      │
│   authStore │ networkStore │ syncStore │ printerStore │ ui  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             Domain / Repository Layer                       │
│   ReadingRepo │ BondRepo │ AccountRepo │ ReportRepo         │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────────┐
│  WatermelonDB        │         │   Axios + DTO Mapper     │
│  (Source of Truth)   │◄───────►│   (Legacy JSON ↔ Clean)  │
│  SQLite + Reactive   │         │   Bearer + Refresh       │
└──────────────────────┘         └─────────────┬────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────┐         ┌──────────────────────────┐
│   Sync Engine        │◄────────│   Legacy Backend         │
│   Queue + Backoff    │ network │   http://IP:3000/electric│
│   Background Fetch   │         │   31 endpoints           │
└──────────────────────┘         └──────────────────────────┘
```

### 4.2 المبدأ الجوهري — Offline-First

> **WatermelonDB هي مصدر الحقيقة الوحيد على الجهاز.**
> الـ UI يقرأ من WatermelonDB حصراً (عبر `observe`). كل تعديل يُحفظ محلياً أولاً، ثم يدخل `sync_queue`، ثم يُرسل للسيرفر عندما يتوفر اتصال. لا تنتظر الواجهة استجابة الشبكة أبداً.

**فوائد:**
- الجابي يعمل في القرى البعيدة بدون انترنت لساعات.
- لا فقدان للقراءات بسبب انقطاع الشبكة.
- التطبيق يستجيب فوراً (No spinners on data entry).
- المزامنة تتم تلقائياً في الخلفية مع إعادة محاولة ذكية.

### 4.3 طبقة الـ DTO Mapper (مهمّة جداً)

| Database Field (Original) | UI Field (Translated) | Type | Notes |
|---|---|---|---|
| `noadad` | `meterNumber` | string | رقم العداد — يحافظ على الاسم في DB و API |
| `ks` | `previousReading` | number | القراءة السابقة |
| `kh` | `currentReading` | number | القراءة الحالية |
| `asts` | `expectedConsumption` | number | الاستهلاك المتوقع |
| `cas` | `postingStatus` | number | حالة الترحيل (0 = لم تُرحّل، 1+ = مرحّلة) |
| `nomstlm` | `receiverArea` (المستلم/المنطقة) | number | رقم المنطقة |
| `notblh` | `bookNumber` (التابلة/الدفتر) | number | رقم الدفتر |
| `nog` | `groupNumber` (المجموعة) | number | رقم المجموعة |
| `ind` | `meterType` (النوع) | number | نوع العداد |
| `name` | `customerName` | string | اسم المشترك |
| `namet` | `customerAlias` | string | اسم بديل |
| `num` | `sequenceNumber` | number | الرقم التسلسلي |

> **القاعدة:** Schema الـ DB و JSON الـ API → بالأسماء **الأصلية**. الـ UI و الـ State → بالأسماء **الواضحة المترجمة**. التحويل في `services/api/mappers/*.ts`.

---

## 🔧 5. ستاك التقنية (Tech Stack)

| Category | Choice | Reason |
|---|---|---|
| **Framework** | React Native CLI (Bare) **0.74+** | تحكّم كامل + Native Modules للطابعة |
| **Language** | TypeScript Strict Mode | Type Safety كاملة |
| **Local DB** | WatermelonDB | Reactive + Performance + Sync-ready |
| **State** | Zustand | بسيط + Performant + Devtools |
| **Network** | Axios + Interceptors | Refresh-token + Retry |
| **Secure Storage** | react-native-keychain | Tokens + PIN |
| **Fast Storage** | react-native-mmkv | UI prefs (theme, lastSync) |
| **Lists** | @shopify/flash-list | 60fps على 2000+ عنصر |
| **Animations** | Reanimated 3 + Gesture Handler | Bottom Sheets + Transitions |
| **Navigation** | @react-navigation/native v6 | Tabs + Stack + Drawer |
| **Bottom Sheet** | @gorhom/bottom-sheet | Sheet متطوّر |
| **Forms** | react-hook-form + zod | Validation + Performance |
| **Camera/Barcode** | react-native-vision-camera + vision-camera-code-scanner | Code 128 / EAN |
| **Background Sync** | react-native-background-fetch | مزامنة دورية كل 15 دقيقة |
| **Printer** | Native Bridge (Java) ↔ BIXOLON SPP-R310 SDK | Mock أولاً ثم BIXOLON Real |
| **Icons** | react-native-vector-icons (MaterialCommunityIcons) | متوافق RTL |
| **i18n** | i18next + react-i18next | بنية احترافية للعربية فقط حالياً |
| **Crash/Logs** | Sentry (Optional Phase 8) | تتبع أخطاء |
| **Fonts** | Tajawal (Google Fonts) | عربي + نظيف + Multi-weight |
| **Testing** | Jest + React Native Testing Library + Detox | Unit + E2E |
| **Lint/Format** | ESLint + Prettier + Husky + lint-staged | Pre-commit hooks |

---

## 🎨 6. نظام التصميم (Design System) — Flat Dark + Brand-Tinted

### 6.1 الفلسفة

- **Flat** — بدون gradients أو 3D shadows ثقيلة.
- **Dark First** — الخلفية `#121212`, السطوح `#222222` — كما في تطبيق جيب.
- **Light Mode متاح** — يحترم نفس الإيقاع.
- **Accent محدود** — `#E5232A` للأزرار الفعّالة (CTAs) فقط، باقي الواجهة محايد.
- **Brand Logo** — يظهر في Splash و Login و Drawer Header (بألوان الشعار الأصلية: Yellow/Navy).
- **Border Radius** — 16px للبطاقات، 24px للـ Bottom Sheets، 12px للأزرار.
- **Typography** — Tajawal (8 أوزان متاحة).

### 6.2 الـ Tokens

(انظر الملفات الفعلية في `src/design-system/tokens/*.ts`)

- **colors.ts** — palette كامل (brand + UI + semantic).
- **typography.ts** — أحجام/أوزان Tajawal.
- **spacing.ts** — مقياس 4/8/12/16/24/32/48.
- **radii.ts** — 4/8/12/16/24/9999.
- **shadows.ts** — خفيفة جداً (للـ Light Mode فقط).
- **motion.ts** — Easing + Durations لـ Reanimated.

### 6.3 لغة الواجهة المعتمدة

- **Bottom Tabs:** الملف | التقارير | السندات | الرئيسية
- **Center FAB:** "إدخال قراءة" (Notched).
- **Bottom Sheet للقراءة:** كقالب "بيانات الحركة" من جيب — يحتوي: رقم العداد، اسم المشترك، السابقة، الحالية، الاستهلاك، زرّا "طباعة" و "مشاركة".

---

## 🗄️ 7. مخطط قاعدة البيانات (WatermelonDB Schema)

> **مبدأ:** أسماء الأعمدة في `schema.ts` تستخدم `snake_case` المطابقة لأسماء JSON من الـ Backend الأصلي (`noadad`, `ks`, `kh`...).
> الـ Properties في الـ Models (`Reading.ts`) تستخدم نفس الأسماء أيضاً مع `@field('noadad')` لربط واضح.
> الترجمة إلى أسماء UI نظيفة تحدث في طبقة الـ Selector / Hook فقط.

### الجداول (12 جدول):

1. **readings** — أساس التطبيق. 12 حقل + sync metadata.
2. **bonds** — السندات (مدفوع، مستحق).
3. **bond_payments** — تفاصيل دفعات السندات.
4. **accounts** — قائمة الحسابات.
5. **places** — المناطق.
6. **t_groups** — المجموعات.
7. **tblh** — التابلات/الدفاتر.
8. **currencies** — العملات.
9. **users** — المستخدمين + الصلاحيات (DE/ED/REP/S_K/S_S/SYS/NOA/NOU).
10. **company_info** — بيانات الشركة (للطباعة).
11. **sync_queue** — قائمة انتظار المزامنة.
12. **sync_logs** — سجل عمليات المزامنة.

---

## 🌐 8. طبقة الشبكة (Network Layer)

### 8.1 الـ Endpoints (31 endpoint من ApiService.java)

```
POST   /electric/login                    → AuthResponse
POST   /electric/UserAuth                 → AuthResponse (legacy)
POST   /electric/register                 → RegistrationResponse
POST   /electric/refresh                  → {access_token, refresh_token}
GET    /electric/GetCompanyData           → CompanyInfo
GET    /electric/GetListReadingCounter    → ItemReading[]
POST   /electric/SaveReading              → {success, num}
POST   /electric/UpdateReading            → {success}
DELETE /electric/DeleteReading            → {success}
GET    /electric/GetListAccounts          → Account[]
GET    /electric/GetListUsers             → User[]
GET    /electric/GetListPlaces            → Place[]
GET    /electric/GetListGroup             → TGroup[]
GET    /electric/GetListBonds             → Bond[]
GET    /electric/GetListBondsPayment      → BondPayment[]
GET    /electric/GetListCurrency          → Currency[]
GET    /electric/GetAccountBalance        → Balance
GET    /electric/GetRepBalanceHeader      → ReportRow[]
GET    /electric/GetRepBalanceDetails     → ReportRow[]
GET    /electric/GetRepBondsHeader        → ReportRow[]
GET    /electric/GetRepBoxMove            → ReportRow[]
GET    /electric/GetRepBoxMoveDetails     → ReportRow[]
GET    /electric/GetRepExpenses           → ReportRow[]
GET    /electric/GetRepReadingHeader      → ReportRow[]
GET    /electric/report1                  → ReportRow[]
... (نقطة نقطة في endpoints.ts)
```

### 8.2 الـ Interceptors

1. **AuthInterceptor (Request)** — يُرفق `Authorization: Bearer <accessToken>` من Keychain.
2. **RefreshInterceptor (Response)** — على 401: يستدعي `/refresh` ويعيد المحاولة. **مهم:** لا نضيف `"a"` في النهاية (إصلاح Bug القديم).
3. **NetworkInterceptor** — يفحص الـ connectivity، إذا offline → يضع الطلب في `sync_queue`.
4. **ErrorInterceptor** — يُحوّل الأخطاء إلى Exceptions موحّدة (`AppError` type).
5. **RetryInterceptor** — Exponential Backoff (1s, 2s, 4s, 8s, max 5 retries).

---

## 🔁 9. محرّك المزامنة (Sync Engine)

### المبدأ:
1. أي عملية كتابة (Create/Update/Delete) → تُحفظ في WatermelonDB أولاً + تُضاف إلى `sync_queue` بحالة `pending`.
2. عند توفّر اتصال → `SyncWorker` يأخذ العناصر بترتيب الأولوية (`priority DESC, created_at ASC`).
3. ينفّذ الطلب → عند النجاح يحدّث الـ row بـ `remote_id` و `sync_status='synced'` ويحذف من الـ queue.
4. عند الفشل → يزيد `attempts` ويعيد الجدولة بـ Backoff.
5. عند تجاوز `attempts > 5` → ينقل العنصر إلى حالة `failed` ويعرضه في Sync Dashboard للمراجعة اليدوية.

### مفاتيح Idempotency:
- كل قراءة محلية تحصل على `local_uuid` (UUID v4) → يُرسل مع الطلب لمنع التكرار عند إعادة المحاولة.

---

## 🖨️ 10. الطابعة (Printer Integration)

### 10.1 الموديل الفعلي:
**BIXOLON SPP-R310** — طابعة Bluetooth حرارية 3 إنش.

> ⚠️ تم تغيير الموديل من Datecs DPP-250 (في التطبيق القديم) إلى **BIXOLON SPP-R310** بناءً على طلب المستخدم.

### 10.2 الاستراتيجية على مرحلتين:

**المرحلة 1 (الآن — للتطوير):** Mock Printer Interface
- `IPrinter` interface مشترك.
- `MockPrinter` — يطبع لـ console.log + يحفظ payload في ملف لمعاينة التنسيق.

**المرحلة 2 (لاحقاً — للإنتاج):** BIXOLON Native Bridge
- ربط BIXOLON Android SDK عبر `NativeModule` بـ Java.
- يُكشف للـ JS كـ `BixolonPrinter` يطبّق نفس `IPrinter` interface.
- الـ UI لا يعلم بالفرق — يستدعي `IPrinter.print(payload)`.

### 10.3 قالب الإيصال:
مطابق لتصميم "بيانات الحركة" في جيب — يحوي: شعار العباسي + اسم الشركة + رقم العداد + اسم المشترك + السابقة + الحالية + الاستهلاك + التاريخ + رقم السند + توقيع المستلم.

---

## 🔐 11. الأمان (Security)

| Concern | Solution |
|---|---|
| Token Storage | `react-native-keychain` (AES-GCM + Android KeyStore) |
| Settings PIN | مشفّر بـ bcrypt-rn، يضبطه المسؤول، قابل للتغيير. يُحذف `0000` نهائياً. |
| Defence XOR | يُتجاوز محلياً. عند الحاجة يُولَّد `secureId` صامت يُرسل مع الـ login. |
| HTTPS | مفعّل عند توفر السيرفر — مع Network Security Config يسمح بـ HTTP فقط لـ IPs محلية محددة. |
| Permissions | تُطلب عند الحاجة فقط (Camera, Bluetooth, Location عند البدء). |
| Logs | لا تُسجّل tokens / passwords في أي logs. |
| Code Obfuscation | ProGuard + R8 في release build. |

---

## ⚡ 12. قواعد الأداء والجودة (Performance & Quality Rules)

> **القواعد الذهبية — أي PR يُخالفها يُرفض.**

### 12.1 قواعد TypeScript:
1. ✅ **Strict Mode** مُفعّل (`strict: true` + `noImplicitAny` + `strictNullChecks`).
2. ✅ **لا `any`** — استخدم `unknown` ثم narrow.
3. ✅ **كل function تُصدّر `Props` و `Return` types صريحة**.
4. ✅ **Discriminated Unions** لحالات الـ Reducer.
5. ✅ **Zod schemas** للتحقق من بيانات الشبكة قبل الكتابة في DB.

### 12.2 قواعد React Native:
1. ✅ **استخدم FlashList فقط** للقوائم الطويلة (>20 عنصر) — لا FlatList.
2. ✅ **`memo` + `useCallback` + `useMemo`** للمكوّنات الثقيلة.
3. ✅ **InteractionManager.runAfterInteractions** لتأجيل العمليات الثقيلة بعد الانتقال.
4. ✅ **Reanimated UI Thread** لكل الـ Animations — لا تستخدم `Animated` API القديم.
5. ✅ **لا `setInterval` في الـ Foreground** — استخدم `requestAnimationFrame` أو `react-native-background-fetch`.
6. ✅ **استخدم `observe()` من WatermelonDB** للقوائم — لا `fetch()` يدوي.
7. ✅ **Image caching** — `react-native-fast-image` لشعارات الـ Bonds (لاحقاً).

### 12.3 قواعد الأرشيتكتشر:
1. ✅ **Feature-First** — كل ميزة مستقلة في `features/<feature>/`.
2. ✅ **No Cyclic Dependencies** — يُفحص بـ `madge`.
3. ✅ **Domain Models نقية** — لا تعتمد على React أو RN.
4. ✅ **Repository Pattern** — الـ UI يطلب من Repository فقط، لا يكلّم Axios أو WatermelonDB مباشرة.
5. ✅ **Single Responsibility** — كل ملف < 300 سطر (مع استثناءات مبرّرة).
6. ✅ **No Magic Numbers** — كل قيمة عددية في tokens أو constants.

### 12.4 قواعد التعليمات البرمجية:
1. ✅ **اسم الملف يدلّ على المحتوى** — `ReadingsList.tsx`, `useReadings.ts`.
2. ✅ **Export Default للمكوّنات، Named Export للـ Hooks/Utils**.
3. ✅ **JSDoc** للوظائف العامة في `services/` و `utils/`.
4. ✅ **TODO comments** يجب أن تحوي `TODO(name): description` أو يُرفض الـ commit.
5. ✅ **لا تعليقات بالعربية في الكود** — التعليقات تكون بالإنجليزية. النصوص المعروضة للمستخدم بالعربية في `i18n/ar.json`.

### 12.5 قواعد الـ Git:
1. ✅ **Conventional Commits:** `feat(readings): add barcode scanner`, `fix(sync): handle 401 in queue`.
2. ✅ **Branch naming:** `feature/<name>`, `fix/<name>`, `refactor/<name>`.
3. ✅ **PR Template** يحتوي: ماذا تغيّر، لماذا، كيف تختبر، Screenshots.
4. ✅ **Squash and Merge** فقط — لا merge commits.

---

## 📅 13. خطة التنفيذ — 30 يوم (Execution Plan)

### Phase 0 — Setup & Foundation (Days 1-2) ← الآن
- [x] إنشاء بنية المجلدات.
- [x] إنشاء PROJECT_PLAYBOOK.md (هذا الملف).
- [ ] إعداد package.json + tsconfig.json + babel.config.js + metro.config.js.
- [ ] إعداد ESLint + Prettier + Husky.
- [ ] تثبيت Tajawal font.
- [ ] إعداد react-native-config (env vars).
- [ ] Force RTL.

### Phase 1 — Design System (Days 3-4)
- [x] tokens (colors, typography, spacing, radii, shadows, motion).
- [x] themes (dark, light).
- [ ] core components (Button, Card, Input, BottomSheet, Toast, Pill, Avatar).

### Phase 2 — Database Layer (Days 5-6) ← الآن
- [x] schema.ts (preserve original field names).
- [x] adapter + index + migrations.
- [x] Models (12 models).
- [ ] Repositories (initial CRUD).

### Phase 3 — Network Layer (Days 7-9) ✅ COMPLETE
- [x] Storage: `react-native-keychain` (tokens/PIN) + `react-native-mmkv` (prefs).
- [x] Logger utility (redacts tokens/passwords automatically).
- [x] AppError taxonomy + `Result<T>` + Arabic user messages.
- [x] Zod schemas (auth + reading + lists + reports + common loose coercers).
- [x] DTO mappers (legacy `noadad/ks/kh/asts/cas` ↔ clean domain types).
- [x] Endpoints registry (`endpoints.ts`) — all 31 endpoints typed.
- [x] Axios instance (`httpClient.ts`) — lazy baseURL from MMKV.
- [x] Auth interceptor (Bearer header + `X-Skip-Auth` opt-out).
- [x] Refresh interceptor — **fixes the "+a" bug** from `CustomAuthenticator.java`, single-flight dedup, replays original request once.
- [x] Retry interceptor — exponential backoff with jitter; only retries unsafe methods when `X-Idempotent: 1`.
- [x] Error interceptor — converts every failure to typed `AppError`.
- [x] Typed API façade (`apiClient.ts`) — `api.call('saveReading', { body, idempotent: true })`.

### Phase 4 — Sync Engine (Days 10-12) ✅ COMPLETE
- [x] **SyncQueue manager** — enqueue/dedupe/claim/markDone/markPending/markFailed + prune + recoverStuck.
- [x] **SyncWorker مع exponential backoff** — 2s→4s→8s→…→5min cap + jitter, maxAttempts=6.
- [x] **Background fetch setup** — react-native-background-fetch, 15-min Android floor, pushOnly during wake.
- [x] **Idempotency keys + conflict resolution** — `entity_local_uuid` keys, LWW (collector wins) for readings/bonds.
- [x] **Push handlers** — readingPushHandler (Save/Update/Delete) + bondPushHandler + bondPaymentPushHandler.
- [x] **Pull handlers** — readings (LWW-aware) + 8 reference entities (accounts, places, groups/tblh, currencies, users, company, bonds, bond_payments).
- [x] **Error classifier** — transient (network/5xx/429/401) vs. permanent (4xx/Zod/business) routing.
- [x] **Connectivity monitor** — NetInfo wrapper, auto-pushOnly on reconnect.
- [x] **SyncCoordinator** — orchestrates push→pull, online+auth preconditions, sequential pulls, per-entity error isolation.
- [x] **Sync events bus** — pub/sub for Dashboard (Phase 11) with ring-buffer history.
- [x] **Enqueue helpers** — feature-layer entry points: `enqueueReadingSave`, `enqueueBondSave`, `enqueueBondPaymentSave`, `reenqueueAllDirtyReadings`.
- [x] **Entity sync status** — bidirectional state propagation (queue ↔ entity row's `sync_status`).
- [x] **sync_logs audit trail** — append-only persisted history for Dashboard.

### Phase 5 — Auth Flow (Days 13-14)
- [ ] Splash screen مع شعار العباسي.
- [ ] Login screen.
- [ ] Server Settings screen (مكان "go_to_register" القديم).
- [ ] Silent re-auth on app launch.
- [ ] Admin PIN setup + change PIN screens.

### Phase 6 — Main Shell + Navigation (Days 15-16)
- [ ] Root navigation (Auth Stack ↔ Main Stack).
- [ ] Bottom Tabs (4 tabs + Notched FAB).
- [ ] Drawer.
- [ ] Header مع شعار العباسي.

### Phase 7 — Readings Feature (Days 17-20)
- [ ] List screen مع FlashList + filters (مستلم/تابلة/مجموعة/مرحّلة/غير مرحّلة).
- [ ] Entry Bottom Sheet (متطابق مع "بيانات الحركة" في جيب).
- [ ] Barcode scanner (vision-camera).
- [ ] Validation (kh > ks, cas != 0 → block edit, sk > asts → red).
- [ ] Meter Detail screen.
- [ ] Print & Share buttons.

### Phase 8 — Bonds Feature (Days 21-22)
- [ ] List screen.
- [ ] Entry sheet.
- [ ] Payment sheet.
- [ ] Receipt template.

### Phase 9 — Reports Feature (Days 23-25)
- [ ] 8 report screens (Balance, Bonds, BoxMove, Expenses, ReadingHeader, ...).
- [ ] DateRangePicker.
- [ ] Filters + Export to PDF.

### Phase 10 — Printer Integration (Days 26-27)
- [ ] Mock printer interface.
- [ ] Receipt template engine.
- [ ] BIXOLON SPP-R310 native bridge skeleton (Java).

### Phase 11 — Sync Dashboard (Days 28)
- [ ] شاشة كاملة تعرض حالة كل entity على حدة.
- [ ] أزرار تحديث فردي + "مزامنة الكل".
- [ ] عرض failed items + retry يدوي.

### Phase 12 — Profile + Settings + Theme Picker (Day 29)
- [ ] شاشة الملف.
- [ ] Theme picker (نهار / ليل / أوتوماتيك).
- [ ] Change password / PIN.

### Phase 13 — QA + Release (Day 30)
- [ ] Detox E2E tests for critical flows.
- [ ] ProGuard + R8.
- [ ] Release APK + Play Store metadata.

---

## 📊 14. الحالة الحالية (Current Progress) — Live

| Phase | Status | Notes |
|---|---|---|
| Analysis | ✅ Complete | تم استخراج 31 endpoint + كل قواعد العمل من التطبيق القديم. |
| Validation | ✅ Complete | مطابقة 100% مع تقرير المستخدم الخارجي. |
| UI Topology | ✅ Complete | 38 شاشة في 7 مجموعات. |
| Architecture Decisions (Q1-Q14) | ✅ Complete | كل الإجابات مُعتمدة. |
| **Phase 0 — Setup** | 🟡 In Progress | بنية المجلدات + Playbook ✅. باقي package.json + configs. |
| **Phase 1 — Design System Tokens** | 🟡 In Progress | الـ tokens ✅ — يبقى components. |
| **Phase 2 — Database Schema + Models** | 🟡 In Progress | Schema + Models ✅ — يبقى Repositories. |
| **Phase 3 — Network Layer** | ✅ Complete | Storage + Logger + Errors + Zod + Mappers + Endpoints + 4 Interceptors + Typed Client. The legacy `+a` refresh-token bug is fixed. |
| **Phase 4 — Sync Engine** | ✅ Complete | Queue manager + Worker with exponential backoff + Push/Pull handlers + LWW conflict resolution + NetInfo + Background fetch + Events bus + Sync logs. 22 ملف، 3466 سطر. |
| Phase 5 — Auth Flow | ⏳ Next | |
| Phases 5-13 | ⏳ Pending | |

---

## 🧪 15. قرارات معمارية تم تثبيتها (ADR — Architecture Decision Records)

### ADR-001: WatermelonDB كـ Source of Truth
- **القرار:** كل قراءة UI تأتي من WatermelonDB عبر `observe`.
- **البديل المرفوض:** Zustand كـ Source of Truth (لا يعمل offline-first جيداً).

### ADR-002: الحفاظ على أسماء حقول Backend الأصلية
- **القرار:** `noadad`, `ks`, `kh`, `asts`, `cas` تبقى كما هي في DB و JSON.
- **السبب:** سيرفر قديم لا يمكن تعديله.
- **الترجمة:** في طبقة الـ Selector فقط (UI Layer).

### ADR-003: Bare React Native (لا Expo)
- **السبب:** نحتاج Native Module للطابعة BIXOLON.

### ADR-004: Bypass Defence XOR
- **السبب:** الخوارزمية ضعيفة وغير مفيدة. السيرفر يحتاج فقط `secureId` نولّده ونرسله صامتاً.

### ADR-005: BIXOLON SPP-R310 بدلاً من Datecs DPP-250
- **السبب:** الجهاز الفعلي عند المستخدم.
- **Mock first** ثم بناء الـ Native Bridge.

### ADR-006: react-native-vision-camera بدلاً من ZXing
- **السبب:** أداء أعلى، صيانة نشطة، دعم Code 128/EAN.

### ADR-007: لا بصمة (No Biometric)
- **السبب:** العمال يلبسون قفازات.
- **البديل:** Silent re-auth عبر refresh-token + Keychain.

### ADR-008: Bottom Tabs (4) + Notched FAB في المنتصف
- **السبب:** "إدخال قراءة" هو الفعل الأكثر تكراراً (>50 مرة في اليوم).

### ADR-009: لا نُكرّر خلل "+a" في refresh-token
- **القرار:** في `refresh.interceptor.ts` نرسل `refresh_token` كما هو **بدون** إضافة `"a"` في النهاية.
- **خلفية:** `CustomAuthenticator.java` السطر 41 كان يستخدم `HtmlTags.A` (تساوي `"a"`) من مكتبة iText بطريق الخطأ:
  ```java
  service.refresh(token.getRefreshToken() + HtmlTags.A)
  ```
- **آلية الأمان:** الـ Interceptor يحوي ثابتاً `BUG_COMPAT_APPEND_A = false`. إذا تأكد فريق التشغيل أن سيرفر إنتاج معيّن لا يزال يتطلب اللاحقة، يُحوَّل الثابت إلى `true` بدون تغيير معماري آخر.
- **آلية أمان إضافية:** Single-flight dedup — استدعاءات 401 المتزامنة تنتظر نفس `refreshInFlight` Promise.

### ADR-010: Zod كحارس بوابة (Validation Gate)
- **القرار:** **كل** استجابة من السيرفر القديم تمر عبر Zod schema قبل الوصول إلى WatermelonDB أو الـ UI.
- **السبب:** الباك إند القديم يستخدم `MoshiConverterFactory.create().asLenient()` ويعيد أنواعاً مرنة (`"150"` بدل `150`، سلاسل فارغة بدل nulls). نحن نستخدم `zNumberLoose`/`zIntLoose`/`zBoolLoose`/`zDateLoose` لتنقية البيانات.
- **المكسب:** صفر بيانات قذرة في الـ DB. أعطاب schema تُلتقط فوراً مع `AppError(VALIDATION_SERVER_RESPONSE)`.

### ADR-011: Keychain للأسرار + MMKV للإعدادات
- **القرار:** فصل صارم بين تخزين الأسرار (tokens، PIN hash) في `react-native-keychain` (AES-GCM + Android KeyStore) وبين الإعدادات الخفيفة في `react-native-mmkv` (memory-mapped، sync read).
- **سبب MMKV للإعدادات:** القراءة المتزامنة (sync) أساسية لتجنب FOUC في ThemeProvider.
- **سبب Keychain للأسرار:** بديل أمن عن `SharedPreferences("prefs")` التي كانت تحفظ كلمة السر و التوكنات نصاً مكشوفاً.

### ADR-012: Logger مع Auto-Redaction
- **القرار:** لا يوجد `console.log` مباشر في الكود. كل ما يُسجَّل يمر عبر `utils/logger.ts` الذي يكتشف المفاتيح الحساسة (`token`, `password`, `secret`, `authorization`, `pin`, `secureId`) ويستبدل قيمها بـ `<N chars: abcd…>`.
- **النتيجة:** آمن للتشغيل في الإنتاج، لا تسريب صدفي لتوكن في الـ logs أو في Sentry لاحقاً.

### ADR-013: Conflict Resolution — Local Wins (LWW with collector authority)
- **القرار:** عند سحب البيانات من السيرفر، **لا يتم استبدال** أي صف محلي حالته في `{ dirty, syncing, failed }`. الجابي هو "صاحب الحقيقة" لأي صف لمسه منذ آخر مزامنة ناجحة. السيرفر يكتب فقط على صفوف `pristine` أو `synced`.
- **السياق:** الجابي يعمل في الميدان لساعات بدون اتصال؛ بياناته المحلية هي العمل الفعلي ولا يمكن خسارتها بسبب سحب عَرَضي.
- **النتيجة:** عدم فقدان قراءات أو سندات بسبب pull غير متزامن. صفر مفاجآت للمستخدم.

### ADR-014: Push قبل Pull (Push-First Ordering)
- **القرار:** `syncCoordinator.syncNow()` ينفّذ `drainQueueOnce()` **قبل** أي `pullHandler.run()`.
- **السبب:** لو سحبنا أولاً، فقاعدة LWW ستخطّي الصفوف الـ dirty ولن يحدث تحديث، فيظهر للمستخدم بيانات قديمة على شاشة. بالـ push أولاً، نحوّل dirty→synced، ثم نسحب بنظافة.
- **النتيجة:** لوحة المزامنة (Phase 11) ستعكس الحالة الصحيحة دائماً.

### ADR-015: Background Push بدون Pull
- **القرار:** عند استيقاظ التطبيق من `react-native-background-fetch`، نُنفّذ `pushOnly` فقط (لا pull).
- **السبب 1:** نافذة الـ OS = 30 ثانية. سحب 9 endpoints قد يتجاوزها → throttling.
- **السبب 2:** السحب يستهلك بيانات الجوال للجابي (الذي يدفع من جيبه). نُؤجّل السحب للـ foreground حيث يكون التطبيق مفتوح بقرار المستخدم.
- **النتيجة:** المزامنة الخلفية = خفيفة + سريعة + موفّرة لتكاليف الـ data للجابي.

### ADR-016: Dedup داخل طابور المزامنة
- **القرار:** عند `enqueue` لصف موجود فعلاً بحالة `pending` أو `processing` لنفس `(entityType + entityLocalUuid)`، نُحدِّث الـ payload الحالي **بدلاً من** إنشاء صف جديد. الصفوف المكرَّرة الأخرى تُحذف داخل نفس الترانزاكشن.
- **السبب:** الجابي يضغط Save 5 مرات سريعاً قبل المزامنة → ينتج 5 صفوف queue → 5 استدعاءات للسيرفر → ازدحام. الـ dedup يضمن استدعاء واحد بالـ snapshot الأخير.
- **النتيجة:** الطابور يبقى صغيراً، السيرفر يستلم آخر نسخة فقط، وعداد المحاولات (`attempts`) يستمر من حيث توقف (لا reset).

---

## 🔗 16. ملفات مرجعية مهمة (Reference Files)

### من التطبيق القديم (للقراءة فقط — Read-Only):
```
/home/user/webapp/ElectricCollector_Full_Analysis/
├── README.md
├── reports/Final_Analysis_Report.md
├── resources/AndroidManifest.xml
└── source_code/com/yd/electricecollector/
    ├── Defence.java                              ← XOR (يُتجاوز)
    ├── TokenManager.java                         ← يُستبدل بـ Keychain
    ├── SplashScreenActivity.java                 ← مرجع للـ auto-login
    ├── LoginActivity.java                        ← مرجع للـ login flow
    ├── MainActivity.java                         ← مرجع للـ navigation
    ├── network/
    │   ├── ApiService.java                       ← 31 endpoint
    │   ├── RetrofitBuilder.java                  ← مرجع للـ baseUrl
    │   └── CustomAuthenticator.java              ← Bug "+a" يُصلَح
    ├── entities/
    │   ├── ItemReading.java                      ← 12 حقل ★★★
    │   ├── Users.java                            ← Permissions
    │   └── AuthData.java
    ├── model/ReadingRepository.java
    ├── ui/
    │   ├── ListReadingActivity.java              ← قواعد العمل ★★★
    │   └── ViewSettingActivity.java              ← PIN "0000"
    └── printer/
        ├── driver/DatecsDpp250Driver.java        ← OBSOLETE
        ├── driver/PrinterDriverFactory.java      ← Pattern reusable
        └── bluetooth/ScanActivity.java
```

### قواعد العمل الحرجة (من ListReadingActivity.java):
1. **Validation 1:** `if (kh < ks) → reject "القراءة الحالية اصغر من السابقة"`.
2. **Validation 2:** `if (cas != 0) → block edit "لا يمكن تعديل القراءة المرحلة"`.
3. **Visual rule:** `if (sk > asts) → highlight red #D81B60` (استهلاك أعلى من المتوقع).

> هذه القواعد **يجب نسخها حرفياً 1:1** في `features/readings/domain/validators.ts`.

---

## 📝 17. سجل التغييرات (Changelog)

### v1.0.0 — 2026-05-20
- ✅ تأسيس المشروع: بنية المجلدات + Playbook.
- ✅ Design System Tokens (colors, typography, spacing, radii, shadows, motion).
- ✅ Themes (dark + light).
- ✅ WatermelonDB Schema + 12 Models.
- ✅ تنزيل شعار العباسي إلى `assets/logo/abbasi_logo.png`.

### v1.1.0 — 2026-05-20 — Phase 3 (Network Layer)
- ✅ **Storage Layer:**
  - `services/storage/secureStorage.ts` — Keychain (AES-GCM) لتوكنات + PIN hash + last username.
  - `services/storage/prefs.ts` — MMKV لـ baseUrl/port/HostingIP/theme/sync timestamps.
- ✅ **Utilities:**
  - `utils/logger.ts` — scoped logger + auto-redaction للأسرار (tokens, passwords, PIN).
  - `utils/errors.ts` — `AppError` taxonomy (29 رمز خطأ مع رسائل عربية) + `Result<T>` + `runSafe()`.
- ✅ **Validation (Zod):**
  - `services/api/schemas/common.ts` — coercers مرنة (zIntLoose، zBoolLoose، zDateLoose...).
  - `services/api/schemas/auth.ts` — login/refresh/register/userAuth requests + AccessTokenResponse.
  - `services/api/schemas/reading.ts` — ItemReadingDto (12 حقل) + list/mutation responses.
  - `services/api/schemas/lists.ts` — Account/Place/TGroup/Tblh/User/Currency/Bond/BondPayment/CompanyInfo.
  - `services/api/schemas/reports.ts` — صف تقرير عام (key-value).
- ✅ **DTO Mappers:**
  - `services/api/mappers/auth.mapper.ts` — `tokensFromResponse`, `userFromLoginResponse`.
  - `services/api/mappers/reading.mapper.ts` — `readingFromDto`, `readingToDto`, `readingDtoToDbRow`, `parseReadingList`.
  - `services/api/mappers/lists.mapper.ts` — 8 parser للقوائم المرجعية.
  - `services/api/mappers/reports.mapper.ts` — `parseReportList`, `parseAccountBalance`.
- ✅ **Network Layer:**
  - `services/api/endpoints.ts` — 31 endpoint مسجّلة بأنواع صارمة.
  - `services/api/httpClient.ts` — Axios instance مع lazy baseURL من MMKV.
  - `services/api/interceptors/auth.interceptor.ts` — Bearer header + skip flag.
  - `services/api/interceptors/refresh.interceptor.ts` — **يُصلح خلل "+a"** + single-flight + replay.
  - `services/api/interceptors/retry.interceptor.ts` — exponential backoff with jitter, idempotency-aware.
  - `services/api/interceptors/error.interceptor.ts` — كل فشل → `AppError`.
  - `services/api/apiClient.ts` — façade مكتوبة بأنواع: `api.call('saveReading', { body, idempotent: true })`.
- ✅ **ADRs الجديدة:** 009 (no +a bug), 010 (Zod gate), 011 (Keychain/MMKV split), 012 (auto-redacting logger).
- ✅ **Total Phase 3:** 23 ملف جديد، ~1700 سطر TS صارم.

### v1.2.0 — 2026-05-20 — Phase 4 (Sync Engine)
- ✅ **Queue Management:**
  - `services/sync/syncQueue.ts` — enqueue (مع dedup ذكي عبر `entity_local_uuid`)، claimBatch (transactional)، markDone/Pending/Failed، pruneDoneOlderThan، recoverStuckProcessing، getStats.
  - `services/sync/entitySyncStatus.ts` — تنقّل حالة الصفوف الهدف (`Reading`/`Bond`/`BondPayment.sync_status`) بشكل متزامن مع الطابور.
- ✅ **Worker:**
  - `services/sync/syncWorker.ts` — `drainQueueOnce()` مع process-wide mutex، يعالج الدُفعات بشكل تسلسلي، يحوّل النتائج إلى DB transitions.
  - `services/sync/backoff.ts` — Exponential delay مع jitter: `delay = min(2^attempt × 2s, 5min) + random(0..1s)`.
  - `services/sync/errorClassifier.ts` — يُصنّف الفشل إلى transient (network/5xx/429/401) أو permanent (4xx/Zod/business).
- ✅ **Push Handlers (Outbound):**
  - `services/sync/push/readingPushHandler.ts` — يستدعي `SaveReading`/`UpdateReading`/`DeleteReading` مع `idempotent: true` ويُمرّر `local_uuid` كمفتاح idempotency.
  - `services/sync/push/bondPushHandler.ts` — معالج محايد للسندات (السيرفر القديم لا يدعمها بعد؛ يُعطي permanent failure حتى يضيفها فريق الباك إند).
  - `services/sync/push/index.ts` — registry يربط `SyncEntityType → PushHandler`.
- ✅ **Pull Handlers (Inbound):**
  - `services/sync/pull/readingPullHandler.ts` — يسحب القراءات + يطبّق LWW (يخطّي dirty/syncing/failed).
  - `services/sync/pull/referencePullHandlers.ts` — 8 معالجات (accounts، places، groups+tblh، currencies، users، company، bonds، bond_payments). البيانات المرجعية تُستبدل بالكامل (full-replace)، السندات تحترم LWW.
  - `services/sync/pull/index.ts` — registry مرتّب (مرجعية أولاً، ثم بيانات الجابي).
- ✅ **Connectivity:**
  - `services/sync/connectivity.ts` — wrapper لـ NetInfo، يُبثّ `connectivity:online`/`offline` على ناقل الأحداث، يُمكّن auto-push عند عودة الاتصال.
- ✅ **Background Fetch:**
  - `services/sync/backgroundFetch.ts` — تكامل `react-native-background-fetch` (Android floor: 15min). يستيقظ → `pushOnly('background_fetch')` → `BackgroundFetch.finish(taskId)` خلال 30 ثانية.
- ✅ **Coordinator (الواجهة العامة):**
  - `services/sync/syncCoordinator.ts` — `syncNow(trigger)` / `pushOnly` / `pullEntities`، يفحص online + auth قبل التشغيل، Push-first ordering، per-entity error isolation للـ pulls.
  - `services/sync/syncBootstrap.ts` — `initSyncEngine({ syncOnStartup, syncOnReconnect, enableBackgroundFetch, foregroundPeriodMs })` للاستدعاء من `App.tsx`.
- ✅ **Events & Logs:**
  - `services/sync/events/syncEvents.ts` — pub/sub خفيف بـ discriminated union (12 نوع حدث) + ring-buffer للـ Dashboard.
  - `services/sync/syncLogger.ts` — كتابة `sync_logs` (append-only persisted) مع pruneOldLogs + getRecentLogs.
- ✅ **Feature-Layer Helpers:**
  - `services/sync/enqueueHelpers.ts` — `enqueueReadingSave`، `enqueueReadingDelete`، `enqueueBondSave`، `enqueueBondPaymentSave`، `reenqueueAllDirtyReadings`. كلها fire-and-forget مع pushOnly تلقائي.
- ✅ **Public Façade:**
  - `services/sync/index.ts` — Barrel يُصدّر `syncNow`/`enqueueReadingSave`/`syncEvents`/`getStats`/إلخ. شاشات الفيتشرز تستورد من هنا فقط.
- ✅ **Types & Configuration:**
  - `services/sync/types.ts` — `SyncEngineConfig`, `PullEntityKey`, `PushHandler`, `PullHandler`, `QueueItemOutcome`, `SyncTriggerReason`. + `DEFAULT_SYNC_CONFIG`.
- ✅ **Documentation:**
  - `services/sync/README.md` — Architecture diagrams + LWW rules + retry timeline + error classification table + Golden Rules.
- ✅ **ADRs الجديدة:** 013 (Local-Wins LWW)، 014 (Push-First ordering)، 015 (Background = Push-only)، 016 (Queue dedup).
- ✅ **Total Phase 4:** 22 ملف جديد (21 TS + 1 README)، 3,466 سطر، ~123 KB.

---

## 🤝 18. للوكيل/المراجع القادم (Handoff Notes)

> إذا قرأت هذا الملف، اتبع هذه الخطوات:
>
> 1. اقرأ **القسم 1** (الهوية) — فهم الاسم الصحيح والشعار.
> 2. اقرأ **القسم 4** (المعمارية) و **القسم 7** (Schema) — افهم المبدأ Offline-First.
> 3. اقرأ **القسم 12** (قواعد الأداء والجودة) — التزم بها صارماً.
> 4. افحص **القسم 14** (الحالة الحالية) — لتعرف أين توقفنا.
> 5. اتبع **القسم 13** (خطة التنفيذ) — أكمل من Phase التالي.
> 6. **لا تكسر القواعد الذهبية:**
>    - لا تغيّر أسماء حقول الـ Backend.
>    - لا تستخدم بصمة.
>    - لا تستخدم Expo.
>    - لا تستبدل WatermelonDB.
>    - حافظ على Arabic + RTL 100%.
>
> عند الشك → ارجع لهذا الملف. وعند إضافة قرار معماري جديد → سجّله في القسم 15 (ADR).

---

> **النهاية. التنفيذ يبدأ الآن — بدقة، نظافة، وقوة.** 🚀
