# Skill — APK Install + Field Test (User-Facing)

> The user installs APKs from CI on real devices. This skill is what you
> tell them, step-by-step, and what evidence to ask for back.

## Skill summary

- Walk the user through downloading a CI APK
- Walk them through sideloading on Android
- What to ask for as evidence when something fails

## Where the APK lives

CI builds debug APKs as **GitHub Actions artifacts**, not GitHub Releases.
For PR #N, the artifact is on the workflow run linked from the PR's
"Checks" tab.

Direct path:
```
https://github.com/moain2026/app1/actions/runs/<run-id>
→ scroll to bottom → "Artifacts" section
→ "abbasi-tahseel-debug-apk" (a ZIP containing one APK)
```

## How to tell the user (Arabic ready-to-send template)

```
السلام عليكم،
الـ APK جاهز للتجربة!

🔗 الرابط: https://github.com/moain2026/app1/actions/runs/<RUN_ID>

خطوات التثبيت:
1. افتح الرابط من متصفح الموبايل (أو من الكمبيوتر ثم انقل الملف)
2. اضغط Sign in to GitHub (لأن الـ artifact يحتاج تسجيل دخول)
3. انزل لأسفل الصفحة → قسم Artifacts → اضغط abbasi-tahseel-debug-apk
4. راح ينزل ملف ZIP (~47 MB)
5. فك الضغط — راح تطلع نسخة APK واحدة
6. على الموبايل، افتح ملف الإعدادات → Security → فعّل "Install unknown apps"
   لتطبيق إدارة الملفات (File Manager) أو المتصفح
7. ادخل على ملف الـ APK → Install
8. لو ظهرت رسالة Play Protect blocked → اضغط More details → Install anyway
9. افتح Tailscale وتأكد إنه متصل
10. افتح التطبيق → سجّل دخول بـ معين العباسي / 771771

لو فشل تسجيل الدخول:
- في شاشة تسجيل الدخول راح يظهر صندوق أحمر باللي يقول "تفاصيل الخطأ"
- اضغط زر "نسخ" بجانبه
- الصق المحتوى هنا في الشات وأرسله
```

## What the diagnostic looks like (post PR #26)

After PR #26, a failed login produces:

```
URL: http://100.87.131.115:3000/electric/Login
Method: POST
Status: 200
Code: SCHEMA_INVALID
Time: 2025-05-22T18:30:00.000Z

Request Body:
{
  "username": "معين العباسي",
  "password": "<6 chars>",
  "appId": "1",
  "secureId": "abc12345…"
}

Response Body:
STAGE 1 — POST http://100.87.131.115:3000/electric/Authenticate
Result: HTTP 200 schema invalid or empty token.
Server returned:
""

──────────
STAGE 2 (/Login) — schema invalid.
Server returned:
{}
```

The `──────────` separator means the user copied a PR-#26-era diagnostic
that contains BOTH stages. Read both:
- **STAGE 1** tells you what `/Authenticate` returned.
- **STAGE 2** tells you what `/Login` returned.

## Evidence to ask for if user reports a failure

1. **The full diagnostic copy.** Always.
2. **Tailscale status:** "هل أيقونة Tailscale في الـ status bar مضيئة (مفعّلة)؟"
3. **Browser test:** "افتح المتصفح وادخل على
   `http://100.87.131.115:3000/electric/` — هل تشوف صفحة الـ WCF Service
   Explorer أو رسالة خطأ؟"
4. **A screenshot of the LoginScreen** when the error showed — helps
   verify which credentials were entered.
5. **adb logcat snippet** (advanced users only):
   ```bash
   adb logcat -s ReactNativeJS:V | grep -i auth
   ```
   This dumps the in-app logger output. The two-stage flow logs both
   stages at `debug` level.

## What you can decide from the diagnostic

| STAGE 1 response | STAGE 2 response | Conclusion |
|---|---|---|
| `""` | `{}` | Both endpoints reached, credentials likely wrong |
| `""` | Users object with `access_token` | STAGE 1 broken but STAGE 2 works — user is logged in |
| HTTP 404 | HTTP 404 | URL path is wrong; check `getBaseUrl()` resolution |
| HTTP 405 | OK | STAGE 1 used wrong verb; check `endpoints.ts` |
| HTTP 415 | OK | STAGE 1 has wrong Content-Type; check `apiClient.ts` |
| (no STAGE 2 section) | — | STAGE 1 succeeded; the user is already logged in |
| `<xml>` Soap Fault | `{}` | Server-side .NET exception; capture XML and ask user to test on browser |

## How to do a "smoke test" without real credentials

Tell the user to log in with `dev` / `0000`. This activates the Dev
Bypass path (`src/services/auth/devBypass.ts`), skips the network
entirely, and seeds 25 mock readings. If THAT works, the local app
itself is fine — any failure is network/server-side.

## Persistent device-specific config

The user's `secureId` for phone "motech" is **`2098897319`**. If the
user reports needing to force it (e.g. migrating from the legacy app),
ask them to:

1. Go to ServerSettingsScreen
2. Tap "Override Device ID" (Wave 3 added this)
3. Enter `2098897319`

This is stored in MMKV and overrides the auto-computed ANDROID_ID-based
value.

## Quick troubleshooting tree

```
Login fails
├── "تفاصيل الخطأ" shows HTTP 404 / 405
│   └── Endpoint wiring bug — check endpoints.ts vs WCF Service Explorer
├── "تفاصيل الخطأ" shows HTTP 200 with empty bodies
│   └── Credentials wrong, OR field-name casing wrong
├── "تفاصيل الخطأ" shows "Network Error" / "ETIMEDOUT"
│   └── Tailscale offline, OR server down — verify with browser test
├── No "تفاصيل الخطأ" appears at all
│   └── App crashed before set(); check adb logcat
└── Login succeeds but app crashes after
    └── Probably the LoadFromStorage path; check authStore.loadFromStorage()
```
