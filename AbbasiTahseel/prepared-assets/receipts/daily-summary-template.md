# Daily Summary — End-of-Day Report Print Template

> Printed by the collector at end of shift before handing over cash to the
> branch supervisor. Includes counts, totals per currency, and per-area
> breakdown.

---

## 1. ASCII layout (48 columns wide)

```
================================================
            شركة العباسي للكهرباء                
              {{company.branch}}                 
================================================

              تقرير يومي                         
            DAILY SUMMARY                         

------------------------------------------------
  المحصّل             : {{collector.name}}        
  رقم الموظف          : {{collector.empNo}}       
  التاريخ              : {{date}}                  
  وقت الطباعة         : {{print_time}}            
  جلسة العمل          : {{shift_start}} → {{shift_end}}
------------------------------------------------


  --- الإحصاءات العامة ---

  ┌──────────────────────────────────────┐
  │  القراءات المسجلة     :   {{readings_count}}
  │  السندات المُحرَّرة   :   {{bonds_count}}
  │  المشتركون المختلفون  :   {{unique_subs}}
  │  متوسط القراءة لكل ساعة: {{avg_per_hour}}
  └──────────────────────────────────────┘


  --- إجمالي المبالغ ---

  ─────────────────────────────────              
   المجموع بالدينار العراقي:                     (large)
       {{total_iqd}} د.ع                          
                                                
   المجموع بالدولار:                             
       {{total_usd}} $                            
  ─────────────────────────────────              


  --- تفاصيل حسب نوع الدفعة ---

  | نقد         |  {{cash_iqd}} د.ع  |  {{cash_usd}} $
  | حوالة       |  {{transfer_iqd}}  |  {{transfer_usd}}
  | تقسيط       |  {{install_iqd}}   |  {{install_usd}}
  | أخرى        |  {{other_iqd}}     |  {{other_usd}}


  --- تفاصيل حسب المنطقة ---

  | الكرادة      |  قراءات: {{area1_readings}}   |  سندات: {{area1_bonds}}   |  {{area1_amount}} د.ع
  | البياع       |  قراءات: {{area2_readings}}   |  سندات: {{area2_bonds}}   |  {{area2_amount}} د.ع
  | الجادرية     |  قراءات: {{area3_readings}}   |  سندات: {{area3_bonds}}   |  {{area3_amount}} د.ع
  | الكاظمية     |  قراءات: {{area4_readings}}   |  سندات: {{area4_bonds}}   |  {{area4_amount}} د.ع
  | المنصور      |  قراءات: {{area5_readings}}   |  سندات: {{area5_bonds}}   |  {{area5_amount}} د.ع


  --- ملاحظات ---
  {{notes_block}}


------------------------------------------------

  حالة المزامنة عند الطباعة:
    {{sync_status_label}}        (✓ مكتملة / ⚠ معلق {{pending_count}})


------------------------------------------------

  توقيع المحصّل:    ______________________

  توقيع المشرف:    ______________________

  تاريخ الاستلام:  ______________________


================================================
             نهاية التقرير                       
================================================



(feed 4 lines + cut)
```

---

## 2. Placeholders

| Token                | Source                                              |
|----------------------|-----------------------------------------------------|
| `{{collector.empNo}}`| user.employeeNumber                                  |
| `{{date}}`           | report.date (`dd/MM/yyyy`)                            |
| `{{print_time}}`     | now (`HH:mm`)                                         |
| `{{shift_start}}`    | first reading/bond timestamp of the day              |
| `{{shift_end}}`      | last activity timestamp                              |
| `{{readings_count}}` | count(readings WHERE date = today)                   |
| `{{bonds_count}}`    | count(bonds WHERE bond_date = today)                  |
| `{{unique_subs}}`    | count(distinct noadad)                                |
| `{{avg_per_hour}}`   | readings_count / hours_worked, 1 decimal              |
| `{{total_iqd}}`      | sum(payments.amount WHERE currency = IQD)            |
| `{{total_usd}}`      | sum(payments.amount WHERE currency = USD)            |
| `{{cash_iqd}}`       | sum where payment_type = cash, currency = IQD        |
| `{{transfer_*}}`     | type = transfer                                       |
| `{{install_*}}`      | type = installment                                    |
| `{{other_*}}`        | everything else (mixed/cheque/…)                      |
| `{{areaN_*}}`        | per-area aggregates                                   |
| `{{notes_block}}`    | free-text from collector (or "—")                    |
| `{{sync_status_label}}`| from syncStore                                       |
| `{{pending_count}}`  | items still queued                                    |

---

## 3. Area aggregation rule

The Area block prints **at most 8 areas** (sorted by amount desc). If there are
more, append a final line:

```
  | + باقي المناطق |  قراءات: {{n}}  |  سندات: {{n}}  |  {{sum}} د.ع
```

If the collector worked in **only one** area, replace the table with a single
line.

---

## 4. Style hierarchy

| Element              | Style                                  |
|----------------------|----------------------------------------|
| Title "تقرير يومي"   | center, GS ! 0x11, bold                |
| Section headers      | right-aligned, underlined              |
| Stats box            | left-aligned monospace, framed         |
| Grand totals         | center, GS ! 0x22, bold                |
| Tables               | left-aligned font B (48 cpl)           |
| Signature lines      | left, underlined                        |

---

## 5. Variants

### 5.1 Empty day (no activity)

If `readings_count == 0 && bonds_count == 0`:
```
              لا يوجد نشاط في هذا اليوم
              (تأكد من اختيار التاريخ الصحيح)
```
Skip all detail sections, still print header + signature.

### 5.2 Multi-day summary

If date range > 1 day, replace "تقرير يومي" with "تقرير الفترة
({{from}} → {{to}})" and add a per-day breakdown table before the area block.

### 5.3 Includes pending un-synced data

If `pending_count > 0`, add a **prominent banner** under the title:

```
  ╔══════════════════════════════════════════╗
  ║  ⚠ يوجد {{pending_count}} عمليات معلقة   ║
  ║     لم تتم مزامنتها بعد                  ║
  ║     يُنصح بمزامنة البيانات قبل التسليم    ║
  ╚══════════════════════════════════════════╝
```
