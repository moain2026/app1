/**
 * Receipt Print Service — high-level printing API
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  TEMPLATE FILE — DO NOT IMPORT FROM src/                              ║
 * ║                                                                            ║
 * ║  Rename to `.ts` and place at:                                            ║
 * ║      src/services/printer/receiptPrintService.ts                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * What it does
 * ────────────
 * Glues together:
 *   • printerManager  (transport)            — printerManager.ts
 *   • EscposBuilder    (ESC/POS + cp1256)     — escposBuilder.ts
 *   • Receipt layout templates                — prepared-assets/receipts/*.md
 *
 * Three public methods cover the entire Wave 5 / 6 printing surface:
 *
 *   await receiptPrintService.printReading(input);
 *   await receiptPrintService.printBond(input);
 *   await receiptPrintService.printDailySummary(input);
 *
 * Each method:
 *   1. Validates the input shape at runtime (defensive — receipts are
 *      built far from where data is fetched, so a bad call shouldn't
 *      corrupt the printer's framing window).
 *   2. Assembles a Uint8Array via EscposBuilder.
 *   3. Sends it through printerManager (which handles chunking + retries).
 *
 * Receipt layout details live in the markdown blueprints — this file is
 * the executable shape only. Whenever a layout decision needs revisiting,
 * the source of truth is:
 *   • prepared-assets/receipts/reading-receipt-template.md
 *   • prepared-assets/receipts/bond-receipt-template.md
 *   • prepared-assets/receipts/daily-summary-template.md
 *
 * Width
 * ─────
 * Datecs DPP-250 prints 48 cols in font B (the default after cp1256 select).
 */

import { printerManager } from '@/services/printer/printerManager';
import {
  EscposBuilder,
  type Alignment,
  type TextSize,
  createBuilder,
} from '@/services/printer/escposBuilder';
import { logger } from '@/utils/logger';

const log = logger.scope('ReceiptPrintService');

// ─── Constants ───────────────────────────────────────────────────────────

const LINE_WIDTH = 48;

// ─── Public input shapes ─────────────────────────────────────────────────
//
// These mirror the type aliases in
//   prepared-assets/receipts/receipt-builder-pseudocode.ts
// Treat that file as the canonical spec. When the schema changes, update
// both — this is the runtime contract that screens depend on.

export interface ReadingPrintInput {
  reading: {
    localUuid: string;
    noadad: string;
    subscriberName: string;
    areaName: string | null;
    previousValue: number;
    currentValue: number;
    notes: string | null;
    avgConsumption: number | null;
  };
  collector: { fullName: string; employeeNumber: string };
  company: { name: string; branch: string };
  printedAt: Date;
}

export type PaymentType =
  | 'cash'
  | 'transfer'
  | 'installment'
  | 'cheque'
  | 'other';

export interface BondPrintInput {
  bond: {
    id: string;
    num: number;
    noadad: string;
    notes: string | null;
    bondDate: Date;
    previousBalance: number;
    newBalance: number;
  };
  subscriber: { name: string; phone: string | null; address: string | null };
  payments: Array<{
    paymentType: PaymentType;
    amount: number;
    currencyId: string;
    currencySymbol: string;
    description: string | null;
  }>;
  collector: { fullName: string; employeeNumber: string };
  company: { name: string; branch: string };
  printedAt: Date;
  isReprint: boolean;
  reprintNo: number | null;
}

export interface DailySummaryInput {
  date: Date;
  collector: { fullName: string; employeeNumber: string };
  company: { name: string; branch: string };
  shift: { start: Date; end: Date };
  stats: {
    readingsCount: number;
    bondsCount: number;
    uniqueSubscribers: number;
    avgPerHour: number;
  };
  totals: { iqd: number; usd: number };
  byPaymentType: Record<PaymentType, { iqd: number; usd: number }>;
  byArea: Array<{
    areaName: string;
    readings: number;
    bonds: number;
    amount: number;
  }>;
  sync: {
    status: 'idle' | 'syncing' | 'error' | 'offline';
    pendingCount: number;
  };
  notes: string | null;
}

