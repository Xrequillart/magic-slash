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

The repository declares both a Jira project and GitHub issues, and `plan.tracker`
is set to "ask", so this one is yours to answer.
```

### fr

```text
Où faut-il créer les tickets pour **{repo}** ?

Le repository déclare à la fois un projet Jira et des issues GitHub, et
`plan.tracker` vaut "ask" : c'est donc à toi de trancher.
```

## MSG_JIRA_NOT_AVAILABLE

### en

```text
🚧 Jira ticket creation is not available yet

**{repo}** files its tickets in Jira, and this skill can only create GitHub issues
for now — Jira support is tracked in #199.

I'm stopping here rather than after the brainstorm: an hour of exploration and
framing that ends on "I can't create this" is worse than a refusal on the first
question.

In the meantime you can either point this idea at a GitHub-tracked repository, or
create the Jira ticket by hand and pick it up with `/magic:start {JIRA-KEY}`.
```

### fr

```text
🚧 La création de tickets Jira n'est pas encore disponible

**{repo}** gère ses tickets dans Jira, et cette skill ne sait créer que des issues
GitHub pour l'instant — le support Jira est suivi dans #199.

Je m'arrête maintenant plutôt qu'après le brainstorm : une heure d'exploration et
de cadrage qui finit par « je ne peux pas créer ça » est pire qu'un refus à la
première question.

En attendant, tu peux soit viser un repository suivi sur GitHub, soit créer le
ticket Jira à la main et l'attaquer avec `/magic:start {JIRA-KEY}`.
```

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

> Format each entry as `  - #{number}: {title} ({state}) — {why_related}` with its URL.
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

> `{tracker_target}` is the concrete destination, e.g. `github.com/acme/api` — never the bare
> word "GitHub". The user is approving a write to a specific backlog and is entitled to see which.
> Option 3 keeps the spec on disk: the thinking is worth keeping even when the tickets are not.

## MSG_TICKETS_CREATED

### en

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ {ticket_count} tickets created in {tracker_target}

{ticket_list}

📄 Spec updated with the links — {spec_path}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### fr

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ {ticket_count} tickets créés dans {tracker_target}

{ticket_list}

📄 Spec mise à jour avec les liens — {spec_path}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> On an epic breakdown, render `{ticket_list}` as the hierarchy that was actually created:
> the epic on its own line, each story indented under it, every line carrying `#{number}` and
> its URL. A flat list would hide whether the parent/child links landed.

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

> `{created_list}` and `{failed_list}` carry one line each, with the failure reason on the
> failed ones (`403 — no write access`, `422 — label does not exist`, …). "Something went wrong"
> is not a reason, and the user cannot resume from it.

## MSG_GITHUB_ERROR

### en

```text
⚠️ GitHub is not answering ({operation} failed twice)

{consequence}

The spec is intact — nothing about it depends on GitHub being reachable.
```

### fr

```text
⚠️ GitHub ne répond pas (échec de {operation} deux fois de suite)

{consequence}

La spec est intacte — rien en elle ne dépend de la disponibilité de GitHub.
```

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
