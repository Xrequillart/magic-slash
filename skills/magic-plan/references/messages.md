# Messages Reference

> Select the message variant matching `languages.discussion` config value. Default is `en`.
>
> `languages.discussion` governs **this file** — how the skill talks. It does **not** govern the
> spec file or the ticket bodies: those are written in `languages.ticket` (resolved through the
> `ticket` → `jiraComment` → `en` chain). The two are independent, and a French-speaking developer
> filing English tickets for an international team is the normal case, not an edge case.

## MSG_APP_NOT_RUNNING

### en

```text
❌ Magic Slash Desktop is not running

Your configuration lives in the cloud and only the app can read it, so there is
nothing reliable to work from until it is open.

Launch Magic Slash, then run this command again.
```

### fr

```text
❌ Magic Slash Desktop n'est pas lancé

Ta configuration est dans le cloud et seule l'app peut la lire : sans elle, il n'y a
rien de fiable sur quoi travailler.

Lance Magic Slash, puis relance cette commande.
```

## MSG_DESCRIBE_IDEA

### en

```text
What's the idea?

Describe it in your own words — a sentence is enough. I'll explore the codebase,
ask about whatever is genuinely ambiguous, write a spec you can review, and only
then create the tickets.
```

### fr

```text
C'est quoi l'idée ?

Décris-la avec tes mots — une phrase suffit. Je vais explorer la codebase, te poser
des questions sur ce qui est vraiment ambigu, écrire une spec que tu pourras
relire, et créer les tickets seulement après.
```

## MSG_REPO_SELECT

### en

```text
Which repository is this for?

{repo_list}

I need it before anything else: it decides which codebase I explore, which tracker
receives the tickets, and where existing tickets are searched for duplicates.
```

### fr

```text
Pour quel repository ?

{repo_list}

J'en ai besoin avant tout le reste : il détermine la codebase que j'explore, le
tracker qui recevra les tickets, et l'endroit où je cherche les doublons.
```

> Fill `{repo_list}` with one line per repository, in the order Step 2.1 ranked them:
> `  - {name} — {reason}`, where `{reason}` is `current directory` / `répertoire courant`,
> `matches {keywords}` / `correspond à {keywords}`, or empty for the rest.
> The ranking is a pre-selection, never a decision: every configured repository stays offered.

## MSG_TRACKER_ASK

### en

```text
Where should the tickets be created for **{repo}**?

`plan.tracker` is set to "ask" and the repository's own configuration does not
settle it, so this one is yours to answer.
```

### fr

```text
Où faut-il créer les tickets pour **{repo}** ?

`plan.tracker` vaut "ask" et la configuration du repository ne tranche pas : c'est
donc à toi de décider.
```

> Offer only the trackers `references/trackers.md` §1 says can actually receive a ticket — an option
> whose answer leads straight to `MSG_JIRA_NOT_CONFIGURED` is a question asked for nothing. Label
> each with its concrete destination (`PROJ`, `github.com/acme/api`), never with the bare product
> name, for the same reason `MSG_APPROVAL` names the backlog rather than the tracker.
>
> Ask this **once** per run. `references/trackers.md` §1.1 carries the answer forward for every
> later consumer, so no step re-asks.

## MSG_TRACKER_NONE

### en

```text
❌ **{repo}** has no backlog to file into

No GitHub remote and no Jira project key — so there is nowhere for these tickets to
go, and nothing worth asking either: every option I could offer leads to the same
dead end.

Give it one of the two and run this again — a Jira project key in the repository's
Jira settings, or a GitHub remote on the repository itself. Nothing was explored and
nothing was created.
```

### fr

```text
❌ **{repo}** n'a aucun backlog où déposer les tickets

Pas de remote GitHub et pas de clé de projet Jira : il n'y a nulle part où créer ces
tickets, et rien à te demander non plus — toutes les options que je pourrais
proposer mènent à la même impasse.

Renseigne l'un des deux et relance — la clé du projet Jira dans les réglages Jira du
repository, ou un remote GitHub sur le repository lui-même. Rien n'a été exploré et
rien n'a été créé.
```

> `{repo}` is the repository resolved at Step 2.1. This is a refusal, not a question:
> `references/trackers.md` §1 reaches it only when **neither** tracker qualifies, and offering a
> tracker that cannot receive a ticket is the one thing rows 3 and 5 forbid. It fires at Step 2.3,
> before the brainstorm, for `MSG_JIRA_NOT_CONFIGURED`'s reason.
>
> Name the two settings rather than implying a mistake: a repository added by path and never cloned
> reaches this legitimately, and it is a configuration that was never made, not one that is wrong.

