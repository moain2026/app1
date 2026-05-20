# 🗄️ Database Layer — العباسي تحصيل

## مبدأ التصميم

**WatermelonDB** هو **Source of Truth الوحيد** على الجهاز. الـ UI يقرأ منه حصراً عبر `observe`. الكتابة المحلية تتم أولاً ثم تُضاف إلى `sync_queue` للرفع للسيرفر.

## القاعدة الذهبية — أسماء الحقول

> **أسماء أعمدة قاعدة البيانات تطابق حرفياً أسماء حقول JSON من السيرفر القديم.**

| Schema Column (here) | Backend JSON | UI Accessor (getter) | المعنى |
|---|---|---|---|
| `noadad` | `noadad` | `meterNumber` | رقم العداد |
| `ks` | `ks` | `previousReading` | القراءة السابقة |
| `kh` | `kh` | `currentReading` | القراءة الحالية |
| `asts` | `asts` | `expectedConsumption` | الاستهلاك المتوقع |
| `cas` | `cas` | `isPosted` / `postingStatus` | حالة الترحيل |
| `nomstlm` | `nomstlm` | `receiverArea` | المنطقة/المستلم |
| `notblh` | `notblh` | `bookNumber` | التابلة/الدفتر |
| `nog` | `nog` | `groupNumber` | المجموعة |
| `ind` | `ind` | `meterType` | النوع |
| `num` | `num` | `num` | الرقم التسلسلي |
| `name` | `name` | `customerName` | اسم المشترك |
| `namet` | `namet` | `customerAlias` | الاسم البديل |

## الـ Tables (12)

1. **readings** ← Reading.ts (12 legacy fields + sync metadata)
2. **bonds** ← Bond.ts
3. **bond_payments** ← BondPayment.ts
4. **accounts** ← Account.ts (read-only mirror)
5. **places** ← Place.ts
6. **t_groups** ← TGroup.ts
7. **tblh** ← Tblh.ts
8. **currencies** ← Currency.ts
9. **users** ← User.ts (with legacy permission flags DE/ED/REP/S_K/S_S/SYS/NOA/NOU)
10. **company_info** ← CompanyInfo.ts (for print receipts)
11. **sync_queue** ← SyncQueueItem.ts (outbound mutation queue)
12. **sync_logs** ← SyncLog.ts (audit trail)

## الاستخدام

```ts
import { database, Reading } from '@/database';
import { Q } from '@nozbe/watermelondb';

// Reactive query (use inside React via withObservables / useObservable):
const unpostedReadings$ = database
  .collections.get<Reading>('readings')
  .query(Q.where('cas', 0), Q.sortBy('num', Q.asc))
  .observe();

// Writing (always inside a write block):
await database.write(async () => {
  const collection = database.collections.get<Reading>('readings');
  await collection.create(r => {
    r.localUuid = '<uuid v4>';
    r.noadad = '12345';
    r.name = 'محمد علي';
    r.ks = 100;
    r.kh = 150;
    r.cas = 0;
    r.syncStatus = 'dirty';
    r.syncAttempts = 0;
    // ...
  });
});
```

## ترقية المخطط (Schema Migration)

عند تغيير الـ Schema:
1. عدّل `schema.ts` وارفع `SCHEMA_VERSION`.
2. أضف خطوة migration في `migrations.ts`.
3. اختبر الترقية على نسخة محلية قبل النشر.
