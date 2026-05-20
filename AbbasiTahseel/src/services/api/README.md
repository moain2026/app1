# 🌐 Network Layer — العباسي تحصيل

## نظرة عامة

طبقة الشبكة مبنيّة كـ **خط دفاع متدرّج**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Repository / UI                           │
│       يستدعي api.call('saveReading', { body, ... })          │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │           apiClient.ts              │  ← façade مكتوب بأنواع
        │  • يقرأ endpoint descriptor          │
        │  • يُرمّز body (json/form)            │
        │  • يُلصق X-Skip-Auth و X-Idempotent  │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │        httpClient.ts (Axios)         │
        │  baseURL ← prefs.getBaseUrl() (lazy) │
        └──────────────────┬──────────────────┘
                           │
                ┌──────────▼──────────┐
                │  Auth Interceptor   │   request → يُرفق Bearer
                └──────────┬──────────┘
                           │
                           ▼
                      [ Network ]
                           │
                           ▼
                ┌─────────────────────┐
                │  Retry Interceptor  │   ← يعيد المحاولة على 5xx/timeout
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ Refresh Interceptor │   ← على 401: يجدّد ويعيد المحاولة مرة واحدة
                └──────────┬──────────┘   (يُصلح خلل +a)
                           │
                ┌──────────▼──────────┐
                │  Error Interceptor  │   ← أي فشل متبقّي → AppError
                └──────────┬──────────┘
                           │
                           ▼
                      ┌────────┐
                      │  Zod   │   ← المسؤول يستدعي parseReadingList(raw)
                      └────┬───┘
                           │
                           ▼
                  ┌──────────────┐
                  │   Mapper     │   ← يحوّل DTO إلى Domain Model
                  └──────────────┘
```

## استخدام نموذجي

### قراءة قائمة العدادات:
```ts
import { api, parseReadingList } from '@/services/api';
import { runSafe, ErrorCodes } from '@/utils/errors';

const result = await runSafe(async () => {
  const raw = await api.call('getListReadingCounter', {
    params: { user_id: '1' },
  });
  return parseReadingList(raw);
}, ErrorCodes.VALIDATION_SERVER_RESPONSE);

if (!result.ok) {
  showToast(result.error.userMessage);
  return;
}
// result.value: ItemReadingDto[]
```

### حفظ قراءة (مع idempotency):
```ts
import { api, readingToDto } from '@/services/api';

await api.call('saveReading', {
  body: readingToDto(domainReading),
  idempotent: true,    // ← يسمح بإعادة المحاولة عند فشل عابر
});
```

### تسجيل دخول:
```ts
import { api, userFromLoginResponse } from '@/services/api';
import { secureStorage } from '@/services/storage';

const raw = await api.call('login', {
  body: { username, password, appid: 'abbasi-tahseel' },
});

const { user, tokens } = userFromLoginResponse(raw);
if (tokens) {
  await secureStorage.setAccessToken(tokens.accessToken);
  await secureStorage.setRefreshToken(tokens.refreshToken);
}
```

## القواعد الذهبية

1. **لا تستخدم axios مباشرة في المكوّنات / الـ Repositories** — استخدم `api.call(...)` دائماً.
2. **لا تُمرّر raw response إلى WatermelonDB** — مرّره عبر Mapper/Zod أولاً.
3. **لا تُسجل tokens في logs** — استخدم `logger.tokenSafe()`.
4. **لا تُغيّر أسماء حقول DTO** (`noadad`, `ks`, `kh`...) — هذه عقد ثابت مع السيرفر القديم.
5. **عند إضافة endpoint جديد** — أضفه في `endpoints.ts` أولاً، ثم schema + mapper.

## ملفات الطبقة

```
services/api/
├── endpoints.ts             ← 31 endpoint typed
├── httpClient.ts            ← Axios instance
├── apiClient.ts             ← typed façade
├── interceptors/
│   ├── auth.interceptor.ts        ← Bearer token
│   ├── refresh.interceptor.ts     ← 401 handling (no +a bug!)
│   ├── retry.interceptor.ts       ← exponential backoff
│   ├── error.interceptor.ts       ← → AppError
│   └── index.ts                   ← composition order
├── schemas/
│   ├── common.ts                  ← zIntLoose, zBoolLoose, ...
│   ├── auth.ts
│   ├── reading.ts                 ← ItemReadingDto (12 legacy fields)
│   ├── lists.ts
│   ├── reports.ts
│   └── index.ts
├── mappers/
│   ├── auth.mapper.ts             ← TokenPair, AuthenticatedUser
│   ├── reading.mapper.ts          ← ReadingDomain ↔ ItemReadingDto
│   ├── lists.mapper.ts            ← AccountDomain, PlaceDomain, ...
│   ├── reports.mapper.ts
│   └── index.ts
└── index.ts                       ← barrel export
```

## مرجع الـ Bug-Fixes

| Bug من التطبيق القديم | الإصلاح هنا |
|---|---|
| `CustomAuthenticator.java:41` يلصق `"a"` (HtmlTags.A) في نهاية refresh_token | `refresh.interceptor.ts` يرسل refresh_token كما هو (`BUG_COMPAT_APPEND_A = false`) |
| `TokenManager.java` يحفظ tokens في SharedPreferences نصاً مكشوفاً | `secureStorage.ts` → Keychain AES-GCM |
| `LoginActivity.java:242` يحفظ `user_password` كنص مكشوف | لا نحفظ كلمة السر إطلاقاً — فقط tokens |
| `RetrofitBuilder` بـ timeout 200 ثانية | `httpClient.ts` بـ 30 ثانية افتراضياً |
| `MoshiConverterFactory.create().asLenient()` يقبل أي شيء بصمت | كل response يمر عبر Zod schema — وأخطاء الـ schema تظهر فوراً |
