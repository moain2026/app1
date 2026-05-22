# Skills — AbbasiTahseel Agent Capabilities

> Each skill is a self-contained markdown brief. Read them on-demand:
> when you encounter a problem in that domain, open the matching skill
> file. Each one is < 200 lines and gives you the patterns, gotchas, and
> code idioms used in THIS project specifically.

## When to use which

| Skill | Open when... |
|---|---|
| [`wcf-api-debugging.md`](./wcf-api-debugging.md) | A request returns unexpected JSON/XML, 4xx/5xx, or `{}` empty body. Includes reading WCF Service Explorer pages. |
| [`react-native-android-build.md`](./react-native-android-build.md) | Building APKs locally or on CI, Gradle errors, Metro issues, dependency conflicts. |
| [`arabic-cp1256-printing.md`](./arabic-cp1256-printing.md) | Writing/debugging ESC/POS receipts. Arabic shaping or glyph issues. Datecs DPP-250 specifics. |
| [`zustand-store-architecture.md`](./zustand-store-architecture.md) | Adding a new store or modifying an existing one. Action patterns, selectors, persistence. |
| [`legacy-java-decompile-analysis.md`](./legacy-java-decompile-analysis.md) | Verifying a wire format against the old Java app. Retrofit/Moshi/OkHttp idioms. |
| [`zod-schema-validation.md`](./zod-schema-validation.md) | Adding/modifying a schema in `src/services/api/schemas/`. Lenient parser patterns. |
| [`git-workflow-genspark.md`](./git-workflow-genspark.md) | Before any commit. Branch naming, PR creation, squash rules. |
| [`apk-install-and-test.md`](./apk-install-and-test.md) | The user is about to field-test an APK. Install steps, troubleshooting, what to ask for. |

## Mental model

These skills replicate the **specific** know-how the previous agent
accumulated for the AbbasiTahseel project. They are NOT generic React
Native / TypeScript / Android tutorials — they assume you already know
the basics, and focus on:

1. **Project-specific patterns** (e.g. our store-action signature
   `async login(username, password): Promise<boolean>`).
2. **Domain-specific traps** (e.g. WCF's `string` response type is a
   JSON quoted literal, not an object).
3. **Tribal knowledge** the previous agent picked up the hard way
   (e.g. PR #25's lowercase-`appid` mistake, recorded in
   `AGENT_CONTEXT/AUTH_INVESTIGATION.md`).

## Order to read on first session

1. `git-workflow-genspark.md` — so you don't accidentally commit to main
2. `wcf-api-debugging.md` — the auth fix in PR #26 is fresh and needs you
3. `zustand-store-architecture.md` — every wave touches at least one store
4. The rest on-demand.
