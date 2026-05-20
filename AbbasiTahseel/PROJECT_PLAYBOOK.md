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

### Phase 3 — Network Layer (Days 7-9)
- [ ] Axios instance + interceptors (auth, refresh, retry, error).
- [ ] endpoints.ts (31 endpoint typed).
- [ ] DTO mappers (legacy ↔ clean UI).
- [ ] Zod schemas للتحقق.

### Phase 4 — Sync Engine (Days 10-12)
- [ ] SyncQueue manager.
- [ ] SyncWorker مع exponential backoff.
- [ ] Background fetch setup.
- [ ] Idempotency keys + conflict resolution.

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
| Phase 3 — Network | ⏳ Pending | |
| Phase 4 — Sync Engine | ⏳ Pending | |
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
