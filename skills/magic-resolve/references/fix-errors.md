# Error handling during fixes

Detail of Step 5 of `/magic:resolve`. Read it only when a comment cannot be applied as written: its file is gone, its line no longer matches, or its intent is unclear.

- **File not found**: If the file referenced by a comment no longer exists (renamed or deleted), skip the comment and add it to the "skipped" list with reason "file not found"
- **Line out of bounds**: If the `line` from the comment no longer matches (code has shifted), use the surrounding code context from the comment's `diff_hunk` to locate the correct position. If still unable to find the relevant code, skip the comment with reason "code context not found"
- **Unclear or ambiguous comment**: If the reviewer's intent cannot be determined with confidence, skip the comment with reason "ambiguous — requires human review"
