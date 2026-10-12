# Repository pre-selection

How Step 2.1 ranks the configured repositories before Step 2.2 asks. Read it in Step 2.1, only when
more than one repository is configured.

Rank the configured repositories to make the question easy to answer:

1. **The repository containing the current `pwd`** goes first, labelled as such. Match `$PWD`
   against each repository's `path`, accepting a worktree or a subdirectory of it.
2. **Keyword score** for the rest: score the idea text against each repository's `keywords`,
   case-insensitively and tolerating the usual variants (`backend` matches `back-end`). +5 per
   keyword found in the idea, counted once per keyword.
3. Everything else follows, unranked.

This is a pre-selection and nothing more. **Every configured repository stays offered**, and the
user always has the final say: the idea is one sentence long at this point, so keyword scoring on
it is a weak signal — much weaker than the labels and components `/magic:start` scores against.
