# Jira required fields in the framing dialogue

Read this file in Step 4, and only when Step 2.3's pre-flight handed forward required fields it
cannot fill itself (`must_ask_fields`, `references/jira-fields.md` §2). It owns how those fields
are asked, what happens when they do not all fit the batch, and how each answer is recorded.

## 1. Asking

**Fields the tracker requires that nothing else can answer.** When Step 2.3's pre-flight handed
forward required fields it cannot fill itself — today only Jira's, as `must_ask_fields`
(`references/jira-fields.md` §2) — ask for them inside this same `AskUserQuestion` batch, using
`MSG_JIRA_REQUIRED_FIELDS`, whose note owns the shape of the question. This is the one addition that
does not break the rule above: neither the code nor the config can answer it, and the tracker
refuses the creation without it.

When they do not all fit this batch alongside the framing questions, display
`MSG_JIRA_TOO_MANY_FIELDS` and follow the option the user picks. Its first option asks the overflow
in one further `AskUserQuestion` immediately after this batch — the only second round this step ever
makes, and the reason the cap is tested here rather than at Step 2.3, which cannot know what this
batch will hold. Never drop a field silently: one mandatory field left unasked comes back as a 400
at creation time, after the whole brainstorm.

It belongs here rather than at Step 2.3 because the spec only exists from Step 2.4, so a value
collected at 2.3 has nowhere to be recorded — and an unrecorded answer is one nothing keeps once the
session ends. Detection at 2.3, the question here, and Step 5 is still the first step that writes
`## Proposed tickets`.

## 2. Recording the answer

A Jira required-field answer is recorded the same way, its reason naming the issue type that
required it — that row is the audit trail of what was sent to Jira and why, and it is what makes the
spec explain the created ticket on its own, to a reader now or to a resume feature later.
