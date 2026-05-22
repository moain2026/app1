# HANDOFF_PROMPT — للوكيل الجديد

> هذا الملف يحتوي على البرمت اللي ترسله للوكيل الجديد كأول رسالة في
> الجلسة الجديدة. انسخ المحتوى داخل code block أدناه كاملاً وأرسله.

---

## النص للنسخ والإرسال

```text
السلام عليكم. أنت تنضم لمشروع AbbasiTahseel — إعادة بناء بـ React Native
لتطبيق Android قديم اسمه ElectricCollector28 يستخدمه عمّال شركة العباسي
لتوليد الكهرباء التجارية لقراءة العدادات وتحصيل الفواتير.

🏁 خطوة ١ — اتصل بـ GitHub (إجباري قبل أي شي ثاني):
استدعِ tool اسمه `setup_github_environment`. هذا يضبط لك git credentials
تلقائياً لحساب moain2026 ويعطيك صلاحية push/PR. بدونه لا تستطيع تعمل
أي شي على GitHub.

🏁 خطوة ٢ — افحص المشروع:
نفّذ الأوامر التالية بهذا الترتيب بالضبط:

cd /home/user/webapp/AbbasiTahseel && pwd
git status
git branch --show-current
git log --oneline -8
gh pr list
gh pr checks 26

ستجد:
- الفرع الحالي: fix/wcf-authenticate-endpoint
- آخر commit: 8c0c48b fix(auth): switch to /Authenticate (WCF) with /Login fallback
- PR مفتوح رقم 26 على https://github.com/moain2026/app1/pull/26
- CI على PR #26: green (كلا الفحصين pass)

🏁 خطوة ٣ — اقرأ التوثيق بهذا الترتيب (لا تتجاوز):

1. /home/user/webapp/AbbasiTahseel/AGENT_CONTEXT/README.md
   ← الفهرس الكامل لقاعدة المعرفة. ابدأ منه.

2. /home/user/webapp/AbbasiTahseel/AGENT_CONTEXT/CURRENT_STATE.md
   ← آخر حالة + من أين تكمل. يحتوي على قسم "▶️ RESUME FROM HERE".

3. /home/user/webapp/AbbasiTahseel/AGENT_CONTEXT/AUTH_INVESTIGATION.md
   ← القصة الكاملة لاكتشاف أن الـ backend هو .NET WCF (مش PHP).
      اقرأ هذا الملف بالكامل قبل أي تعديل على auth/login. السبب: لقد
      أهدرنا PR رقم 25 على تشخيص خاطئ — لا تكرر ذلك.

4. /home/user/webapp/AbbasiTahseel/AGENT_CONTEXT/KNOWN_ISSUES.md
   ← القيم السحرية، الـ gotchas، أخطاء شائعة.

5. /home/user/webapp/AbbasiTahseel/AGENT_CONTEXT/NETWORK_TOPOLOGY.md
   ← خريطة Tailscale + IPs + ports.

6. /home/user/webapp/AbbasiTahseel/AGENT_CONTEXT/LEGACY_JAVA_MAP.md
   ← خريطة للكود القديم decompiled-Java. مرجع فقط، لا تعدّل.

7. /home/user/webapp/AbbasiTahseel/AGENT_CONTEXT/CODING_RULES.md
   ← الخطوط الحمراء (zero `any`, زود tsc clean، etc.)

8. /home/user/webapp/AbbasiTahseel/PROJECT_PLAYBOOK.md
   ← تاريخ كل الموجات + 19 ADR. مرجع طويل، تصفّحه فقط.

🏁 خطوة ٤ — تعرّف على المهارات (skills):

في مجلد /home/user/webapp/AbbasiTahseel/.claude/skills/ ستجد 9 ملفات
skill، كل واحد يغطي مجال متخصص. اقرأ skill على حسب الحاجة، مش كلهم مرة
واحدة. هذي الفهرس:

- README.md → الفهرس
- wcf-api-debugging.md → تشخيص استجابات WCF (مهم لـ login)
- react-native-android-build.md → بناء APK + CI
- apk-install-and-test.md → كيف تشرح للـ user يثبّت APK
- arabic-cp1256-printing.md → الطابعة + Arabic shaping
- zustand-store-architecture.md → نمط الـ stores في المشروع
- legacy-java-decompile-analysis.md → قراءة Java القديم
- zod-schema-validation.md → schemas + lenient parsers
- git-workflow-genspark.md → اقرأ هذا قبل أي commit
- watermelondb-models-and-sync.md → لـ Wave 6 القادم

📋 الحالة الحالية بإيجاز:

✅ تم:
- Wave 1: Project scaffold (RN 0.74.5 bare + TS strict + WatermelonDB)
- Wave 2: HTTP client + Zod schemas + storage + i18n + AppError
- Wave 3: Navigation + Auth screens + License + ServerSettings + Theme
- Wave 4: Readings module (reactive list, filters, Dev Bypass)
- Wave 5: Printer (Datecs DPP-250 + cp1256 + ESC/POS) + Scanner stub + CompanyInfo stub
- PR #26 الحالي: حل خطأ تسجيل الدخول — تحويل لـ /Authenticate (WCF)

⏳ المعلّق:
- اختبار حقيقي للـ APK من PR #26 (في انتظار الـ user)
- إذا نجح الـ login: دمج PR #26 وبدء Wave 6
- إذا فشل: الـ user راح يرسل لك "تفاصيل الخطأ" من شاشة Login (تحتوي raw
  responses من /Authenticate و /Login معاً) وأنت تشخّص

🚀 الموجات القادمة:
- Wave 6 — Bonds + BondPayments (سندات + مدفوعاتها)
  Models موجودة في src/database/models/Bond.ts و BondPayment.ts
  Mock data جاهزة في prepared-assets/mock/mock-bonds.json
  i18n keys جاهزة في prepared-assets/i18n/ar-wave6-bonds.json
- Wave 7 — Reports + Profile + About + Release v1.0.0

🔴 قواعد ذهبية (لا تتجاوزها):

1. الـ backend هو .NET WCF، مش PHP. لا تفترض غير ذلك.
2. الـ field `appId` بـ camelCase دائماً، في كل مكان. لا تحوّله lowercase.
   PR #25 سوّى هذه الغلطة وانقفل. لا تكرر.
3. أسماء الأعمدة القديمة في DB (num, ks, kh, cas, asts, ...) مقدّسة.
   لا ترخصها lowercase ولا تغيّر هجاءها — السيرفر يعتمد عليها حرفياً.
4. zero `any`، zero `@ts-ignore`، zero `as unknown as`. شغّل
   `npx tsc --noEmit` قبل كل commit. لازم 0 errors.
5. commit-then-push بعد كل تغيير. local-only commits = مفقودة في الـ
   sandbox. كل commit يلزم له PR (أو يكون على PR موجود).
6. ما تعدّل على main أبداً. كل wave له branch + PR منفصل.
7. ما تلمس ElectricCollector_Full_Analysis/ ولا prepared-assets/ —
   reference only.
8. تخاطب الـ user بالعربي. هو يفضّل العربي ويرد بالعربي.
9. لما تنشئ PR، انسخ الـ URL وأعطيها للـ user مباشرة. لا تنتظر يطلب.
10. الصدق أهم من الذكاء. لو ما متأكد، قل ما متأكد. لو الـ user يقترح حل
    خاطئ، قل له لطف وبأدلة. لا تطنّش.

📞 خصائص الـ user:
- اسمه معين العباسي
- يتكلم عربي عراقي بأخطاء إملائية بسيطة (متعارف عليها — لا تصحح)
- يستخدم Tailscale VPN للوصول للسيرفر
- هاتفه اسمه "motech" بالـ tailnet
- ID الـ secureId الخاص فيه: 2098897319
- بياناته للاختبار: معين العباسي / 771771
- يفضّل الردود المختصرة المباشرة مع أدلة
- لما يقول "كمل" يعني استمر بالخطة بدون إذن إضافي
- لما يطلب صور أو تفاصيل، يقصد screenshots من شاشته أو الـ APK

🎯 المهمة الفورية:

اذا الـ user ما كلّمك بعد، انتظره. لما يكلّمك، احتمالين:

أ) يخبرك أن الـ APK من PR #26 شغّل وسجّل دخوله بنجاح →
   - افتح Pull Request #26 ودمجه
   - حدّث main وابدأ Wave 6 على branch feat/wave-6-bonds

ب) يخبرك أن الـ APK فشل ويرسل لك "تفاصيل الخطأ" من شاشة Login →
   - الـ message يحتوي على raw responses من STAGE 1 (/Authenticate)
     و STAGE 2 (/Login) معاً مفصولة بـ ──────────
   - اقرأ كلا الـ responses
   - شخّص بناءً عليها (راجع skill: wcf-api-debugging.md)
   - افتح PR جديد بالحل، أو حدّث PR #26

ج) يقول لك "كمل" → خلّص الـ Wave 5 follow-ups (Wave 5.2 Scanner camera،
   Wave 5.3 CompanyInfo real form) أو ابدأ Wave 6 مباشرة.

تأكد قبل ما تبدأ: اقرأ AGENT_CONTEXT/CURRENT_STATE.md بالكامل أولاً.
كل شي اللي تحتاجه موجود فيه أو في الملفات المُشار إليها.

أنت تعمل في sandbox Linux في /home/user/webapp/AbbasiTahseel.
استخدم cd /home/user/webapp/AbbasiTahseel && <command> دائماً لأن الـ
Bash tool يبدأ من /home/user كل مرة.

بالتوفيق. 🚀
```

