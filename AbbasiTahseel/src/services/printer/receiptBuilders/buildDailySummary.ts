/**
 * buildDailySummary.ts — Compose ESC/POS bytes for an end-of-day collector
 * summary report. Includes counts, multi-currency totals, payment-type
 * breakdown, and per-area aggregation.
 *
 * Source template: prepared-assets/receipts/daily-summary-template.md
 */

import {
  concatBytes,
  cutPaper,
  feedLines,
  initPrinter,
  printLine,
  printText,
  selectCp1256,
} from '../escposBuilder';

// ─── Public input shape ──────────────────────────────────────────────────────

export interface DailySummaryAreaStats {
  areaName: string;
  readingsCount: number;
  bondsCount: number;
  totalAmountIqd: number;
}

export interface DailySummaryPaymentTypeTotals {
  cashIqd: number;
  cashUsd: number;
  installmentIqd: number;
  installmentUsd: number;
  transferIqd: number;
  transferUsd: number;
  otherIqd: number;
  otherUsd: number;
}

export interface DailySummaryInput {
  collector: {
    fullName: string;
    employeeNumber: string;
  };
  company: {
    name: string;
    branch: string;
  };
  reportDate: Date;
  printedAt: Date;
  shiftStart: Date | null;
  shiftEnd: Date | null;
  stats: {
    readingsCount: number;
    bondsCount: number;
    uniqueSubscribers: number;
  };
  totals: {
    totalIqd: number;
    totalUsd: number;
  };
  paymentTypeTotals: DailySummaryPaymentTypeTotals;
  areas: readonly DailySummaryAreaStats[];
  notes?: string | null;
  syncStatus: {
    pendingCount: number;
    failedCount: number;
  };
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function fmt2(n: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
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

function avgPerHour(count: number, start: Date | null, end: Date | null): string {
  if (start === null || end === null) {
    return '—';
  }
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) {
    return '—';
  }
  const hours = ms / (1000 * 60 * 60);
  if (hours <= 0) {
    return '—';
  }
  return (count / hours).toFixed(1);
}

// ─── Main builder ────────────────────────────────────────────────────────────

export function buildDailySummary(input: DailySummaryInput): Uint8Array {
  const parts: Uint8Array[] = [];

  parts.push(initPrinter());
  parts.push(selectCp1256());

  // 1. Header.
  parts.push(printLine('=', 48));
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
    printText('تقرير يومي', {
      align: 'center',
      bold: true,
      size: 'large',
    }),
  );

  // 2b. Pending-sync banner.
  if (input.syncStatus.pendingCount > 0) {
    parts.push(printLine('-', 48));
    parts.push(
      printText(
        `⚠ يوجد ${fmt(input.syncStatus.pendingCount)} عمليات معلقة لم تتم مزامنتها`,
        { align: 'center', bold: true },
      ),
    );
    parts.push(
      printText('يُنصح بمزامنة البيانات قبل التسليم', { align: 'center' }),
    );
  }
  parts.push(printLine('-', 48));

  // 3. Collector / date block.
  parts.push(
    printText(labeledLine('المحصّل', input.collector.fullName), { align: 'right' }),
  );
  parts.push(
    printText(labeledLine('رقم الموظف', input.collector.employeeNumber), { align: 'right' }),
  );
  parts.push(
    printText(labeledLine('التاريخ', fmtDate(input.reportDate)), { align: 'right' }),
  );
  parts.push(
    printText(labeledLine('وقت الطباعة', fmtTime(input.printedAt)), { align: 'right' }),
  );
  if (input.shiftStart !== null && input.shiftEnd !== null) {
    parts.push(
      printText(
        labeledLine('جلسة العمل', `${fmtTime(input.shiftStart)} → ${fmtTime(input.shiftEnd)}`),
        { align: 'right' },
      ),
    );
  }

  // 4. Empty-day branch.
  if (input.stats.readingsCount === 0 && input.stats.bondsCount === 0) {
    parts.push(printLine('-', 48));
    parts.push(
      printText('لا يوجد نشاط في هذا اليوم', { align: 'center', bold: true }),
    );
    parts.push(
      printText('(تأكد من اختيار التاريخ الصحيح)', { align: 'center' }),
    );
    parts.push(printLine('=', 48));
    parts.push(printText('توقيع المحصّل: ______________', { align: 'left' }));
    parts.push(feedLines(3));
    parts.push(cutPaper());
    return concatBytes(...parts);
  }

