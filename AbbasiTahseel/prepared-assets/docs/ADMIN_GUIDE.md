# Admin Guide — دليل المدير

> Bilingual: English first, Arabic second, for each section.
> Audience: branch supervisors + regional managers who deploy and operate AbbasiTahseel for the field staff.

---

## 1. Bulk deployment of 50 devices

### EN
For a one-off rollout to ~50 collectors:

1. **Stage devices.** Verify each device meets the spec: Android ≥ 9, ≥ 2 GB RAM, ≥ 32 GB storage, Bluetooth Classic, GPS optional.
2. **Pre-install Tailscale** on each device using the company's MDM (if you have one) or manually with the shared invite link. Sign in with the device-specific Tailscale identity provided by IT.
3. **Distribute the APK** (`AbbasiTahseel-vX.Y.Z.apk`) over the company WhatsApp deployment group **or** by host-side QR code at a single setup desk.
4. **Side-load** on each device:
   - Settings → Security → Allow from unknown sources for the file manager.
   - Open the APK → Install.
5. **Activate**: open the app, copy the displayed device ID, message it to the supervisor, receive a 12-character activation code in return.
6. **Login**: use the per-collector credentials issued by IT.
7. **Pair printer**: each device pairs once with its assigned Datecs DPP-250 via Bluetooth settings (PIN `1234`), then again inside the app under Settings → Printer.
8. **Final smoke test**: a test print + one trial reading + one trial bond (then delete them).

**Per-device time budget**: ~15 minutes (parallelisable across 3–4 setup stations).

### AR
**نشر 50 جهازاً دفعة واحدة:**

1. **تجهيز الأجهزة:** تحقّق من المواصفات: أندرويد ≥ 9، RAM ≥ 2 جيجا، تخزين ≥ 32 جيجا، بلوتوث كلاسيك.
2. **تثبيت Tailscale** مسبقاً (إن وجد MDM، أو يدوياً بالرابط الموحّد). كل جهاز يستخدم هويّة Tailscale خاصة به.
3. **توزيع ملف APK** عبر مجموعة WhatsApp مخصصة أو QR code في طاولة الإعداد.
4. **تثبيت يدوي:** السماح من مصادر غير معروفة → فتح APK → تثبيت.
5. **تفعيل الترخيص:** افتح التطبيق → انسخ رقم الجهاز → أرسله للمشرف → استلم كود التفعيل.
6. **تسجيل الدخول:** ببيانات المحصّل التي تزودها الإدارة.
7. **اقتران الطابعة:** Bluetooth → DPP-250 → PIN `1234`، ثم اختيارها داخل التطبيق.
8. **اختبار نهائي:** طباعة + قراءة + سند تجريبيين، ثم حذفهما.

**زمن متوقع لكل جهاز: 15 دقيقة.**

---

## 2. Activation code distribution

### EN
- The backend exposes `POST /electric/license/activate` which our app already calls. The **supervisor's job** is to generate codes for each collector and store them safely.
- Suggested workflow:
  1. The admin panel (web) → "Licenses" → "Generate batch" → enter N (number of codes) → download a CSV with `device_id_placeholder, activation_code`.
  2. The supervisor sends each code via WhatsApp **only after** the collector has shared their device ID — never preemptively.
  3. After activation, the backend ties the code to the specific device. Re-use on another device is blocked.
- Track codes in an Excel sheet (or the admin panel): `code, issued_to, device_id, activation_date, app_version`.

### AR
**توزيع أكواد التفعيل:**

- نظام الترخيص في السيرفر مرتبط بمعرّف الجهاز (`device_id`). دور المشرف هو إصدار وتوزيع الأكواد.
- التدفق المقترح:
  1. لوحة الإدارة (الويب) → "التراخيص" → "إصدار دفعة" → عدد الأكواد → تنزيل CSV.
  2. أرسل كل كود عبر WhatsApp **فقط بعد** أن يبعث المحصّل رقم جهازه.
  3. بعد التفعيل، يُربط الكود بالجهاز بشكل دائم.
- سجّل الأكواد في Excel: `code, issued_to, device_id, activation_date, app_version`.

---

## 3. Monitoring usage

### EN
The admin web panel (post-Wave 7) surfaces:

- **Daily collection totals** per collector and per branch.
- **Sync health**: time since last sync per device, current queue depth.
- **Activity heatmap**: hours of the day with most readings/bonds.
- **Outliers**: collectors with unusual patterns (very high totals, very low, no activity for > 24h).

Out-of-band signals to keep an eye on:
- Crash reports (if Sentry / Crashlytics integrated).
- Field staff feedback in the dedicated WhatsApp group.

### AR
**مراقبة الاستخدام:**

اللوحة الإدارية (الويب) تعرض:
- **مجموع التحصيل اليومي** لكل محصّل ولكل فرع.
- **صحة المزامنة:** آخر مزامنة لكل جهاز، طول قائمة الانتظار.
- **خريطة النشاط:** ساعات الذروة.
- **الحالات الشاذة:** محصّلون بنشاط غير اعتيادي.

