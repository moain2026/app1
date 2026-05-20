# i18n Integration Guide

> How the main agent merges these JSON files into the live `src/i18n/locales/ar.json`.

---

## Files in this folder

| File                          | Approx. keys | Used by                |
|-------------------------------|--------------|------------------------|
| `ar-wave5-printer.json`       | ~70          | Wave 5 (Printer + Camera/Scanner) |
| `ar-wave6-bonds.json`         | ~95          | Wave 6 (Bonds + Payments)         |
| `ar-wave7-reports.json`       | ~110         | Wave 7 (Reports + Profile + About + Settings) |
| `ar-validation-errors.json`   | ~55          | Form validation across all waves   |
| **Total**                     | **~330**     |                                    |

Each file is a single top-level object with **nested namespaces** (e.g. `printer.settings.title`). Translations match the keys used in:

- Screen component code (e.g. `t('bonds.list.title')`).
- Receipt templates (the few labels that appear on prints).
- Schema-driven validation messages (used by `zodSchema.errorMap`).

---

## Merge strategy

The main `ar.json` already contains the Wave 0–4 keys. To merge:

```bash
# from repo root
node prepared-assets/i18n/_merge.js   # optional helper — see §5
```

Or **manually** (recommended for review):

1. Open `src/i18n/locales/ar.json` in your editor.
2. Open the target prep file (e.g. `ar-wave5-printer.json`).
3. Copy each top-level namespace object (`printer`, `scanner`, `company`, `print`) and paste under the existing root, preserving alphabetical-ish order (don't be religious about it; group by logical area).
4. **If a top-level key already exists** (e.g. `company` may already be in `ar.json` from Wave 3), merge children one by one — do **not** overwrite the existing object.

### Rules

- **Never duplicate a key.** If both files define `company.name`, keep the existing one.
- **Pluralisation** uses i18next's suffix convention (`_one`, `_two`, `_few`, `_many`). Arabic has 6 plural categories — we already use `_one` / `_two` / `_few` / `_many` for the common ones (see `bonds.list.subtitle*`). If you need `_zero` add it; do **not** rename existing ones.
- **Interpolation tokens** use `{{name}}` — keep them. Don't translate variable names.
- **Order inside a namespace** follows screen flow: title first, body, footer/actions last.

---

## Conflict resolution playbook

| Situation                                                      | What to do                                                 |
|----------------------------------------------------------------|------------------------------------------------------------|
| Existing `validation.required` differs from prep version       | **Keep existing.** Validation messages were finalised in Wave 4. |
| Existing `company.name` differs                                | **Keep existing.** Company name comes from auth context.   |
| New key collides with a different namespace structure          | Rename the new key to add a sub-namespace, e.g. `printer.errors.bluetoothOff` (which we already do). |
| Translation feels too formal / informal                         | Use the existing tone — collectors are field-staff, language is direct and respectful, no fancy literary forms. |

---

## English (`en.json`)

We currently ship Arabic-only. **Do not** create `en.json` from these files yet — that's a post-v1 task. The keys are designed so the future English locale can be auto-bootstrapped by Crowdin / i18n-ally.

---

## Validation: tying error messages to Zod

Schemas should reference `t('validation.*')` via a centralised error map:

```ts
// src/i18n/zodErrorMap.ts
import { z } from 'zod';
import { t } from 'i18next';

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined') return { message: t('validation.required') };
      return { message: t('validation.general.checkInputs') };
    case 'too_small':
      if (issue.type === 'number') return { message: t('validation.number.min', { min: issue.minimum }) };
      if (issue.type === 'string') return { message: t('validation.string.min', { min: issue.minimum }) };
      break;
    case 'too_big':
      if (issue.type === 'number') return { message: t('validation.number.max', { max: issue.maximum }) };
      if (issue.type === 'string') return { message: t('validation.string.max', { max: issue.maximum }) };
      break;
  }
  return { message: ctx.defaultError };
});
```

Then schemas can use **custom messages** for domain-specific errors:

```ts
const BondSchema = z.object({
  noadad: z.string().min(6, { message: 'validation.noadad.minDigits' }),
  amount: z.number().positive({ message: 'validation.amount.positive' }),
});
```

---

## Sanity check checklist (run after each merge)

```bash
# from repo root
cd AbbasiTahseel
npm run typecheck          # tsc doesn't validate JSON, but i18next-resources-typesafe will catch missing keys at build
npx i18next-resources-typesafe --src src/i18n/locales/ar.json  # if installed
node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/ar.json'))" && echo OK
```

- [ ] `ar.json` is valid JSON
- [ ] No duplicate keys (use a linter / jq)
- [ ] All `{{...}}` interpolation tokens render correctly in dev build
- [ ] RTL alignment looks right (test in Splash → Login → Bonds)
- [ ] Long Arabic strings don't overflow card layouts (test on smallest device width)

---

## Helper merge script (optional)

Saving for future automation — not required for v1.

```js
// prepared-assets/i18n/_merge.js  (sketch)
const fs = require('fs');
const path = require('path');
const target = path.resolve(__dirname, '../../src/i18n/locales/ar.json');
const sources = ['ar-wave5-printer.json','ar-wave6-bonds.json','ar-wave7-reports.json','ar-validation-errors.json'];

const deepMerge = (a, b) => {
  for (const k of Object.keys(b)) {
    if (typeof b[k] === 'object' && b[k] !== null && !Array.isArray(b[k]) && typeof a[k] === 'object') {
      deepMerge(a[k], b[k]);
    } else if (a[k] === undefined) {
      a[k] = b[k];                  // never overwrite
    } else {
      console.warn(`skip existing key: ${k}`);
    }
  }
  return a;
};

const dst = JSON.parse(fs.readFileSync(target, 'utf8'));
for (const s of sources) {
  const src = JSON.parse(fs.readFileSync(path.join(__dirname, s), 'utf8'));
  deepMerge(dst, src);
}
fs.writeFileSync(target, JSON.stringify(dst, null, 2) + '\n');
```

> **Caveat:** This script never overwrites existing keys — even if the prep version is the "correct" one. For sensitive overrides, edit manually.
