# Skill — Git Workflow (GenSpark AI Developer)

> The rules for committing, pushing, and PR-ing in this project.
> Following them strictly = no rework, no lost commits, no merge headaches.

## Branch rules

- **`main`** — protected, production. NEVER commit directly.
- **`genspark_ai_developer`** — the default working branch for general
  multi-wave work. The agent can push here without a PR for tiny doc fixes.
- **`feat/wave-N-<topic>`** — one branch per wave (e.g. `feat/wave-6-bonds`).
- **`fix/<topic>`** — one branch per fix (e.g. `fix/wcf-authenticate-endpoint`).
- **`chore/<topic>`** — non-functional changes (CI config, deps, docs).

Branch naming is **lowercase, kebab-case, no underscores in the topic**.

## The golden flow

```
┌────────────────────────────────────────────────────────────────┐
│  1. fetch + checkout main                                       │
│  2. pull --rebase                                               │
│  3. create branch: git checkout -b <type>/<topic>               │
│  4. make changes                                                │
│  5. tsc --noEmit (must be 0 errors)                             │
│  6. git add + commit (conventional commits format)              │
│  7. git push (first push: -u origin <branch>)                   │
│  8. open PR with gh pr create                                   │
│  9. share PR URL with user                                      │
│ 10. wait for CI green                                           │
│ 11. user reviews / merges                                       │
└────────────────────────────────────────────────────────────────┘
```

Steps 5–7 repeat for each commit until ready.

## Conventional commits format

```
<type>(<scope>): <short description in present-tense>

<optional longer body, wrapped at 72>

<optional footer: "Closes #N" / "Refs #N">
```

Types we use:
- `feat` — new feature (wave work, new screens, new endpoints)
- `fix` — bug fix (the WCF auth fix in PR #26)
- `refactor` — code restructure with no behavior change
- `docs` — pure documentation changes
- `chore` — deps, CI, build config
- `test` — adding tests (when test framework lands)
- `style` — formatting only
- `wip` — emergency save when about to be interrupted (squash later)

Scopes we use:
- `(auth)`, `(printer)`, `(scanner)`, `(readings)`, `(bonds)`,
  `(license)`, `(sync)`, `(i18n)`, `(api)`, `(ui)`, `(nav)`, `(context)`

Examples:
```
fix(auth): switch to /Authenticate (WCF) with /Login fallback
feat(printer): add buildBondReceipt + integrate from BondDetailScreen
docs(context): refresh CURRENT_STATE for Wave 6 start
chore(deps): pin react-native-bluetooth-classic to 1.73.0-rc.12
```

## One concern per commit

```
❌ Bad
feat(auth): fix login + add print button + update i18n strings

✅ Good (three separate commits)
fix(auth): set appId casing correctly on login body
feat(printer): add print button to ReadingDetailScreen
chore(i18n): add ar strings for printer module
```

This makes `git log --oneline` actually readable AND makes reverts safe.

## When to commit

After EVERY meaningful change:
1. Type-checked clean (`tsc --noEmit` returns 0 errors)
2. Logically complete (the feature works, even if it's just a stub)
3. Could be reverted alone without breaking other features

DO NOT batch a session's worth of work into one commit. Lost work in
the sandbox = lost forever.

## When to push

After EVERY commit. No exceptions.

```bash
git push origin <branch-name>

# First push of a new branch:
git push -u origin <branch-name>

# After rebase / amend (rare):
git push -f origin <branch-name>
```

**Local-only commits in this sandbox = lost work** when the session ends.

## Creating PRs

```bash
gh pr create \
  --base main \
  --head <your-branch> \
  --title "<conventional-commit-style title>" \
  --body "<markdown body with Why / What / How verified>"
```

PR body template:

```markdown
## Why
<1-2 sentences explaining the problem this solves>

## What changed
- file1.ts — <one-line summary>
- file2.ts — <one-line summary>

## How verified
- [x] `tsc --noEmit` → 0 errors
- [x] CI: <link if known>
- [ ] Field test pending

## References
- Related: #<previous-PR-N>
- Docs: AGENT_CONTEXT/<file>.md
```

## Sharing the PR URL

After `gh pr create`, the command outputs the URL. **Always paste that
URL to the user.** Don't make them ask for it.

```
✅ Done! Created PR:
👉 https://github.com/moain2026/app1/pull/26

CI is queued. I'll watch for the result.
```

## Merging policy

- **The user merges, not the agent.** Even if you have write access.
- If the user asks "can you merge?", verify CI is green first:
  ```bash
  gh pr checks <N>
  ```
- After merge, switch back to main and pull:
  ```bash
  git checkout main && git pull origin main
  ```

## When a PR needs revision

```bash
# Make changes on the same branch
git add ...
git commit -m "fix(auth): address review feedback — clarify error message"
git push origin <branch>
# PR auto-updates; CI re-runs
```

Do NOT close and reopen. Do NOT create a new PR. Stack revisions on the
same PR.

## When a PR direction is fundamentally wrong (like PR #25)

```bash
# 1. Close the wrong PR with explanation
gh pr close <N> --comment "Closing — new evidence shows..."

# 2. Start a NEW branch from main
git fetch origin main && git checkout main && git pull origin main
git checkout -b <new-branch>

# 3. Do it right
# ... commits ...

# 4. Open a NEW PR referencing the closed one
gh pr create ... --body "... Replaces #N (which was based on wrong assumptions). ..."
```

This was the PR #25 → PR #26 flow this session.

## Squashing — when and how

Squash ONLY:
1. At PR-merge time (the user uses GitHub's "Squash and merge" button)
2. Before pushing if you have local-only mess (WIP commits, typos)

Never squash commits that have already been pushed AND that other people
(or CI) might reference. Push history matters.

Non-interactive squash (use this — interactive rebase requires a TTY):

```bash
# Reset N commits back, keeping all changes staged
git reset --soft HEAD~N

# Re-commit as one
git commit -m "<comprehensive message describing all changes>"

# Force push (only safe on personal branches!)
git push -f origin <branch>
```

## Emergency commits ("oh no, about to be cut off")

```bash
# Get something on disk RIGHT NOW
git add -A
git commit -m "wip(<scope>): <one-line where I was>"
git push origin <branch>

# Update AGENT_CONTEXT/CURRENT_STATE.md if there's time
# Otherwise the next agent reads `git log -1` and `git diff HEAD~1`
```

## GitHub auth (sandbox-specific)

The sandbox's GitHub auth comes from the `setup_github_environment` tool,
which configures:
- `git config --global user.name "<the-user-handle>"`
- `git config --global user.email "<the-user-email>"`
- `gh auth login --with-token` using `$GSK_TOKEN`

If `gh` commands fail with auth errors, call `setup_github_environment`
again — it's safe to invoke multiple times.

## DO NOT

- Commit `prepared-assets/`. It's in `.gitignore` for a reason.
- Push directly to `main`.
- Force-push branches that other people have pulled.
- Mix wave work and bug fixes in one commit.
- Leave uncommitted changes when ending a session.
