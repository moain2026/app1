/**
 * testPage.ts — A self-contained ESC/POS test page used by the
 * "اختبار طباعة" button in PrinterSettingsScreen.
 *
 * The output verifies (a) the cp1256 Arabic encoder, (b) the contextual
 * shaper (initial/medial/final forms), (c) bold + size + alignment
 * primitives, and (d) the CODE128 barcode printer.
 *
 * Source reference: prepared-assets/printer/printer-test-page.txt
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
} from './escposBuilder';

export function buildTestPage(): Uint8Array {
  const parts: Uint8Array[] = [];

  parts.push(initPrinter());
  parts.push(selectCp1256());

  parts.push(printLine('=', 48));
  parts.push(
    printText('شركة العباسي للكهرباء', {
      align: 'center',
      bold: true,
      size: 'xlarge',
    }),
  );
  parts.push(printText('صفحة اختبار الطباعة', { align: 'center', bold: true }));
  parts.push(printLine('=', 48));

  // 1. Alignment.
  parts.push(printText('-- المحاذاة --', { align: 'right', bold: true }));
  parts.push(printText('يمين', { align: 'right' }));
  parts.push(printText('وسط', { align: 'center' }));
  parts.push(printText('يسار', { align: 'left' }));

  // 2. Font size.
  parts.push(printLine('-', 48));
  parts.push(printText('-- الأحجام --', { align: 'right', bold: true }));
  parts.push(printText('عادي', { align: 'right', size: 'normal' }));
  parts.push(printText('صغير', { align: 'right', size: 'small' }));
  parts.push(printText('كبير', { align: 'right', size: 'large' }));
  parts.push(printText('أكبر', { align: 'right', size: 'xlarge' }));

  // 3. Bold + Arabic shaping.
  parts.push(printLine('-', 48));
  parts.push(printText('-- التشكيل --', { align: 'right', bold: true }));
  parts.push(printText('نص عادي بدون تشكيل', { align: 'right' }));
  parts.push(printText('نص مع تشكيل عريض', { align: 'right', bold: true }));
  parts.push(printText('أحرف منفصلة: ا ب ت ث ج', { align: 'right' }));
  parts.push(printText('أحرف متصلة: السلام عليكم', { align: 'right' }));

  // 4. Numbers + mixed.
  parts.push(printLine('-', 48));
  parts.push(printText('-- الأرقام --', { align: 'right', bold: true }));
  parts.push(printText('123,456 د.ع', { align: 'center', bold: true, size: 'large' }));
  parts.push(printText('20.00 $', { align: 'center', bold: true, size: 'large' }));

  // 5. Barcode.
  parts.push(printLine('-', 48));
  parts.push(printText('-- باركود --', { align: 'right', bold: true }));
  parts.push(printText('TEST-001', { align: 'center' }));
  parts.push(printBarcode('TEST-001'));

  // 6. Closing.
  parts.push(printLine('=', 48));
  parts.push(printText('انتهى الاختبار', { align: 'center', bold: true }));
  parts.push(printText('Test Complete', { align: 'center' }));
  parts.push(feedLines(3));
  parts.push(cutPaper());

  return concatBytes(...parts);
}
