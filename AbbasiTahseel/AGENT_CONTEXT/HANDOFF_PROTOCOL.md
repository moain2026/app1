# HANDOFF_PROTOCOL — How to Stop Without Losing State

> Goal: any future AI session should be able to resume work in under 60
> seconds by reading `CURRENT_STATE.md` and running 1-2 commands.

## Before stopping (in order)

1. **Save in-progress work.** If a file is partially written, save it as
   is — broken TypeScript is recoverable; lost work is not.
2. **Update `AGENT_CONTEXT/CURRENT_STATE.md`:**
   - Move the `▶️ RESUME FROM HERE` marker to the next concrete file/task.
   - Update the DONE list with anything newly finished.
   - Update the PENDING list (remove finished items, add discovered ones).
   - Refresh the "Last commit" hash + message.
   - Refresh `npx tsc --noEmit` status.
3. **Commit + push.**
   ```bash
   cd /home/user/webapp/AbbasiTahseel
   git add -A
   git commit -m "docs(context): refresh state — <one-line summary>"
   git push origin <current-branch>
   ```
4. **Verify tree is clean.**
   ```bash
   git status   # → "nothing to commit, working tree clean"
   ```

## If you're about to be rate-limited / interrupted

- Commit whatever's on disk **right now** with `wip(...)` prefix.
- Push immediately. Don't optimize the message.
- Then update CURRENT_STATE if there's time. If not, the next agent will
  read `git log -1` + `git diff HEAD~1 HEAD` to figure out where it stopped.

## On resume (the NEXT agent)

1. `pwd` → expect `/home/user`.
2. `cd /home/user/webapp/AbbasiTahseel && pwd && git status && git branch --show-current && git log --oneline -5`
3. Read `AGENT_CONTEXT/CURRENT_STATE.md` (specifically the `▶️ RESUME FROM
   HERE` block).
4. Run `npx tsc --noEmit` to confirm baseline is clean.
5. Continue with the next item in `WAVE_5_PLAN.md`.

## Red flags on resume

- **Working tree not clean** → previous session crashed mid-edit.
  Diff vs `HEAD~1` to see what was being attempted; either finish or
  `git stash` and start fresh from the last green commit.
- **tsc errors on first run** → previous session left broken code.
  Either revert with `git reset --hard HEAD` (after checking what's lost)
  or fix the errors before continuing.
- **`prepared-assets/` is tracked** → someone removed the `.gitignore`
  line. Check with `git ls-files prepared-assets/ | head` — if non-empty,
  re-ignore and `git rm -r --cached prepared-assets/`.

## Conventions

- **One concern per commit.** No "fix typo + add screen + update i18n"
  combos.
- **Type-clean per commit.** `tsc --noEmit` must pass before each push.
- **Push every commit.** Local-only commits = lost work in this
  environment.
- **Don't merge `prepared-assets/` to main.** Ever.
- **Don't squash before the PR.** Squash happens at PR-merge time.

## Useful one-liners

```bash
# Where am I?
git status && git log --oneline -3 && pwd

# Quick tsc sanity check
npx tsc --noEmit 2>&1 | tail -20

# What's git-ignored?
git check-ignore -v prepared-assets

# What changed in the last commit?
git show --stat HEAD
```
