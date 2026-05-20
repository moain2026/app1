// ─────────────────────────────────────────────────────────────────────────────
// receipt-builder-pseudocode.ts
//
// ⚠️  PSEUDOCODE / BLUEPRINT — DO NOT IMPORT
//
// This file is reference material for the main agent building Wave 5.
// It outlines the *shape* of the receipt builders that should live under
//   src/services/printer/receiptBuilders/
// using the ESC/POS primitives defined in escposBuilder.ts and the
// cp1256 encoder defined in cp1256.ts.
//
// The actual implementation file will be plain TypeScript with imports
// pointing at real modules. The agent should:
//   1. Copy the structure (function signatures, control flow, comments).
//   2. Replace the `esc.*` / `cp.*` placeholders with the real primitives.
//   3. Add unit tests using the sample data in mock-bonds.json.
// ─────────────────────────────────────────────────────────────────────────────

// ── Imports (real implementation) ────────────────────────────────────────────
// import { Buffer } from 'buffer';
// import {
//   cmdInit, cmdAlign, cmdBold, cmdSize, cmdUnderline,
//   cmdLF, cmdFeedLines, cmdCut, cmdCodePageArabic,
//   cmdBarcodeCode128, cmdQRCode,
// } from '../escposBuilder';
// import { encodeCp1256 } from '../cp1256';

// ── Types (will live in src/types/printer.ts) ────────────────────────────────
type ReadingPrintInput = {
  reading: {
    local_uuid: string;
    noadad: string;
    subscriberName: string;
    areaName: string | null;
    previousValue: number;
    currentValue: number;
    notes: string | null;
    avgConsumption?: number;
  };
  collector: { fullName: string; employeeNumber: string };
  company: { name: string; branch: string };
  printedAt: Date;
};

type BondPrintInput = {
  bond: {
    id: string;
    num: number;
    noadad: string;
    notes: string | null;
    bondDate: Date;
    previousBalance: number;
    newBalance: number;
  };
  subscriber: { name: string; phone?: string; address?: string };
  payments: Array<{
    paymentType: 'cash' | 'transfer' | 'installment' | 'cheque' | 'other';
    amount: number;
    currencyId: string;        // 'IQD' | 'USD'
    currencySymbol: string;    // 'د.ع' | '$'
    description?: string;
  }>;
  collector: { fullName: string; employeeNumber: string };
  company: { name: string; branch: string };
  printedAt: Date;
  isReprint?: boolean;
  reprintNo?: number;
};

type DailySummaryInput = {
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
  byPaymentType: Record<'cash' | 'transfer' | 'installment' | 'other',
                       { iqd: number; usd: number }>;
  byArea: Array<{ areaName: string; readings: number; bonds: number; amount: number }>;
  sync: { status: 'idle' | 'syncing' | 'error' | 'offline'; pendingCount: number };
  notes: string | null;
};

// ── Common helpers ───────────────────────────────────────────────────────────

// Concatenate many Uint8Arrays without spread (RN performance).
function concat(parts: Uint8Array[]): Uint8Array {
  // const total = parts.reduce((s, p) => s + p.length, 0);
  // const out = new Uint8Array(total);
  // let o = 0;
  // for (const p of parts) { out.set(p, o); o += p.length; }
  // return out;
}

function arabicLine(text: string, opts?: { align?: 0 | 1 | 2; bold?: boolean; size?: 0x00 | 0x11 | 0x22 }): Uint8Array {
  // step 1: cmdAlign(opts.align ?? 2)        // right by default
  // step 2: cmdSize(...)
  // step 3: cmdBold(opts.bold ?? false)
  // step 4: cmdCodePageArabic()
  // step 5: encodeCp1256(shape(text))        // shaper + cp1256 byte stream
  // step 6: cmdLF()
  // step 7: turn off bold / reset size
  return new Uint8Array();
}

function divider(char: string = '='): Uint8Array {
  // cmdAlign(0) + encode(char.repeat(48)) + LF
  return new Uint8Array();
}

function fmt(n: number): string {
  // return new Intl.NumberFormat('en-US').format(n);
  return '';
}

function fmtMoney(n: number, sym: string): string {
  return `${fmt(n)} ${sym}`;
}