## MSG_JIRA_NOT_CONFIGURED

### en

```text
❌ Jira is the tracker for **{repo}**, but it cannot receive tickets

{reason}

I'm stopping here rather than after the brainstorm: an hour of exploration and
framing that ends on "I can't create this" is worse than a refusal on the second
question.

I will not file this in GitHub instead — a Jira-destined idea landing in a backlog
that project's team does not read is worse than no ticket at all. Either fix the
setting ({fix}), or create the Jira ticket by hand and pick it up with
`/magic:start {JIRA-KEY}`.
```

### fr

```text
❌ Jira est le tracker de **{repo}**, mais il ne peut pas recevoir de tickets

{reason}

Je m'arrête maintenant plutôt qu'après le brainstorm : une heure d'exploration et
de cadrage qui finit par « je ne peux pas créer ça » est pire qu'un refus à la
deuxième question.

Je ne vais pas les créer dans GitHub à la place — une idée destinée à Jira posée
dans un backlog que l'équipe de ce projet ne lit pas est pire que pas de ticket du
tout. Soit tu corriges le réglage ({fix}), soit tu crées le ticket Jira à la main
et tu l'attaques avec `/magic:start {JIRA-KEY}`.
```

> `{reason}` names the exact blocker, in one line — `the Atlassian integration is off for this
> account`, `the Jira project key is empty`, `PROJ resolves on none of the sites I can reach`, `the
> project has no issue type named "Story"`, `Jira did not answer`. The first two are
> `references/trackers.md` §1.2's conditions; the rest are `references/jira-fields.md` §4's stops,
> which this message also carries. `{fix}` names where each is fixed: the integrations toggle, the
> repository's Jira settings, the Jira project itself, or nothing at all when Jira is simply down.
> Never merge them into a vague "Jira is not configured" — they are fixed in different places, and
> one of them is not the user's fault.
>
> `{JIRA-KEY}` is displayed as written: the ticket does not exist yet, so there is no key to
> substitute.

## MSG_SPEC_CREATED

### en

```text
📄 Spec started — {spec_path}

I'll fill it in as we go, so you can open it at any moment and see exactly where
the thinking stands. It is git-excluded, never committed, and it is what the
tickets will be generated from.
```

### fr

```text
📄 Spec démarrée — {spec_path}

Je la remplis au fil de l'eau : tu peux l'ouvrir à tout moment et voir où en est
la réflexion. Elle est exclue de git, jamais committée, et c'est à partir d'elle
que les tickets seront générés.
```

## MSG_EXPLORING

### en

```text
🔍 Exploring **{repo}** to see how this fits the existing code...
```

### fr

```text
🔍 Exploration de **{repo}** pour voir comment ça s'articule avec le code existant...
```

## MSG_DUPLICATES_FOUND

### en

```text
🔗 This may already be tracked

{ticket_list}

Read these before we go further — one of them may already cover the idea, or may
have been closed for a reason worth knowing.

Options:
1. Continue — none of these covers it
2. Stop — this is already tracked
3. Continue with a narrowed scope — I'll fold the overlap into the framing
```

### fr

```text
🔗 C'est peut-être déjà suivi

{ticket_list}

Regarde-les avant qu'on aille plus loin : l'un d'eux couvre peut-être déjà l'idée,
ou a été fermé pour une raison qui vaut le détour.

Options :
1. Continuer — aucun ne couvre le sujet
2. Arrêter — c'est déjà suivi
3. Continuer avec un périmètre réduit — j'intègre le recouvrement au cadrage
```

> Format each entry as `  - {id}: {title} ({state}) — {why_related}` with its URL, where `{id}`
> is `#{number}` on GitHub and the issue key (`PROJ-123`) on Jira.
> Never list a ticket without saying why it looked related: an unexplained list is noise
> the user has to re-investigate themselves.

## MSG_NO_DUPLICATES

### en

```text
🔗 No existing ticket covers this — nothing found in {searched_scope}.
```

### fr

```text
🔗 Aucun ticket existant ne couvre ça — rien trouvé dans {searched_scope}.
```

> `{searched_scope}` is the scope the search actually ran against — `acme/api` on GitHub, `PROJ` on
> Jira. "Nothing found" means nothing without saying where.

## MSG_JIRA_REQUIRED_FIELDS

### en

```text
**{project}** makes {field_count} field(s) mandatory that I cannot fill myself

{field_list}

Jira refuses a creation that omits them, so I need the values before proposing the
structure — not at creation time, where the answer would come back as a 400 after
the whole brainstorm.
```