إشارات خارجية مهمة:
- تقارير الانهيارات (إن وُجد Sentry).
- ملاحظات المحصّلين في مجموعة WhatsApp.

---

## 4. Managing user permissions

### EN
Permissions are server-issued (sent in the JWT claims at login). The mobile app
reads them and grays-out / hides actions accordingly. So you change them
in the **admin panel only**, never on the device.

Available permission flags:
- `bond.create`, `bond.edit`, `bond.delete`, `bond.reprint`
- `reading.create`, `reading.edit`, `reading.delete`
- `report.export` (PDF / CSV)
- `report.viewAll` (vs only-own)
- `user.manage` (typically supervisor+ only)

Changes take effect at the collector's **next login or token refresh**
(within ~15 min). To force-apply, ask the collector to log out + back in.

### AR
**إدارة الصلاحيات:**

الصلاحيات تأتي من السيرفر داخل JWT. التطبيق يخفي/يعطّل الأزرار حسب الصلاحية، لذا تُغيَّر الصلاحيات في **اللوحة الإدارية فقط**.

الصلاحيات المتاحة:
- `bond.create / edit / delete / reprint`
- `reading.create / edit / delete`
- `report.export` (PDF / CSV)
- `report.viewAll` (مقابل own)
- `user.manage` (للمشرفين فقط عادةً)

التغييرات تسري عند تسجيل الدخول التالي (خلال ~15 دقيقة). لتطبيق فوري، اطلب من المحصّل تسجيل الخروج والدخول من جديد.

---

## 5. OTA (over-the-air) updates

### EN
We **do not** ship a Play Store auto-update channel (the app is private). To
roll out a new version:

1. CI produces a signed APK on tag push (`v1.2.3`).
2. The GitHub Release contains the APK + `mapping.txt`.
3. The supervisor downloads the APK and shares it via:
   - WhatsApp deployment group, or
   - QR code on a single shared link, or
   - MDM if available.
4. Each collector installs over their existing install (same keystore → no uninstall needed).
5. The first launch after update runs schema migrations silently (WatermelonDB handles it).

**Rollback policy**: if a release breaks, publish `v{N}.{M}.{P+1}` reverting the change. **Do not** delete tags or APKs — keep history.

### AR
**تحديثات OTA:**

التطبيق خاص، فلا توجد قناة تحديث تلقائي من Play Store.

التدفّق:
1. CI ينتج APK موقّع عند push للـ tag (مثل `v1.2.3`).
2. GitHub Release يحوي APK + `mapping.txt`.
3. المشرف يوزّعه عبر WhatsApp أو رابط QR.
4. كل محصّل يثبّت الـ APK الجديد فوق القديم — لا يحتاج لإلغاء التثبيت لأن المفتاح هو نفسه.
5. عند أول تشغيل، يُجري التطبيق هجرة قاعدة البيانات بصمت.

**سياسة الرجوع:** إذا فشل إصدار، أصدر `v{N}.{M}.{P+1}` يلغي التغيير. لا تحذف tags.

---

## 6. Common admin-side issues

| Issue (EN)                                    | Cause                                  | Fix                                                 |
|-----------------------------------------------|----------------------------------------|-----------------------------------------------------|
| Collector can't activate (code rejected)       | Code already bound to other device     | Revoke in admin panel, issue new code                |
| Collector logged in but sync stuck             | Tailscale dropped on the device        | Have them reconnect Tailscale, then "Sync now"       |
| Reports show 0 even though data was entered    | Server didn't receive (sync queue full)| Inspect device → Settings → Advanced → View logs    |
| Printer pairs but Arabic prints as gibberish    | Wrong code page (rare)                 | Confirm app uses cp1256; reinstall app to reset.    |
| APK install fails with "package conflicts"     | Different keystore than previous build  | Verify CI used production keystore. Worst case: uninstall + reinstall (collector loses local-only data). |

---

## 7. Security checklist for admins

- [ ] All collector devices on Tailscale + restricted ACL group.
- [ ] No collector has the keystore or its passwords.
- [ ] Production keystore backup verified (cf. `keystore-setup.md`).
- [ ] Server JWT secret rotated annually.
- [ ] Disabled accounts revoked in admin panel within 1 hour.
- [ ] Audit log enabled on the server side for every license activate / revoke.

---

## 8. Branch-level KPIs to track

| KPI                                     | Target (per collector / day) |
|-----------------------------------------|------------------------------|
| Readings entered                         | ≥ 25                         |
| Bonds collected                          | ≥ 12                         |
| Avg sync latency                         | ≤ 2 minutes                  |
| Crash-free sessions                      | ≥ 99 %                       |
| Daily summary printed before end-of-shift| 100 %                        |

Track in the admin web dashboard, surface to regional managers weekly.
