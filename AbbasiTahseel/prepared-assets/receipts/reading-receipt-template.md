# Reading Receipt — Meter Reading Print Template

> Printed when a collector finishes recording a meter reading and wants to
> hand the subscriber a paper proof.
> Paper: 58 mm, font B (48 cpl), cp1256 Arabic, right-aligned body.

---

## 1. ASCII layout (48 columns wide)

```
================================================
                                                
            شركة العباسي للكهرباء                
              {{company.branch}}                 
                                                
================================================
                                                
                   إيصال قراءة                   
                                                
------------------------------------------------
  المحصّل           : {{collector.name}}        
  رقم الجهاز       : {{device.id}}              
  التاريخ            : {{date}}                   
  الوقت              : {{time}}                   
------------------------------------------------
  المشترك            : {{subscriber.name}}       
  رقم العداد         : {{noadad}}                 
  المنطقة            : {{area.name}}              
------------------------------------------------

  القراءة السابقة    : {{ks}}                     
  القراءة الحالية   : {{kh}}                      
                                                
  ─────────────────────────────────             
   الاستهلاك (kWh)  : {{consumption}}            
  ─────────────────────────────────             

  ملاحظات: {{notes_or_dash}}                     

------------------------------------------------

   كود التحقق:
   ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮             (CODE128 barcode of local_uuid)
       {{barcode_text}}

------------------------------------------------

   شكراً لتعاونكم
   هاتف الدعم: 0770-xxx-xxxx

================================================



(feed 3 lines + cut)
```

---

## 2. Placeholders

| Token                  | Source                            | Format              |
|------------------------|-----------------------------------|---------------------|
| `{{company.branch}}`   | `prefs.branchNumber + companyName`| Arabic string       |
| `{{collector.name}}`   | `authStore.user.fullName`         | Arabic string       |
| `{{device.id}}`        | `Device.getDeviceId()` (short)    | 6 chars hex         |
| `{{date}}`             | local date                        | `dd/MM/yyyy`        |
| `{{time}}`             | local time                        | `HH:mm`             |
| `{{subscriber.name}}`  | reading.subscriberName            | Arabic string       |
| `{{noadad}}`           | reading.noadad (account #)        | digits              |
| `{{area.name}}`        | reading.areaName                  | Arabic string       |
| `{{ks}}`               | reading.previousValue             | integer, formatted  |
| `{{kh}}`               | reading.currentValue              | integer, formatted  |
| `{{consumption}}`      | `kh - ks`                         | integer, formatted  |
| `{{notes_or_dash}}`    | reading.notes \|\| '—'            | Arabic              |
| `{{barcode_text}}`     | reading.local_uuid (8 chars)      | hex                 |

---

## 3. Number formatting

- Always use Western digits **0–9** (not Arabic-Indic) on the printed paper — the legacy app and admin team agreed on this for OCR consistency.
- Thousands separator: comma `,`. So `75000` → `75,000`.
- Currency:  `{{amount}} د.ع` (with thin space before "د.ع").
- For very large readings ( > 100000 kWh) wrap the number on its own centred line, larger size.

### Helper (TS pseudocode)
```ts
function fmt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n); // 75,000
}
function fmtIqd(n: number): string {
  return `${fmt(n)} د.ع`;
}
```

---

## 4. RTL/LTR mixing rules

| Region                | Direction | Notes                                   |
|-----------------------|-----------|-----------------------------------------|
| Field labels (Arabic) | RTL       | right-aligned                            |
| Numeric values        | LTR       | embedded in RTL line — printer puts them on the right side of the line which **visually** lands on the left because we reverse-shape before encode |
| Divider rows          | symmetric | use only `=`, `-`, `─` (mirror-safe)     |
| Title block           | centered  | always `ESC a 1`                         |

The shaper takes care of bidi: any ASCII run inside an Arabic line is kept in logical order, and the whole line is then character-reversed for the printer.

---

## 5. Variants

### 5.1 Compact mode (one-pull, ~14 lines)

Used by Settings → "نمط الإيصال" → "مختصر".

```
شركة العباسي للكهرباء
================================================
{{date}}  {{time}}
المشترك: {{subscriber.name}} ({{noadad}})
المنطقة: {{area.name}}
السابقة: {{ks}}      الحالية: {{kh}}
الاستهلاك: {{consumption}} kWh
{{collector.name}}
{{barcode}}
================================================
```

### 5.2 Warning banner (high consumption)

Inserted **after the consumption line** when `consumption > avgConsumption * 2`:
```
  ─────────────────────────────────
  ⚠ تنبيه: استهلاك مرتفع
  متوسط {{avgConsumption}} kWh
  ─────────────────────────────────
```

### 5.3 Tampered/Reset reading

Inserted when `kh < ks`:
```
  ─────────────────────────────────
  ⚠ تم إعادة ضبط العداد
  القراءة المعتمدة: {{kh}}
  ─────────────────────────────────
```

---

## 6. Test cases (5 examples)

### Test 1 — Normal residential

| Field              | Value                       |
|--------------------|-----------------------------|
| subscriber.name    | أحمد محمد العمري           |
| noadad             | 12345678                    |
| area.name          | بغداد - الكرادة             |
| ks                 | 45,230                      |
| kh                 | 45,847                      |
| consumption        | 617                         |
| notes              | (empty)                     |

### Test 2 — High consumption (warning)

| Field              | Value                       |
|--------------------|-----------------------------|
| subscriber.name    | شركة الفراتين للتجارة       |
| noadad             | 78901234                    |
| ks                 | 12,000                      |
| kh                 | 18,500                      |
| consumption        | 6,500 (avg 2,000)           |
| notes              | محل تجاري                  |
| → warning banner   | YES                         |

### Test 3 — Reset meter

| Field         | Value             |
|---------------|-------------------|
| ks            | 99,950            |
| kh            | 230               |
| consumption   | 230 (overflow accepted) |
| → reset banner| YES               |

### Test 4 — Long subscriber name (truncation)

| subscriber.name | عبد الرحمن محمد صالح عبد الله الجبوري الموسوي |
| → must wrap to two lines (max 42 chars per line @ font B) |

### Test 5 — Empty area + numeric subscriber

| subscriber.name | مشترك 1234                  |
| area.name       | (empty) → print "—"         |
| ks              | 0                           |
| kh              | 124                         |
