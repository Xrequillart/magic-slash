# Spec file setup

The commands Step 2.4 runs to exclude `.magic/` from git and create the spec file, and why each
part of them is there. Read §1 in Step 2.4 and run its blocks, on every run. Read §2-§3 only before
changing one of those commands, or when a run leaves the spec or the `.magic/` exclusion somewhere
unexpected.

## 1. The commands

**Exclude `.magic/` from git first**, before writing anything:

```bash
cd {REPO_PATH}
EX="$(git rev-parse --git-path info/exclude)"; mkdir -p "$(dirname "$EX")"; touch "$EX"
grep -qxF '.magic/' "$EX" || { [ -s "$EX" ] && [ -n "$(tail -c1 "$EX")" ] && printf '\n' >> "$EX"; printf '.magic/\n' >> "$EX"; }
```

Then create the file, still in `{REPO_PATH}`:

```bash
mkdir -p .magic
echo ".magic/spec-{SLUG}-$(date +%Y%m%d-%H%M%S).md"
```

`{SLUG}` is a placeholder you substitute, not a shell variable — nothing above assigns it, so leaving
it as `$SLUG` would expand to the empty string and produce `spec--20260820-093000.md`. Derive it from
the idea: lower-cased, non-alphanumerics collapsed to hyphens, ~5 words or 30 characters.

## 2. `cd {REPO_PATH}` and the exclusion

`cd {REPO_PATH}` is not optional, and it is not the cwd. `/magic:plan` is invoked from wherever the
user happens to be standing, and Step 2.2 exists precisely because that is usually **not** the
repository they picked — so both commands here are relative to a repo this shell has not entered
yet. Without the `cd`, `git rev-parse` resolves the exclude file of the wrong repository and
`mkdir -p .magic` writes the spec there: two silent side effects in a repository nobody asked about,
and no spec where one was promised. Substitute the path from the config entry chosen in Step 2.2,
and keep every later command in this step in the same directory.

The exclusion itself is idempotent: `grep -qxF` makes any later run a no-op. The newline guard is not
cosmetic — if `info/exclude` does not end with a newline, a plain append produces
`node_modules.magic/`, `.magic/` is then **not** ignored, and the `git add -A` of `/magic:commit`
commits the spec.

## 3. The timestamp in the filename

**The timestamp is not decoration.** The slug derives from the idea, so planning the same idea twice
on one repository produces the same filename — and #194 keys a spec's cloud row on a hash of its
path, so the second session would silently overwrite the first, on disk and in the cloud. It also
gives `.magic/` a chronological sort, which is what makes a directory of specs readable.
