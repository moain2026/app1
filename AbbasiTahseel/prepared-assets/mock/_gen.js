#!/usr/bin/env node
/* eslint-disable */
// Generator for mock JSON fixtures.
// Deterministic (seeded PRNG) so re-running produces identical output → no diff noise.
// Run:  node _gen.js
const fs = require('fs');
const path = require('path');

// ── seeded PRNG (mulberry32) ──────────────────────────────────────────────
function rand(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rand(0xABBA51); // "ABBASI"

const pick = (arr) => arr[Math.floor(r() * arr.length)];
const between = (a, b) => Math.floor(a + r() * (b - a + 1));

// ── pseudo UUID (deterministic) ───────────────────────────────────────────
function uuid() {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += hex[Math.floor(r() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) s += '-';
  }
  return s;
}

// ── name / address pools (real Iraqi-style names) ────────────────────────
const firstNames = [
  'أحمد','محمد','علي','حسن','حسين','عبدالله','عبدالرحمن','يوسف','إبراهيم',
  'مصطفى','عمر','خالد','فاضل','كاظم','جاسم','رضا','صادق','مهدي','زيد','حيدر',
  'كرار','مرتضى','عباس','جعفر','سليم','نزار','سعد','أنس','وسام','وليد',
];
const fatherNames = firstNames;
const familyNames = [
  'العمري','الجبوري','الموسوي','البياتي','الكناني','التميمي','الزبيدي','الربيعي',
  'الساعدي','العقابي','الخفاجي','الحسناوي','الجنابي','الدليمي','الكعبي','الشمري',
  'العزاوي','الجابري','الخزرجي','الفهداوي','الفتلاوي',
];
const subscriberFemale = [
  'فاطمة محمد العمري','زينب علي الجبوري','مريم حسن الموسوي',
  'سارة عبدالله البياتي','رقية فاضل التميمي','أم البنين كاظم',
];
const areas = [
  { name: 'الكرادة',  weight: 0.30 },
  { name: 'البياع',   weight: 0.20 },
  { name: 'الجادرية', weight: 0.20 },
  { name: 'الكاظمية', weight: 0.15 },
  { name: 'المنصور',  weight: 0.15 },
];
function pickArea() {
  const x = r();
  let acc = 0;
  for (const a of areas) { acc += a.weight; if (x < acc) return a.name; }
  return areas[0].name;
}
const streets = ['شارع 14 رمضان','شارع الكفاح','شارع فلسطين','شارع الصناعة','شارع الرشيد','حي الجامعة','حي الخضراء','منطقة الزعفرانية'];
const phonePrefix = ['077','078','079','075'];
function phone() {
  return `${pick(phonePrefix)}0${between(1000000,9999999)}`;
}
function maleName() {
  return `${pick(firstNames)} ${pick(fatherNames)} ${pick(familyNames)}`;
}
function femaleName() {
  return pick(subscriberFemale);
}
function subName() {
  return r() < 0.85 ? maleName() : femaleName();
}

// ── time helpers ──────────────────────────────────────────────────────────
const REF_NOW = new Date('2026-05-20T11:42:00+03:00').getTime();
const DAY = 86400000;
function dateNDaysAgo(n) {
  const offset = Math.floor(r() * 86400000); // random time of day
  return REF_NOW - n * DAY + offset - 86400000;
}

// ── 40 accounts (subscribers) ─────────────────────────────────────────────
const ACCOUNT_COUNT = 40;
const accounts = [];
const noadadStart = 10000000;
for (let i = 0; i < ACCOUNT_COUNT; i++) {
  const id = uuid();
  const noadad = String(noadadStart + i * 137 + between(0, 99)); // sparse spacing
  accounts.push({
    id,
    noadad,
    name: subName(),
    phone: phone(),
    address: `بغداد - ${pickArea()} - ${pick(streets)}`,
    area_name: pickArea(),
    balance: between(0, 350000),     // remaining debt
    last_reading: between(20000, 90000),
    avg_consumption: between(150, 1800),
    server_id: i + 1001,
    sync_status: 'synced',
    updated_at: dateNDaysAgo(between(1, 30)),
  });
}

// ── 4 currencies ──────────────────────────────────────────────────────────
const currencies = [
  { id: 'IQD', name: 'دينار عراقي',    symbol: 'د.ع', exchange_rate: 1,    is_default: true,  order: 1 },
  { id: 'USD', name: 'دولار أمريكي',  symbol: '$',   exchange_rate: 1310, is_default: false, order: 2 },
  { id: 'EUR', name: 'يورو',           symbol: '€',   exchange_rate: 1420, is_default: false, order: 3 },
  { id: 'TRY', name: 'ليرة تركية',    symbol: '₺',   exchange_rate: 39,   is_default: false, order: 4 },
];

// ── 30 bonds + 60 payments ────────────────────────────────────────────────
const BOND_COUNT = 30;
const bonds = [];
const payments = [];
const collectorIds = ['user-1042-collector','user-1043-collector','user-1044-collector'];
const paymentTypes = ['cash','transfer','installment','cheque','mixed'];
const notesPool = [
  null, null, null,
  'دفعة شهر يناير',
  'دفعة جزئية',
  'تسوية رصيد سابق',
  'دفع مقدم',
  'دفعة شهر فبراير + الكهرباء الإضافية',
  'تم التواصل مع المشترك',
];

for (let i = 0; i < BOND_COUNT; i++) {
  const acc = accounts[i % accounts.length];
  const bondDate = dateNDaysAgo(between(0, 29));
  const bondId = uuid();
  const num = 1001 + i;
  const collectorId = pick(collectorIds);
  const paymentsForBond = 2; // exactly 2 per bond (gives us 60 total)
  let total = 0;
  const localPayments = [];

  for (let p = 0; p < paymentsForBond; p++) {
    const useUsd = r() < 0.15;
    const type = useUsd && p === 1 ? 'cash' : pick(paymentTypes);
    const currencyId = useUsd ? 'USD' : (r() < 0.95 ? 'IQD' : 'USD');
    let amount;
    if (currencyId === 'IQD') {
      amount = between(5, 50) * 1000;          // 5,000–50,000 in steps of 1000
      if (i % 11 === 0 && p === 0) amount = between(100, 500) * 1000; // some big bonds
    } else {
      amount = between(5, 80);                  // USD 5–80
    }
    total += currencyId === 'IQD' ? amount : amount * 1310;
    localPayments.push({
      id: uuid(),
      bond_id: bondId,
      amount,
      payment_type: type,
      currency_id: currencyId,
      description: type === 'cash' ? 'نقد' :
                   type === 'transfer' ? 'حوالة' :
                   type === 'installment' ? 'تقسيط' :
                   type === 'cheque' ? 'شيك' : 'مختلطة',
      created_at: bondDate,
    });
  }

  // 90% synced, 7% pending, 3% error
  const x = r();
  const sync_status = x < 0.90 ? 'synced' : (x < 0.97 ? 'pending' : 'error');

  bonds.push({
    id: bondId,
    local_uuid: bondId,
    num,
    server_id: sync_status === 'synced' ? num + 500000 : null,
    noadad: acc.noadad,
    subscriber_name: acc.name,
    area_name: acc.area_name,
    collector_id: collectorId,
    total_amount: total,
    bond_date: bondDate,
    notes: pick(notesPool),
    previous_balance: acc.balance + between(0, 100000),
    new_balance: Math.max(0, acc.balance - between(0, 50000)),
    sync_status,
    is_reprint: false,
    created_at: bondDate,
    updated_at: bondDate + between(0, 600000),
  });
  payments.push(...localPayments);
}

// ── Reports data ──────────────────────────────────────────────────────────
const daily = [];
for (let d = 0; d < 30; d++) {
  const date = REF_NOW - d * DAY;
  const readingsCount = between(8, 35);
  const bondsCount    = between(5, 25);
  const totalIqd = bondsCount * between(20, 80) * 1000;
  const totalUsd = r() < 0.4 ? between(0, 4) * 20 : 0;
  daily.push({
    date_iso: new Date(date).toISOString().slice(0,10),
    timestamp: date,
    readings_count: readingsCount,
    bonds_count: bondsCount,
    total_amount_iqd: totalIqd,
    total_amount_usd: totalUsd,
    area_breakdown: areas.map((a) => ({
      area_name: a.name,
      readings: Math.max(0, Math.round(readingsCount * a.weight + between(-2, 2))),
      bonds:    Math.max(0, Math.round(bondsCount    * a.weight + between(-1, 1))),
      amount:   Math.round(totalIqd * a.weight),
    })),
  });
}
const weekly = [];
for (let w = 0; w < 8; w++) {
  const slice = daily.slice(w*4, w*4+7);          // ~ a week
  if (slice.length === 0) break;
  weekly.push({
    week_number: w + 1,
    week_start: slice[slice.length-1]?.date_iso,
    week_end:   slice[0]?.date_iso,
    readings_count: slice.reduce((s,d)=>s+d.readings_count,0),
    bonds_count:    slice.reduce((s,d)=>s+d.bonds_count,0),
    total_amount_iqd: slice.reduce((s,d)=>s+d.total_amount_iqd,0),
    total_amount_usd: slice.reduce((s,d)=>s+d.total_amount_usd,0),
  });
}
const monthly = [];
const months = ['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول'];
for (let m = 0; m < 12; m++) {
  monthly.push({
    month_number: m + 1,
    month_name_ar: months[m],
    year: m < 5 ? 2026 : 2025,
    readings_count: between(180, 380),
    bonds_count: between(120, 250),
    total_amount_iqd: between(2000000, 6500000),
    total_amount_usd: between(0, 500),
    active_collectors: between(2, 5),
  });
}
const by_area = areas.map((a) => ({
  area_name: a.name,
  total_subscribers: between(180, 420),
  active_subscribers: between(150, 380),
  total_readings_30d: between(800, 2400),
  total_bonds_30d:    between(500, 1500),
  total_amount_iqd_30d: between(15000000, 45000000),
  avg_consumption_kwh: between(180, 600),
  delinquent_count: between(5, 30),
}));

const reports = { daily, weekly, monthly, by_area };

// ── Write outputs ─────────────────────────────────────────────────────────
const outDir = __dirname;
function writeJSON(name, data) {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2) + '\n');
}

writeJSON('mock-accounts.json', accounts);
writeJSON('mock-currencies.json', currencies);
writeJSON('mock-bonds.json', bonds);
writeJSON('mock-payments.json', payments);
writeJSON('mock-reports-data.json', reports);

console.log(`✓ accounts: ${accounts.length}`);
console.log(`✓ currencies: ${currencies.length}`);
console.log(`✓ bonds: ${bonds.length}  (payments: ${payments.length})`);
console.log(`✓ reports: daily=${daily.length}, weekly=${weekly.length}, monthly=${monthly.length}, by_area=${by_area.length}`);