### fr

```text
**{project}** rend obligatoires {field_count} champ(s) que je ne peux pas remplir seul

{field_list}

Jira refuse une création qui les omet : il me faut donc les valeurs avant de
proposer la structure, et pas au moment de la création, où la réponse serait un 400
après tout le brainstorm.
```

> `{project}` is the carried `project_key`, `{field_count}` the length of `must_ask_fields`, and
> `{field_list}` one line per field: `  - {display name} — required on {issue type}`, plus the
> expected shape when it is not a plain string. Name the issue type: a field mandatory on the story
> type and not on the epic is a different situation, and the user is entitled to see which.
>
> These fields ride **inside Step 4's `AskUserQuestion` batch** — never a separate round-trip. That
> batch is capped in how many questions one call can carry, and Step 4's own framing questions are
> in it too, so one question carries **several fields** whenever they can be answered together: a
> group of short free-text or single-select fields becomes one question listing them, and only a
> field that needs its own options list gets a question to itself. Pack them into as few questions
> as will hold them, and put the framing questions in the same call.
>
> When even that will not fit the batch, **drop nothing**: display `MSG_JIRA_TOO_MANY_FIELDS` and
> let the user pick one of its three options. A mandatory field quietly left unasked comes back as a
> 400 at creation time, after the whole brainstorm — which is the outcome
> `references/jira-fields.md` exists to remove.
>
> Render each field per `references/jira-fields.md` §3, which decides when a field becomes options
> and when it becomes a plain-words question.

## MSG_JIRA_TOO_MANY_FIELDS

### en

```text
⚠️ **{project}** makes {field_count} fields mandatory — more than one round of
framing questions can ask for

{field_list}

{fit_count} of them fit into the framing questions. A mandatory field I never ask
about comes back as a 400 at creation time, after the whole brainstorm, and
quietly dropping the rest is the one thing I will not do.

Options:
1. Ask in a second round — the {overflow_count} that did not fit, in one extra
   batch of questions right after the framing ones
2. Ask only the {fit_count} that fit — creation is then rejected on the rest, and
   I report that rejection with the field it names
3. Stop — give these fields a default in the project's own configuration, or stop
   requiring the ones that do not need to be, then run this again

Nothing has been created yet.
```

### fr

```text
⚠️ **{project}** rend obligatoires {field_count} champs — plus qu'un tour de
questions de cadrage ne peut en demander

{field_list}

{fit_count} d'entre eux tiennent dans les questions de cadrage. Un champ
obligatoire que je n'ai pas demandé revient en 400 au moment de la création, après
tout le brainstorm, et abandonner les autres en silence est la seule chose que je
ne ferai pas.

Options :
1. Demander en deux tours — les {overflow_count} restants, dans un lot de
   questions juste après celles de cadrage
2. Ne demander que les {fit_count} qui tiennent — la création sera alors refusée
   sur les autres, et je signale ce refus avec le champ qu'il nomme
3. Arrêter — donne une valeur par défaut à ces champs dans la configuration du
   projet, ou arrête de rendre obligatoires ceux qui n'ont pas à l'être, puis
   relance

Rien n'a encore été créé.
```

> `{project}` is the carried `project_key`, `{field_count}` the number of mandatory fields the
> discovery pass found that it cannot fill itself, `{fit_count}` how many of them Step 4's question
> batch can carry, and `{overflow_count}` the rest. `{field_list}` uses the same one-line-per-field
> rendering as `MSG_JIRA_REQUIRED_FIELDS` and lists **every** field, the overflow included: not
> dropping one in silence is the whole point, and a field the user cannot see is one they cannot
> decide about.
>
> This is the surface for **both** of `references/jira-fields.md` §3's overflow cases — a must-ask
> set larger than one `AskUserQuestion` batch can hold, and the same set still not fitting after
> packing. Same cause, same three options, so one message rather than two. There is no field-count
> threshold behind it: nine mandatory fields is an ordinary company-managed project, and the only
> limit is what one batch can carry.
>
> Options 1 and 2 both continue the run, so this is an `AskUserQuestion` and not a refusal. Option 2
> is chosen with its consequence already stated: the creation reaches `references/trackers.md` §4
> with a rejection naming the field, reported as the failure it is. Option 3 stops at **Step 4** —
> after the framing dialogue, before Step 5 writes `## Proposed tickets`, and long before anything is
> created.
>
> This message fires at Step 4 and **not** at Step 2.3, unlike every other message the discovery pass
> can raise. `{fit_count}` is how many fields Step 4's batch can carry *alongside its own framing
> questions*, and that is only knowable there — a count produced at 2.3 would be a guess about a
> batch not yet composed. What still happens at 2.3 is the detection of the fields themselves, which
> is what keeps the 400 out of creation time; only the question about how to ask them waits.

