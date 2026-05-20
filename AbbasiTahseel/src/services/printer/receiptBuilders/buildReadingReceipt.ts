/**
 * buildReadingReceipt.ts — Compose ESC/POS bytes for a meter-reading receipt.
 *
 * Layout (48 cpl, font B, cp1256 Arabic, right-aligned body):
 *
 *   ============== company.name + branch ===============
 *                     إيصال قراءة
 *   ───────────────────────────────────────────────────
 *   المحصّل             : {fullName}
 *   التاريخ              : dd/MM/yyyy
 *   الوقت                : HH:mm
 *   ───────────────────────────────────────────────────
 *   المشترك              : {customer name}
 *   رقم العداد           : {noadad}
 *   المنطقة              : {area}
 *   ───────────────────────────────────────────────────
 *   القراءة السابقة      : {ks}
 *   القراءة الحالية      : {kh}
 *   الاستهلاك (kWh)      : {kh-ks}      (bold)
 *   ───────────────────────────────────────────────────
 *   [warning banner if over-consumption]
 *   ملاحظات: {notes or '—'}
 *
 *   [CODE128 barcode of local_uuid first 8 chars, centered]
 *
 *                  شكراً لتعاونكم
 *   ───────────────────────────────────────────────────
 *   (feed 3 + cut)
 *
 * Source template: prepared-assets/receipts/reading-receipt-template.md
 */

import {
  concatBytes,
  cutPaper,
  feedLines,
  initPrinter,
  printBarcode,
  printLine,
  printText,
  selectCp1256,
} from '../escposBuilder';

// ─── Public input shape ──────────────────────────────────────────────────────

export interface ReadingReceiptInput {
  reading: {
    localUuid: string;
    noadad: string;
    customerName: string;
    customerAlias: string | null;
    areaName: string | null;
    previousValue: number; // ks
    currentValue: number; // kh
    expectedConsumption: number; // asts (for over-consumption warning)
    notes?: string | null;
  };
  collector: {
    fullName: string;
    employeeNumber: string;
  };
  company: {
    name: string;
    branch: string;
  };
  printedAt: Date;
}

// ─── Number formatting ───────────────────────────────────────────────────────

function fmt(n: number): string {
  // Always Western digits + comma thousands separator (printer-OCR convention).
  return new Intl.NumberFormat('en-US').format(n);
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─── Pad helper for "label : value" right-aligned rows ───────────────────────

/**
 * Compose a single line where the LEFT part is the value and the RIGHT part
 * is the label (because the printer renders cp1256 reversed for RTL). We
 * actually return "label : value" because the Arabic shaper reverses the
 * whole string when encoding — the visual result on paper is value on the
 * left and label on the right, which is what we want for an Arabic receipt.
 */
function labeledLine(label: string, value: string): string {
  return `${label} : ${value}`;
}

// ─── Main builder ────────────────────────────────────────────────────────────

export function buildReadingReceipt(input: ReadingReceiptInput): Uint8Array {
  const parts: Uint8Array[] = [];

  // 1. Init + Arabic code page.
  parts.push(initPrinter());
  parts.push(selectCp1256());

  // 2. Company header (centered, large bold).
  parts.push(
    printText(input.company.name, {
      align: 'center',
      bold: true,
      size: 'large',
    }),
  );
  parts.push(printText(input.company.branch, { align: 'center' }));
  parts.push(printLine('=', 48));

  // 3. Title.
  parts.push(
    printText('إيصال قراءة', {
      align: 'center',
      bold: true,
      size: 'large',
    }),
  );
  parts.push(printLine('-', 48));

  // 4. Collector / device / date block.
  const consumption = input.reading.currentValue - input.reading.previousValue;
  parts.push(
    printText(labeledLine('المحصّل', input.collector.fullName), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('رقم الجهاز', input.collector.employeeNumber), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('التاريخ', fmtDate(input.printedAt)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('الوقت', fmtTime(input.printedAt)), {
      align: 'right',
    }),
  );

  // 5. Subscriber block.
  parts.push(printLine('-', 48));
  parts.push(
    printText(labeledLine('المشترك', input.reading.customerName), {
      align: 'right',
    }),
  );
  if (input.reading.customerAlias !== null) {
    parts.push(
      printText(labeledLine('الاسم البديل', input.reading.customerAlias), {
        align: 'right',
      }),
    );
  }
  parts.push(
    printText(labeledLine('رقم العداد', input.reading.noadad), {
      align: 'right',
    }),
  );
  if (input.reading.areaName !== null) {
    parts.push(
      printText(labeledLine('المنطقة', input.reading.areaName), {
        align: 'right',
      }),
    );
  }

  // 6. Readings block.
  parts.push(printLine('-', 48));
  parts.push(
    printText(labeledLine('القراءة السابقة', fmt(input.reading.previousValue)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('القراءة الحالية', fmt(input.reading.currentValue)), {
      align: 'right',
    }),
  );
  parts.push(printLine('─', 48));
  parts.push(
    printText(labeledLine('الاستهلاك (kWh)', fmt(consumption)), {
      align: 'right',
      bold: true,
      size: 'large',
    }),
  );

  // 7. Over-consumption warning.
  if (
    input.reading.expectedConsumption > 0 &&
    consumption > input.reading.expectedConsumption
  ) {
    parts.push(printLine(' ', 0));
    parts.push(
      printText('⚠ تنبيه: استهلاك يتجاوز المتوقع', {
        align: 'center',
        bold: true,
      }),
    );
  }

  // 8. Notes.
  parts.push(printLine('-', 48));
  parts.push(
    printText(
      labeledLine('ملاحظات', input.reading.notes ?? '—'),
      { align: 'right' },
    ),
  );

  // 9. Barcode (first 8 chars of UUID, uppercase, alpha-num only).
  parts.push(printLine('-', 48));
  parts.push(
    printText('كود التحقق:', { align: 'center', bold: false }),
  );
  const barcodeData = input.reading.localUuid
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 12)
    .toUpperCase();
  parts.push(printBarcode(barcodeData));

  // 10. Footer + cut.
  parts.push(printText('شكراً لتعاونكم', { align: 'center' }));
  parts.push(feedLines(3));
  parts.push(cutPaper());

  return concatBytes(...parts);
}
