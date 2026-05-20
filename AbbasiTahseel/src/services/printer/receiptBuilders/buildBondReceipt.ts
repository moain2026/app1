/**
 * buildBondReceipt.ts — Compose ESC/POS bytes for a payment-bond receipt
 * (سند قبض). Supports multi-currency totals (IQD + USD typical).
 *
 * Source template: prepared-assets/receipts/bond-receipt-template.md
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

export type BondPaymentType = 'cash' | 'installment' | 'transfer' | 'previousBalance' | 'other';

export interface BondReceiptPayment {
  paymentType: BondPaymentType;
  amount: number;
  currencyCode: string; // 'IQD' | 'USD'
  currencySymbol: string; // 'د.ع' | '$'
  description?: string | null;
}

export interface BondReceiptInput {
  bond: {
    localUuid: string;
    num: number;
    bondDate: Date;
    notes?: string | null;
  };
  subscriber: {
    noadad: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    previousBalance: number;
    newBalance: number;
  };
  payments: readonly BondReceiptPayment[];
  collector: {
    fullName: string;
    employeeNumber: string;
  };
  company: {
    name: string;
    branch: string;
  };
  printedAt: Date;
  isReprint?: boolean;
  reprintNumber?: number;
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

function fmt(n: number): string {
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

function labeledLine(label: string, value: string): string {
  return `${label} : ${value}`;
}

const PAYMENT_TYPE_LABELS: Readonly<Record<BondPaymentType, string>> = {
  cash: 'نقد',
  installment: 'تقسيط',
  transfer: 'حوالة',
  previousBalance: 'رصيد سابق',
  other: 'أخرى',
};

// ─── Totals computation ──────────────────────────────────────────────────────

function aggregateByCurrency(
  payments: readonly BondReceiptPayment[],
): { code: string; symbol: string; total: number }[] {
  const map = new Map<string, { code: string; symbol: string; total: number }>();
  for (const p of payments) {
    const existing = map.get(p.currencyCode);
    if (existing !== undefined) {
      existing.total += p.amount;
    } else {
      map.set(p.currencyCode, {
        code: p.currencyCode,
        symbol: p.currencySymbol,
        total: p.amount,
      });
    }
  }
  // Sort: IQD first, USD second, then others alphabetically.
  const out = Array.from(map.values());
  out.sort((a, b) => {
    if (a.code === 'IQD') {
      return -1;
    }
    if (b.code === 'IQD') {
      return 1;
    }
    if (a.code === 'USD') {
      return -1;
    }
    if (b.code === 'USD') {
      return 1;
    }
    return a.code.localeCompare(b.code);
  });
  return out;
}

// ─── Main builder ────────────────────────────────────────────────────────────

export function buildBondReceipt(input: BondReceiptInput): Uint8Array {
  const parts: Uint8Array[] = [];

  parts.push(initPrinter());
  parts.push(selectCp1256());

  // 1. Company header.
  parts.push(
    printText(input.company.name, {
      align: 'center',
      bold: true,
      size: 'large',
    }),
  );
  parts.push(printText(input.company.branch, { align: 'center' }));
  parts.push(printLine('=', 48));

  // 2. Title.
  parts.push(
    printText('سند قبض', {
      align: 'center',
      bold: true,
      size: 'large',
    }),
  );

  // 2b. Reprint banner (if applicable).
  if (input.isReprint === true) {
    const reprintNo = input.reprintNumber ?? 1;
    parts.push(
      printText(`*** نسخة طبق الأصل — رقم ${fmt(reprintNo)} ***`, {
        align: 'center',
        bold: true,
      }),
    );
  }
  parts.push(printLine('-', 48));

  // 3. Bond / collector block.
  parts.push(
    printText(labeledLine('رقم السند', fmt(input.bond.num)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('التاريخ', fmtDate(input.bond.bondDate)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('الوقت', fmtTime(input.bond.bondDate)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('المحصّل', input.collector.fullName), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('رقم الموظف', input.collector.employeeNumber), {
      align: 'right',
    }),
  );

  // 4. Subscriber block.
  parts.push(printLine('-', 48));
  parts.push(
    printText(labeledLine('المشترك', input.subscriber.name), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('رقم العداد', input.subscriber.noadad), {
      align: 'right',
    }),
  );
  if (input.subscriber.phone !== null && input.subscriber.phone !== undefined && input.subscriber.phone !== '') {
    parts.push(
      printText(labeledLine('الهاتف', input.subscriber.phone), {
        align: 'right',
      }),
    );
  }
  if (input.subscriber.address !== null && input.subscriber.address !== undefined && input.subscriber.address !== '') {
    parts.push(
      printText(labeledLine('العنوان', input.subscriber.address), {
        align: 'right',
      }),
    );
  }
  parts.push(
    printText(labeledLine('الرصيد السابق', fmt(input.subscriber.previousBalance)), {
      align: 'right',
    }),
  );

  // 5. Payment details.
  parts.push(printLine('-', 48));
  parts.push(
    printText('تفاصيل الدفعات:', { align: 'right', bold: true }),
  );
  for (const p of input.payments) {
    const typeLabel = PAYMENT_TYPE_LABELS[p.paymentType];
    const line = `${typeLabel} | ${fmt(p.amount)} ${p.currencySymbol}`;
    parts.push(printText(line, { align: 'right' }));
    if (p.description !== null && p.description !== undefined && p.description !== '') {
      parts.push(
        printText(`  (${p.description})`, { align: 'right' }),
      );
    }
  }

  // 6. Grand totals (one line per currency).
  parts.push(printLine('─', 48));
  parts.push(printText('المجموع', { align: 'center', bold: true }));
  const totals = aggregateByCurrency(input.payments);
  for (const t of totals) {
    parts.push(
      printText(`${fmt(t.total)} ${t.symbol}`, {
        align: 'center',
        bold: true,
        size: 'xlarge',
      }),
    );
  }
  parts.push(printLine('─', 48));

  // 7. Notes (if any).
  if (input.bond.notes !== null && input.bond.notes !== undefined && input.bond.notes !== '') {
    parts.push(
      printText(labeledLine('ملاحظات', input.bond.notes), { align: 'right' }),
    );
  }

  // 8. New balance.
  parts.push(printLine('-', 48));
  parts.push(
    printText(labeledLine('الرصيد الجديد', fmt(input.subscriber.newBalance)), {
      align: 'right',
      bold: true,
    }),
  );

  // 9. Verification barcode (CODE128).
  parts.push(printLine('-', 48));
  parts.push(printText('كود التحقق:', { align: 'center' }));
  const hash6 = input.bond.localUuid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  const barcodeData = `B-${fmt(input.bond.num)}-${hash6}`.replace(/[^A-Z0-9-]/g, '');
  parts.push(printBarcode(barcodeData));

  // 10. Footer + cut.
  parts.push(printLine('=', 48));
  parts.push(printText('شكراً لتعاونكم', { align: 'center' }));
  parts.push(printText('توقيع المحصّل: ______________', { align: 'left' }));
  parts.push(feedLines(3));
  parts.push(cutPaper());

  return concatBytes(...parts);
}