## MSG_JIRA_FIELDS_UNKNOWN

### en

```text
⚠️ I could not read the create screen for **{issue_type}** in {project}

{operation} failed twice, so I do not know which fields that issue type makes
mandatory. Everything else resolved — this is one type's field list, not Jira
being unreachable.

If a mandatory custom field is hiding there, creating the tickets comes back as a
400, after the brainstorm and the spec — the one outcome this check exists to
prevent. So the risk is yours to take or refuse.

Options:
1. Continue — I plan as usual, and that field, if it exists, surfaces at creation
2. Stop — nothing has been created and nothing explored yet
```

### fr

```text
⚠️ Je n'ai pas pu lire l'écran de création de **{issue_type}** dans {project}

{operation} a échoué deux fois : je ne sais donc pas quels champs ce type d'issue
rend obligatoires. Tout le reste a été résolu — c'est la liste des champs d'un
type, pas Jira qui est injoignable.

S'il s'y cache un champ obligatoire, la création reviendra en 400 au moment de
créer les tickets, après le brainstorm et la spec — exactement ce que cette
vérification sert à éviter. C'est donc à toi de prendre le risque ou de refuser.

Options :
1. Continuer — je planifie normalement, et ce champ, s'il existe, apparaîtra à la
   création
2. Arrêter — rien n'a été créé et rien n'a encore été exploré
```

> `{issue_type}` is the type whose create screen could not be read — the epic type or the story
> type, named, because which one it is decides what the risk covers. `{project}` is the carried
> `project_key` and `{operation}` is what was attempted, in the user's words: `the required-field
> discovery`.
>
> This fires at **Step 2.3**, before the spec exists, which is why it says nothing about a spec
> being intact and why `MSG_TRACKER_ERROR` is not the message here. It carries its own options
> because `references/jira-fields.md` §4 promises a choice, and a promised choice needs a message
> that presents it — the convention `MSG_APPROVAL` and `MSG_TRACKER_ASK` already follow.
>
> It is the only non-stop outcome in that section; every other failure there is a stop with
> `MSG_JIRA_NOT_CONFIGURED`. On option 1, `references/trackers.md` §3.4's `unknown` rule governs the
> values that were not read: their routes are attempted, not skipped.

## MSG_SIZING_VERDICT

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Sizing — {verdict}

{justification}

{breakdown}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Découpage — {verdict}

{justification}

{breakdown}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> `{verdict}` is `single story` / `epic + {n} stories` (`une story` / `epic + {n} stories`).
> `{justification}` names the criterion from `references/sizing.md` that decided it, and the
> `plan.splitting` mode in force. `{breakdown}` is one line per proposed ticket:
> `  {n}. {title} — {one-line deliverable}`.

## MSG_SPEC_REVIEW

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 The spec is complete — {spec_path}

  Idea         : {idea_summary}
  Decisions    : {decision_count} framing points resolved
  Findings     : {finding_count} codebase findings
  Structure    : {verdict}
  Criteria     : {acceptance_format}

Open it and read it. Nothing has been created yet — this is the last moment where
changing your mind costs nothing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 La spec est complète — {spec_path}

  Idée         : {idea_summary}
  Décisions    : {decision_count} points de cadrage tranchés
  Constats     : {finding_count} constats sur la codebase
  Structure    : {verdict}
  Critères     : {acceptance_format}

Ouvre-la et lis-la. Rien n'a encore été créé : c'est le dernier moment où changer
d'avis ne coûte rien.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_APPROVAL

### en

```text
Create these {ticket_count} tickets in {tracker_target}?

Options:
1. Create them — the structure is right
2. Adjust the breakdown — merge, split, reorder or reword before creating
3. Stop — keep the spec, create nothing
```

### fr

```text
Je crée ces {ticket_count} tickets dans {tracker_target} ?