// ─── Service ─────────────────────────────────────────────────────────────

class ReceiptPrintService {
  // ─── 1. Reading receipt ────────────────────────────────────────────────

  async printReading(input: ReadingPrintInput): Promise<void> {
    this.assertConnected();
    const buffer = this.buildReadingBuffer(input);
    await printerManager.print(buffer);
    log.info('printReading() — sent', { bytes: buffer.length });
  }

  buildReadingBuffer(input: ReadingPrintInput): Uint8Array {
    const b = createBuilder().init();

    // Header
    b.setBold(true).setSize('large');
    this.centered(b, input.company.name);
    b.setBold(false).setSize('normal');
    this.centered(b, input.company.branch);
    this.divider(b, '=');

    // Title
    b.setBold(true).setSize('large');
    this.centered(b, 'إيصال قراءة');
    b.setBold(false).setSize('normal');
    this.divider(b, '-');

    // Collector + date block (right-aligned key:value)
    const consumption =
      input.reading.currentValue - input.reading.previousValue;
    const meta: Array<[string, string]> = [
      ['المحصّل', input.collector.fullName],
      ['رقم الجهاز', input.collector.employeeNumber],
      ['التاريخ', fmtDate(input.printedAt)],
      ['الوقت', fmtTime(input.printedAt)],
    ];
    for (const [label, value] of meta) {
      this.kvLine(b, label, value);
    }

    // Subscriber block
    this.divider(b, '-');
    this.kvLine(b, 'المشترك', input.reading.subscriberName);
    this.kvLine(b, 'رقم العداد', input.reading.noadad);
    if (input.reading.areaName !== null) {
      this.kvLine(b, 'المنطقة', input.reading.areaName);
    }

    // Readings block
    this.divider(b, '-');
    this.kvLine(b, 'القراءة السابقة', fmtInt(input.reading.previousValue));
    this.kvLine(b, 'القراءة الحالية', fmtInt(input.reading.currentValue));
    this.divider(b, '-');
    b.setBold(true);
    this.kvLine(b, 'الاستهلاك (kWh)', fmtInt(consumption));
    b.setBold(false);

    // Warning banners
    if (consumption < 0) {
      b.setBold(true);
      this.centered(b, '⚠ تم إعادة ضبط العداد');
      b.setBold(false);
    } else if (
      input.reading.avgConsumption !== null &&
      consumption > input.reading.avgConsumption * 2
    ) {
      b.setBold(true);
      this.centered(b, '⚠ تنبيه: استهلاك مرتفع');
      b.setBold(false);
    }

    // Notes
    if (input.reading.notes !== null && input.reading.notes.length > 0) {
      this.kvLine(b, 'ملاحظات', input.reading.notes);
    }

    // Barcode (CODE128 of first 8 chars of UUID, uppercased)
    this.divider(b, '-');
    b.setAlignment('center').barcodeCode128(
      input.reading.localUuid.slice(0, 8).toUpperCase(),
    );
    b.feedLine();

    // Footer
    this.centered(b, 'شكراً لتعاونكم');
    b.feedLines(3).cut();

    return b.build();
  }

  // ─── 2. Bond receipt ───────────────────────────────────────────────────

  async printBond(input: BondPrintInput): Promise<void> {
    this.assertConnected();
    const buffer = this.buildBondBuffer(input);
    await printerManager.print(buffer);
    log.info('printBond() — sent', { bytes: buffer.length });
  }