function pad(label: string, value: string, width = 48): string {
  // right-pad label, left-pad value so total = width
  // result like:  "  المحصّل             : أحمد محمد            "
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. READING RECEIPT
// ─────────────────────────────────────────────────────────────────────────────
export function buildReadingReceipt(input: ReadingPrintInput): Uint8Array {
  const parts: Uint8Array[] = [];

  // step 1: init printer + Arabic code page
  // parts.push(cmdInit(), cmdCodePageArabic());

  // step 2: header (centered, large, bold)
  // parts.push(arabicLine(input.company.name,   { align: 1, size: 0x11, bold: true }));
  // parts.push(arabicLine(input.company.branch, { align: 1, size: 0x00 }));

  // step 3: divider
  // parts.push(divider('='));

  // step 4: title "إيصال قراءة"
  // parts.push(arabicLine('إيصال قراءة', { align: 1, size: 0x11, bold: true }));
  // parts.push(divider('-'));

  // step 5: collector / device / date block (right-aligned key:value)
  const consumption = input.reading.currentValue - input.reading.previousValue;
  const lines: Array<[string, string]> = [
    ['المحصّل',           input.collector.fullName],
    ['رقم الجهاز',         input.collector.employeeNumber],
    ['التاريخ',             fmtDate(input.printedAt)],
    ['الوقت',               fmtTime(input.printedAt)],
  ];
  // for each (label, value) push arabicLine(pad(label, value), { align: 2 });

  // step 6: subscriber block
  // parts.push(divider('-'));
  // arabicLine(pad('المشترك',  input.reading.subscriberName));
  // arabicLine(pad('رقم العداد', input.reading.noadad));
  // if (input.reading.areaName) arabicLine(pad('المنطقة', input.reading.areaName));

  // step 7: readings block
  // parts.push(divider('-'));
  // arabicLine(pad('القراءة السابقة', fmt(input.reading.previousValue)));
  // arabicLine(pad('القراءة الحالية', fmt(input.reading.currentValue)));
  // parts.push(divider('─'));
  // arabicLine(pad('الاستهلاك (kWh)', fmt(consumption)), { bold: true });

  // step 8: warning banners
  if (consumption < 0) {
    // arabicLine('⚠ تم إعادة ضبط العداد', { align: 1, bold: true });
  } else if (input.reading.avgConsumption && consumption > input.reading.avgConsumption * 2) {
    // arabicLine('⚠ تنبيه: استهلاك مرتفع', { align: 1, bold: true });
  }

  // step 9: notes
  // arabicLine(pad('ملاحظات', input.reading.notes ?? '—'));

  // step 10: barcode
  // parts.push(divider('-'));
  // parts.push(cmdAlign(1));
  // parts.push(cmdBarcodeHeight(80), cmdBarcodeWidth(2));
  // parts.push(cmdBarcodeCode128(input.reading.local_uuid.slice(0, 8).toUpperCase()));
  // parts.push(cmdLF());

  // step 11: footer + cut
  // arabicLine('شكراً لتعاونكم', { align: 1 });
  // parts.push(cmdFeedLines(3), cmdCut(true));

  return concat(parts);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BOND RECEIPT
// ─────────────────────────────────────────────────────────────────────────────
export function buildBondReceipt(input: BondPrintInput): Uint8Array {
  const parts: Uint8Array[] = [];

  // step 1: init + cp1256
  // step 2: header block
  // step 3: title "سند قبض" (large bold center)
  // step 4: optional REPRINT banner if isReprint

  // step 5: bond meta (num, date, time, collector)
  // step 6: subscriber meta (name, noadad, phone, address, prev balance)

  // step 7: payments table
  //   compute column widths once, then for each payment:
  //     "| {type}  | {amount}  | {currency} |"
  //   if payments.length === 1 → use COMPACT variant (skip table)

  // step 8: grand totals — sum per currency, print one large line each
  const totalsByCurrency = aggregateByCurrency(input.payments);
  // for currency 'IQD' (always first if present): large bold center
  // for currency 'USD' (if present): large bold center
  // for other currencies: in stable order

  // step 9: notes block (or '—')
  // step 10: new balance
  // step 11: CODE128 barcode of bond.num + last 6 of bond.id
  // step 12: QR code of signed payload (see bond-receipt-template.md §7)
  // step 13: footer (thank-you, support phone, website)
  // step 14: signature line: 48× '_' divider with label
  // step 15: feed 3 + cut

  return concat(parts);
}

function aggregateByCurrency(payments: BondPrintInput['payments']) {
  // Map<currencyId, { sum: number; symbol: string }>
  // preserve order: IQD, USD, others (lexical)
  return new Map<string, { sum: number; symbol: string }>();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DAILY SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
export function buildDailySummary(input: DailySummaryInput): Uint8Array {
  const parts: Uint8Array[] = [];

  // step 1: init + cp1256
  // step 2: header (company name + branch)
  // step 3: title "تقرير يومي" (large bold center)

  // step 4: empty-day guard
  if (input.stats.readingsCount === 0 && input.stats.bondsCount === 0) {
    // arabicLine('لا يوجد نشاط في هذا اليوم', { align: 1, bold: true });
    // signature lines + feed/cut
    return concat(parts);
  }

  // step 5: pending-sync banner if pendingCount > 0
  if (input.sync.pendingCount > 0) {
    // BOXED warning banner — see daily-summary-template.md §5.3
  }

  // step 6: collector + date block
  // step 7: stats box (counts, unique subscribers, avg per hour)
  // step 8: grand totals per currency (LARGE bold center)
  // step 9: breakdown by payment type (table, font B)
  // step 10: breakdown by area (top 8 rows + "+ others" row)
  // step 11: notes block (multi-line, wrap at 44 chars)
  // step 12: sync status line
  // step 13: signature block (collector / supervisor / received-at)
  // step 14: footer divider + feed 4 + cut

  return concat(parts);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPPORTING UTILITIES (will live in src/utils/format.ts)
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d: Date): string { return ''; }   // 'dd/MM/yyyy'
function fmtTime(d: Date): string { return ''; }   // 'HH:mm'
function shapeArabic(s: string): string { return s; } // shaper + reversal

// ─────────────────────────────────────────────────────────────────────────────
// 5. ENTRY POINT — print one of the receipts via the transport layer
// ─────────────────────────────────────────────────────────────────────────────
/*
import { datecsTransport } from '../datecsTransport';

export async function printReadingReceipt(input: ReadingPrintInput) {
  const bytes = buildReadingReceipt(input);
  // chunk into ≤ 1024-byte writes (Datecs firmware quirk)
  for (let off = 0; off < bytes.length; off += 1024) {
    await datecsTransport.write(bytes.slice(off, off + 1024));
    await new Promise((r) => setTimeout(r, 30)); // tiny gap to avoid broken pipe
  }
}
*/
