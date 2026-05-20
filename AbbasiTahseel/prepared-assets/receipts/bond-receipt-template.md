# Bond Receipt — Payment Receipt (سند قبض) Print Template

> Printed when a collector closes a bond and hands the subscriber a paper proof
> of payment. Includes itemised payments + grand total + barcode.

---

## 1. ASCII layout (48 columns wide)

```
================================================
                                                
            شركة العباسي للكهرباء                
              {{company.branch}}                 
                                                
================================================
                                                
                    سند قبض                      
              (PAYMENT RECEIPT)                  
                                                
------------------------------------------------
  رقم السند          : {{bond.num}}                
  التاريخ              : {{bond.date}}              
  الوقت                : {{bond.time}}              
  المحصّل              : {{collector.name}}         
------------------------------------------------
  المشترك              : {{subscriber.name}}        
  رقم العداد           : {{noadad}}                 
  الهاتف               : {{subscriber.phone}}       
  العنوان              : {{subscriber.address}}     
  الرصيد السابق       : {{previous_balance}}        
------------------------------------------------

  تفاصيل الدفعات:

  ──────────────────────────────────────────────
  | النوع       | المبلغ            | العملة   |
  ──────────────────────────────────────────────
  | نقد          |        50,000     | د.ع       |
  | نقد          |        20.00      | $         |
  | حوالة        |        25,000     | د.ع       |
  ──────────────────────────────────────────────


  ─────────────────────────────────              
   المجموع:                                      
       95,000 د.ع                                 GS ! 0x22  (large)
       20.00 $                                    
  ─────────────────────────────────              

  ملاحظات: {{notes_or_dash}}                     

------------------------------------------------

  الرصيد الجديد       : {{new_balance}}            

------------------------------------------------

   كود التحقق:
   ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮             (CODE128 barcode)
       {{barcode_text}}

------------------------------------------------

   ▮▮ QR للأرشفة ▮▮
   [QR CODE]                                      
   (URL or signed JSON: bond_id+amount+date+checksum)

------------------------------------------------

   شكراً لكم
   هاتف الدعم: 0770-xxx-xxxx
   www.alabbasi-elc.iq

================================================
   توقيع المحصّل: ______________________


(feed 3 lines + cut)
```

---

## 2. Placeholders

| Token                       | Source                                                       |
|-----------------------------|--------------------------------------------------------------|
| `{{company.branch}}`        | `prefs.branchNumber + companyName`                            |
| `{{bond.num}}`              | bond.num (sequential, server-issued or local if offline)      |
| `{{bond.date}}`             | bond.bondDate → `dd/MM/yyyy`                                 |
| `{{bond.time}}`             | bond.bondDate → `HH:mm`                                       |
| `{{collector.name}}`        | authStore.user.fullName                                       |
| `{{subscriber.name}}`       | account.name                                                  |
| `{{noadad}}`                | bond.noadad                                                   |
| `{{subscriber.phone}}`      | account.phone \|\| '—'                                        |
| `{{subscriber.address}}`    | account.address \|\| '—'                                      |
| `{{previous_balance}}`      | account.balance **before** this bond, formatted               |
| `{{payments[*].typeLabel}}` | i18n key `bonds.payment.types.{cash,installment,transfer,...}` |
| `{{payments[*].amount}}`    | payment.amount, formatted                                     |
| `{{payments[*].currency}}`  | currency.symbol (د.ع / $)                                     |
| `{{total_iqd}}`             | sum of IQD payments                                           |
| `{{total_usd}}`             | sum of USD payments (printed only if > 0)                     |
| `{{notes_or_dash}}`         | bond.notes \|\| '—'                                           |
| `{{new_balance}}`           | account.balance **after** this bond                            |
| `{{barcode_text}}`          | `B-{{bond.num}}-{{bond.id.slice(-6)}}`                         |
| `{{qr_payload}}`            | base64(JSON: `{ bondId, amount, date, sig }`)                  |

---

## 3. Multi-currency rules

A bond can contain payments in multiple currencies (IQD + USD typical).
The total block prints one large bold line per currency that has at least one payment:

```
       95,000 د.ع
       20.00 $
```

Currencies are ordered: IQD first, then USD, then others (alphabetical by code).

---

## 4. Style hierarchy

| Element                 | Style                                  |
|-------------------------|----------------------------------------|
| Title "سند قبض"         | center, GS ! 0x11 (×2), bold           |
| Sub-title (PAYMENT…)    | center, small font                     |
| Section dividers        | 48× `=` or `-`                          |
| Field labels            | right-aligned, bold                    |
| Payments table          | left-aligned ASCII table, small font   |
| Grand total             | center, GS ! 0x22 (×3), bold           |
| Footer                  | center, normal size                    |
| Signature line          | left, underline                         |

---

## 5. Variants

### 5.1 Single-payment compact (most common — saves paper)

If there is exactly **one** payment and notes is empty:

```
================================================
        شركة العباسي للكهرباء — سند قبض
================================================
  السند #{{num}}          {{date}} {{time}}
  المحصّل: {{collector.name}}
------------------------------------------------
  المشترك: {{subscriber.name}}
  العداد:  {{noadad}}
------------------------------------------------

         المبلغ المدفوع                          (large)
         {{amount}} {{currency}}

------------------------------------------------
  الرصيد الجديد: {{new_balance}}
------------------------------------------------
  [QR]    شكراً لكم
================================================
```

### 5.2 Reprint variant

When re-printing an existing bond (e.g. subscriber lost the original), add a
banner just under the title:

```
                  *** نسخة طبق الأصل ***
                  *** REPRINT — رقم النسخة: {{reprintNo}} ***
```

### 5.3 Refund (negative payment)

If any payment.amount < 0 → display as `(-{{abs}}) د.ع` and label "ردّ مبلغ".
Grand total may be negative — print in bold + parentheses.

---

## 6. Barcode contents

CODE128, contents = `B-{{bond.num}}-{{hash6}}` where `hash6` is the first 6
chars of `sha256(bond_id + amount + date)` to make the receipt non-forgeable
when scanned for verification.

---

## 7. QR payload schema

```json
{
  "v": 1,
  "type": "BOND",
  "bondId": "ab12-...",
  "num": 1042,
  "amount": 95000,
  "currency": "IQD",
  "date": "2026-05-20T11:42:00+03:00",
  "collector": "user_id_42",
  "sig": "base64(hmac_sha256(payload, deviceSecret))"
}
```

Scanner app (future "verifier" tool, out of v1 scope) reads this and confirms
the bond exists on the server.