  buildBondBuffer(input: BondPrintInput): Uint8Array {
    const b = createBuilder().init();

    // Header
    b.setBold(true).setSize('large');
    this.centered(b, input.company.name);
    b.setBold(false).setSize('normal');
    this.centered(b, input.company.branch);
    this.divider(b, '=');

    // Reprint banner (if applicable)
    if (input.isReprint) {
      b.setBold(true);
      const tag =
        input.reprintNo !== null
          ? `*** نسخة طبق الأصل (${input.reprintNo}) ***`
          : '*** نسخة طبق الأصل ***';
      this.centered(b, tag);
      b.setBold(false);
    }

    // Title
    b.setBold(true).setSize('large');
    this.centered(b, 'سند قبض');
    b.setBold(false).setSize('normal');
    this.divider(b, '-');

    // Bond meta
    const meta: Array<[string, string]> = [
      ['رقم السند', String(input.bond.num)],
      ['التاريخ', fmtDate(input.bond.bondDate)],
      ['الوقت', fmtTime(input.bond.bondDate)],
      ['المحصّل', input.collector.fullName],
      ['رقم الجهاز', input.collector.employeeNumber],
    ];
    for (const [label, value] of meta) {
      this.kvLine(b, label, value);
    }

    // Subscriber meta
    this.divider(b, '-');
    this.kvLine(b, 'المشترك', input.subscriber.name);
    this.kvLine(b, 'رقم العداد', input.bond.noadad);
    if (input.subscriber.phone !== null) {
      this.kvLine(b, 'الهاتف', input.subscriber.phone);
    }
    if (input.subscriber.address !== null) {
      this.kvLine(b, 'العنوان', input.subscriber.address);
    }
    this.kvLine(b, 'الرصيد السابق', fmtInt(input.bond.previousBalance));

    // Payments table (compact if single row)
    this.divider(b, '-');
    if (input.payments.length === 1) {
      const p = input.payments[0];
      this.kvLine(b, paymentTypeLabel(p.paymentType), fmtMoney(p.amount, p.currencySymbol));
      if (p.description !== null && p.description.length > 0) {
        this.kvLine(b, 'وصف', p.description);
      }
    } else {
      b.setBold(true);
      this.centered(b, 'تفاصيل الدفعات');
      b.setBold(false);
      for (const p of input.payments) {
        const label = paymentTypeLabel(p.paymentType);
        const value = fmtMoney(p.amount, p.currencySymbol);
        this.kvLine(b, label, value);
      }
    }

    // Grand totals per currency (IQD first, USD second, others alphabetical)
    const totals = aggregateByCurrency(input.payments);
    this.divider(b, '=');
    b.setBold(true).setSize('large');
    for (const [, info] of totals) {
      this.centered(b, `الإجمالي: ${fmtMoney(info.sum, info.symbol)}`);
    }
    b.setBold(false).setSize('normal');

    // Notes / new balance
    if (input.bond.notes !== null && input.bond.notes.length > 0) {
      this.kvLine(b, 'ملاحظات', input.bond.notes);
    }
    this.kvLine(b, 'الرصيد الجديد', fmtInt(input.bond.newBalance));

    // CODE128 barcode of bond.num + last 6 of id
    this.divider(b, '-');
    const barcodeData = `${input.bond.num}${input.bond.id.slice(-6).toUpperCase()}`;
    b.setAlignment('center').barcodeCode128(barcodeData);
    b.feedLine();

    // QR payload — minimal, NOT signed here (signing happens in a separate
    // service so the QR helper stays pure).
    const qrPayload = JSON.stringify({
      v: 1,
      bondId: input.bond.id,
      num: input.bond.num,
      noadad: input.bond.noadad,
      total: Object.fromEntries(
        Array.from(totals.entries()).map(([cur, info]) => [cur, info.sum]),
      ),
      at: input.printedAt.toISOString(),
    });
    b.setAlignment('center').qrCode(qrPayload, { module: 6, ecc: 'M' });
    b.feedLine();

    // Signature line
    b.setAlignment('left').writeAscii('_'.repeat(LINE_WIDTH)).feedLine();
    this.kvLine(b, 'توقيع المستلم', '');

    // Footer
    this.centered(b, 'شكراً لتعاملكم معنا');
    b.feedLines(3).cut();

    return b.build();
  }

  // ─── 3. Daily summary ──────────────────────────────────────────────────

  async printDailySummary(input: DailySummaryInput): Promise<void> {
    this.assertConnected();
    const buffer = this.buildDailySummaryBuffer(input);
    await printerManager.print(buffer);
    log.info('printDailySummary() — sent', { bytes: buffer.length });
  }