Options :
1. Les créer — la structure est bonne
2. Ajuster le découpage — fusionner, séparer, réordonner ou reformuler avant création
3. Arrêter — je garde la spec, je ne crée rien
```

> `{tracker_target}` is the concrete destination — `github.com/acme/api`, or `PROJ` on
> `acme.atlassian.net` — never the bare word "GitHub" or "Jira". The user is approving a write to a
> specific backlog and is entitled to see which.
> Option 3 keeps the spec on disk: the thinking is worth keeping even when the tickets are not.

## MSG_TICKETS_CREATED

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ {ticket_count} tickets created in {tracker_target}

{ticket_list}
{hierarchy_route}
📄 Spec updated with the links — {spec_path}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ {ticket_count} tickets créés dans {tracker_target}

{ticket_list}
{hierarchy_route}
📄 Spec mise à jour avec les liens — {spec_path}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> On an epic breakdown, render `{ticket_list}` as the hierarchy that was actually created:
> the epic on its own line, each story indented under it, every line carrying the
> tracker-issued identifier — `#{number}` on GitHub, `PROJ-123` on Jira — and its URL. A flat
> list would hide whether the parent/child links landed.
>
> `{hierarchy_route}` is one line naming the route the parent/child links actually took — native
> `parent`, `Epic Link`, or an issue link (`references/trackers.md` §3.4). Which one landed decides
> what the epic will show in the Jira UI, so it is a fact about the result, not an implementation
> detail. On GitHub there is only one route: leave it empty.

## MSG_PARTIAL_CREATION

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Partial creation — {created_count} of {ticket_count} tickets exist

Created:
{created_list}

Failed:
{failed_list}

Nothing was rolled back: a created ticket is a real ticket, and deleting it would
be worse than leaving it. The spec at {spec_path} holds the full intended
structure, so what failed can be created from it — by hand, or by re-running the
creation step for the remaining stories only.

Do NOT re-run the whole skill on this idea: it would re-create what already
succeeded and leave duplicates in the backlog.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Création partielle — {created_count} tickets sur {ticket_count} existent

Créés :
{created_list}

En échec :
{failed_list}

Rien n'a été annulé : un ticket créé est un vrai ticket, et le supprimer serait
pire que le laisser. La spec dans {spec_path} contient la structure complète
prévue : ce qui a échoué peut être recréé à partir d'elle — à la main, ou en
relançant l'étape de création pour les stories restantes uniquement.

Ne relance PAS toute la skill sur cette idée : elle recréerait ce qui a réussi et
laisserait des doublons dans le backlog.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> `{created_list}` and `{failed_list}` carry one line each. A created line names the
> tracker-issued identifier (`#412`, `PROJ-1234`) and its URL; a failed one names the reason
> (`403 — no write access`, `422 — label does not exist`, `400 — field "Team" is required on
> Story`, …). "Something went wrong" is not a reason, and the user cannot resume from it.

## MSG_TRACKER_ERROR

### en

```text
⚠️ {tracker} is not answering ({operation} failed twice)

{consequence}

The spec is intact — nothing about it depends on {tracker} being reachable.
```

### fr

```text
⚠️ {tracker} ne répond pas (échec de {operation} deux fois de suite)

{consequence}

La spec est intacte — rien en elle ne dépend de la disponibilité de {tracker}.
```

> `{tracker}` is the product name — `GitHub` or `Jira`. This is the one message about a tracker
> being unreachable rather than about a specific backlog, so the name is what the user needs here;
> `MSG_APPROVAL` and `MSG_TICKETS_CREATED` still name the concrete destination. `{operation}` names
> what was attempted, in the user's words — `duplicate search`, `ticket creation`.
>
> `{consequence}` states what the run loses, not what broke: `duplicate check skipped, the
> backlog may already hold this idea` for a failed search, `no ticket was created` for a failed
> write. A search failure degrades the run; a write failure ends it.

## MSG_NEXT_STEPS

### en

```text
💡 Next step

  /magic:start {first_ticket_id}    — start the {first_ticket_scope}

The spec stays at {spec_path} in the main checkout. `/magic:start` creates a
worktree, where an untracked spec does not follow — so read it from there.
```

### fr

```text
💡 Prochaine étape

  /magic:start {first_ticket_id}    — attaquer {first_ticket_scope}

La spec reste dans {spec_path}, dans le checkout principal. `/magic:start` crée un
worktree, où une spec non trackée ne suit pas — c'est donc là qu'il faut la lire.
```

> `{first_ticket_id}` is the first story on an epic breakdown, not the epic: an epic is not
> something you check out a branch for. `{first_ticket_scope}` is that story's short title.

## MSG_ABANDONED

### en

```text
👍 Nothing created. The spec stays at {spec_path} if you want to pick this up later.
```

### fr

```text
👍 Rien de créé. La spec reste dans {spec_path} si tu veux y revenir plus tard.
```