---

## كيف تستخدم هذا الـ prompt

1. **انسخ كل ما داخل code block أعلاه** (يبدأ من `السلام عليكم` وينتهي بـ `بالتوفيق. 🚀`)
2. افتح حساب AI Developer جديد (نفس النموذج Claude Code أو ما يماثله)
3. الصق المحتوى كأول رسالة في الجلسة الجديدة
4. الوكيل الجديد راح يقرأ كل شي تلقائياً ويبدأ من نفس النقطة

## ماذا يتضمن الـ prompt

- ✅ كيف يربط نفسه بـ GitHub (`setup_github_environment`)
- ✅ ترتيب قراءة التوثيق
- ✅ فهرس المهارات
- ✅ الحالة الحالية بتفصيل
- ✅ القواعد الذهبية (10 قواعد)
- ✅ خصائص الـ user (شخصيتك، تفضيلاتك، secureId الخاص فيك)
- ✅ المهمة الفورية بثلاث سيناريوهات
- ✅ تعليمات بيئة الـ sandbox

## بيانات حساسة في الـ prompt

⚠️ **مهم:** الـ prompt يحتوي على:
- `secureId` للهاتف: `2098897319`
- بيانات الاختبار: `معين العباسي` / `771771`
- IP السيرفر: `100.87.131.115:3000`

هذي بيانات داخلية للمشروع — آمن وضعها للوكيل لأنه راح يحتاجها للاختبار،
لكن لا تنشر الـ prompt علناً.

## بيانات GitHub Auth — معلومة مهمة

**التوكن الحالي اللي عندي (`ghu_...`) خاص بهذه الجلسة فقط** ولن يشتغل
للوكيل الجديد. الوكيل الجديد يستخدم `setup_github_environment` tool
ليجدّد توكن جديد لجلسته. هذي العملية أوتوماتيكية لأن حسابك (`moain2026`)
مربوط فعلياً بـ AI Developer system، فأي وكيل جديد ينشأ تحت حسابك راح
يحصل auth credentials تلقائياً.

**لا تحتاج تنسخ التوكن.** الـ system يدير ذلك بنفسه عندما تكون الجلسة
الجديدة تحت نفس حساب `moain2026`.