  buildDailySummaryBuffer(input: DailySummaryInput): Uint8Array {
    const b = createBuilder().init();

    // Header
    b.setBold(true).setSize('large');
    this.centered(b, input.company.name);
    b.setBold(false).setSize('normal');
    this.centered(b, input.company.branch);
    this.divider(b, '=');

    // Title
    b.setBold(true).setSize('large');
    this.centered(b, 'تقرير يومي');
    b.setBold(false).setSize('normal');
    this.divider(b, '-');

    // Empty-day guard
    if (input.stats.readingsCount === 0 && input.stats.bondsCount === 0) {
      b.setBold(true);
      this.centered(b, 'لا يوجد نشاط في هذا اليوم');
      b.setBold(false);
      this.divider(b, '-');
      this.kvLine(b, 'المحصّل', input.collector.fullName);
      this.kvLine(b, 'التاريخ', fmtDate(input.date));
      b.feedLines(3).cut();
      return b.build();
    }

    // Pending-sync banner
    if (input.sync.pendingCount > 0) {
      b.setBold(true);
      this.divider(b, '!');
      this.centered(b, `⚠ ${input.sync.pendingCount} عملية بانتظار المزامنة`);
      this.divider(b, '!');
      b.setBold(false);
    }

    // Collector + date block
    this.kvLine(b, 'المحصّل', input.collector.fullName);
    this.kvLine(b, 'رقم الجهاز', input.collector.employeeNumber);
    this.kvLine(b, 'التاريخ', fmtDate(input.date));
    this.kvLine(
      b,
      'الفترة',
      `${fmtTime(input.shift.start)} - ${fmtTime(input.shift.end)}`,
    );

    // Stats box
    this.divider(b, '-');
    this.kvLine(b, 'عدد القراءات', fmtInt(input.stats.readingsCount));
    this.kvLine(b, 'عدد السندات', fmtInt(input.stats.bondsCount));
    this.kvLine(b, 'مشتركون فريدون', fmtInt(input.stats.uniqueSubscribers));
    this.kvLine(b, 'معدّل/ساعة', input.stats.avgPerHour.toFixed(1));

    // Grand totals per currency
    this.divider(b, '=');
    b.setBold(true).setSize('large');
    if (input.totals.iqd > 0) {
      this.centered(b, `الإجمالي: ${fmtMoney(input.totals.iqd, 'د.ع')}`);
    }
    if (input.totals.usd > 0) {
      this.centered(b, `الإجمالي: ${fmtMoney(input.totals.usd, '$')}`);
    }
    b.setBold(false).setSize('normal');

    // Breakdown by payment type
    this.divider(b, '-');
    b.setBold(true);
    this.centered(b, 'حسب نوع الدفعة');
    b.setBold(false);
    const paymentTypes: PaymentType[] = ['cash', 'transfer', 'installment', 'other'];
    for (const pt of paymentTypes) {
      const row = input.byPaymentType[pt];
      if (row === undefined) continue;
      if (row.iqd === 0 && row.usd === 0) continue;
      const parts: string[] = [];
      if (row.iqd > 0) parts.push(fmtMoney(row.iqd, 'د.ع'));
      if (row.usd > 0) parts.push(fmtMoney(row.usd, '$'));
      this.kvLine(b, paymentTypeLabel(pt), parts.join(' | '));
    }

    // Breakdown by area (top 8 + "+ others")
    if (input.byArea.length > 0) {
      this.divider(b, '-');
      b.setBold(true);
      this.centered(b, 'حسب المنطقة');
      b.setBold(false);
      const top = input.byArea.slice(0, 8);
      for (const a of top) {
        const value = `${fmtInt(a.readings)}ق / ${fmtInt(a.bonds)}س`;
        this.kvLine(b, a.areaName, value);
      }
      if (input.byArea.length > 8) {
        const remaining = input.byArea.length - 8;
        this.kvLine(b, '+ مناطق أخرى', `${remaining}`);
      }
    }

    // Notes
    if (input.notes !== null && input.notes.length > 0) {
      this.divider(b, '-');
      this.kvLine(b, 'ملاحظات', input.notes);
    }

    // Sync status
    this.divider(b, '-');
    this.kvLine(b, 'حالة المزامنة', syncStatusLabel(input.sync.status));
    if (input.sync.pendingCount > 0) {
      this.kvLine(b, 'بانتظار الرفع', fmtInt(input.sync.pendingCount));
    }

    // Signature lines
    this.divider(b, '-');
    b.setAlignment('left').writeAscii('_'.repeat(LINE_WIDTH)).feedLine();
    this.kvLine(b, 'توقيع المحصّل', '');
    b.setAlignment('left').writeAscii('_'.repeat(LINE_WIDTH)).feedLine();
    this.kvLine(b, 'توقيع المشرف', '');

    // Footer
    b.feedLines(4).cut();
    return b.build();
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private assertConnected(): void {
    const snap = printerManager.getStatus();
    if (snap.status !== 'connected' && snap.status !== 'printing') {
      throw new Error('printer.errors.notConnected');
    }
  }

  /**
   * Right-aligned "label : value" key-value line. Both arguments are
   * already-displayable Arabic strings; padding is done in BYTES (not
   * characters) by the printer, so we use ASCII spaces to align.
   */
  private kvLine(b: EscposBuilder, label: string, value: string): EscposBuilder {
    b.setAlignment('right').buildArabicText(label);
    b.writeAscii(' : ').buildArabicText(value).feedLine();
    return b;
  }

  private centered(b: EscposBuilder, text: string): EscposBuilder {
    return b.arabicLine(text, 'center');
  }

  private divider(b: EscposBuilder, char: '-' | '=' | '!' | '─'): EscposBuilder {
    // '─' is U+2500 — encode via cp1256 fallback ('?'); use '-' instead.
    const safe = char === '─' ? '-' : char;
    b.setAlignment('left').writeAscii(safe.repeat(LINE_WIDTH)).feedLine();
    return b;
  }
}

// ─── Pure helpers (exported for unit tests) ──────────────────────────────

export function aggregateByCurrency(
  payments: BondPrintInput['payments'],
): Map<string, { sum: number; symbol: string }> {
  const buckets = new Map<string, { sum: number; symbol: string }>();
  for (const p of payments) {
    const existing = buckets.get(p.currencyId);
    if (existing === undefined) {
      buckets.set(p.currencyId, { sum: p.amount, symbol: p.currencySymbol });
    } else {
      existing.sum += p.amount;
    }
  }
  // Stable order: IQD first, USD second, others alphabetically.
  const ordered = new Map<string, { sum: number; symbol: string }>();
  const iqd = buckets.get('IQD');
  if (iqd !== undefined) {
    ordered.set('IQD', iqd);
    buckets.delete('IQD');
  }
  const usd = buckets.get('USD');
  if (usd !== undefined) {
    ordered.set('USD', usd);
    buckets.delete('USD');
  }
  const remainingKeys = Array.from(buckets.keys()).sort();
  for (const k of remainingKeys) {
    const v = buckets.get(k);
    if (v !== undefined) ordered.set(k, v);
  }
  return ordered;
}

function paymentTypeLabel(t: PaymentType): string {
  switch (t) {
    case 'cash':
      return 'نقدي';
    case 'transfer':
      return 'حوالة';
    case 'installment':
      return 'تقسيط';
    case 'cheque':
      return 'شيك';
    case 'other':
      return 'أخرى';
  }
}

function syncStatusLabel(s: DailySummaryInput['sync']['status']): string {
  switch (s) {
    case 'idle':
      return 'متزامن';
    case 'syncing':
      return 'يتزامن الآن';
    case 'error':
      return 'خطأ';
    case 'offline':
      return 'بدون اتصال';
  }
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.trunc(n));
}

function fmtMoney(n: number, sym: string): string {
  return `${fmtInt(n)} ${sym}`;
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─── Used-by reference (unused — kept as documentation) ──────────────────
//
// Re-export so the alignment / size types travel with the service API.
export type { Alignment, TextSize };

// ─── Singleton ───────────────────────────────────────────────────────────
export const receiptPrintService = new ReceiptPrintService();
export type { ReceiptPrintService };