  // 5. General statistics.
  parts.push(printLine('-', 48));
  parts.push(printText('--- الإحصاءات العامة ---', { align: 'right', bold: true }));
  parts.push(
    printText(labeledLine('القراءات المسجلة', fmt(input.stats.readingsCount)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('السندات المُحرَّرة', fmt(input.stats.bondsCount)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(labeledLine('المشتركون المختلفون', fmt(input.stats.uniqueSubscribers)), {
      align: 'right',
    }),
  );
  parts.push(
    printText(
      labeledLine(
        'متوسط القراءة لكل ساعة',
        avgPerHour(input.stats.readingsCount, input.shiftStart, input.shiftEnd),
      ),
      { align: 'right' },
    ),
  );

  // 6. Grand totals.
  parts.push(printLine('─', 48));
  parts.push(printText('--- إجمالي المبالغ ---', { align: 'right', bold: true }));
  parts.push(
    printText(`${fmt(input.totals.totalIqd)} د.ع`, {
      align: 'center',
      bold: true,
      size: 'xlarge',
    }),
  );
  if (input.totals.totalUsd > 0) {
    parts.push(
      printText(`${fmt2(input.totals.totalUsd)} $`, {
        align: 'center',
        bold: true,
        size: 'xlarge',
      }),
    );
  }
  parts.push(printLine('─', 48));

  // 7. By payment type.
  parts.push(printText('--- تفاصيل حسب نوع الدفعة ---', { align: 'right', bold: true }));
  const pt = input.paymentTypeTotals;
  const row = (label: string, iqd: number, usd: number): string =>
    `${label} | ${fmt(iqd)} د.ع | ${fmt2(usd)} $`;
  parts.push(printText(row('نقد', pt.cashIqd, pt.cashUsd), { align: 'right' }));
  parts.push(printText(row('حوالة', pt.transferIqd, pt.transferUsd), { align: 'right' }));
  parts.push(printText(row('تقسيط', pt.installmentIqd, pt.installmentUsd), { align: 'right' }));
  parts.push(printText(row('أخرى', pt.otherIqd, pt.otherUsd), { align: 'right' }));

  // 8. By area (top 8 by amount, then "remaining" if more).
  if (input.areas.length > 0) {
    parts.push(printLine('-', 48));
    parts.push(printText('--- تفاصيل حسب المنطقة ---', { align: 'right', bold: true }));
    const sorted = [...input.areas].sort((a, b) => b.totalAmountIqd - a.totalAmountIqd);
    const top = sorted.slice(0, 8);
    for (const a of top) {
      parts.push(
        printText(
          `${a.areaName} | قراءات: ${fmt(a.readingsCount)} | سندات: ${fmt(a.bondsCount)} | ${fmt(a.totalAmountIqd)} د.ع`,
          { align: 'right' },
        ),
      );
    }
    if (sorted.length > 8) {
      const rest = sorted.slice(8);
      const restReadings = rest.reduce((s, a) => s + a.readingsCount, 0);
      const restBonds = rest.reduce((s, a) => s + a.bondsCount, 0);
      const restAmount = rest.reduce((s, a) => s + a.totalAmountIqd, 0);
      parts.push(
        printText(
          `+ باقي المناطق | قراءات: ${fmt(restReadings)} | سندات: ${fmt(restBonds)} | ${fmt(restAmount)} د.ع`,
          { align: 'right' },
        ),
      );
    }
  }

  // 9. Notes.
  parts.push(printLine('-', 48));
  parts.push(
    printText(labeledLine('ملاحظات', input.notes ?? '—'), { align: 'right' }),
  );

  // 10. Sync status footer.
  parts.push(printLine('-', 48));
  const syncLabel =
    input.syncStatus.pendingCount === 0 && input.syncStatus.failedCount === 0
      ? '✓ مكتملة'
      : `⚠ معلق ${fmt(input.syncStatus.pendingCount)} | فشل ${fmt(input.syncStatus.failedCount)}`;
  parts.push(
    printText(labeledLine('حالة المزامنة', syncLabel), { align: 'right' }),
  );

  // 11. Signature block.
  parts.push(printLine('-', 48));
  parts.push(printText('توقيع المحصّل:  ______________', { align: 'left' }));
  parts.push(printText('توقيع المشرف:  ______________', { align: 'left' }));
  parts.push(printText('تاريخ الاستلام: ______________', { align: 'left' }));

  // 12. Footer + cut.
  parts.push(printLine('=', 48));
  parts.push(printText('نهاية التقرير', { align: 'center', bold: true }));
  parts.push(printLine('=', 48));
  parts.push(feedLines(4));
  parts.push(cutPaper());

  return concatBytes(...parts);
}
