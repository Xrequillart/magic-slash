# Remote relay protocol, v1

The contract between the desktop (`desktop/src/main/remote/`) and the iPhone app
(`ios/MagicSlash/Remote/`). Supabase is only a relay: it authorizes who joins the channel
(`supabase/migrations/20261012090000_realtime_relay.sql`) and never sees a readable payload.

Change this file, `crypto.ts`, `RelayCrypto.swift` and `relay-vectors.json` together.
`npm test` replays the vectors in Node and `npm run ios:relay-check` replays them in Swift.

## 1. Conventions

- **UUIDs** (`userId`, `macId`, `phoneId`, `epoch`) are canonical **lower-case** strings,
  36 characters. Swift's `UUID().uuidString` is upper-case: always call `.lowercased()`.
- **Public keys** are P-256 X9.63 uncompressed points: 65 bytes, `04‖X‖Y`. In JSON they are
  standard base64.
- **Boxes** are AES-256-GCM in CryptoKit's `combined` layout: `nonce(12)‖ciphertext‖tag(16)`,
  standard base64 in JSON, with a random nonce for every message.
- **The token** is 32 random bytes, base64url without padding.
- **Times** are epoch milliseconds.

## 2. Channel

- Topic: `relay:<userId>`. There is one per account, and it is private: Realtime's
  `config.private = true` in Node, and `isPrivate = true` in supabase-swift. Only the account
  itself may join (`relay_topic_owned`).
- Every Mac with remote mode on, and every paired iPhone, joins it.
- **Presence:**
  - key `mac:<macId>` or `phone:<phoneId>`;
  - payload `{}`. Presence is clear text, so it never carries a name or a state.
- **Broadcast:** one event name, `relay`, whose payload is an envelope (§4). Broadcast is not
  replayed: whatever is sent while a socket is down is lost. §6 covers how the protocol lives
  with that.

## 3. Keys

- **Mac:**
  - one P-256 key, used for ECDH only;
  - `macId` is a random UUID;
  - both are kept, together with the paired phones, in a `safeStorage` file per account.
- **iPhone:**
  - one Secure Enclave `P256.KeyAgreement` key, with access control
    `[.privateKeyUsage, .biometryCurrentSet]`;
  - one Secure Enclave `P256.Signing` key, with the same access control, that signs commands
    (§10). Each signature evaluates a fresh `LAContext`, so every command asks for Face ID. It
    is created on the first pairing that finds it missing and never rotated by a later one: the
    other Macs already hold its public half. Losing it (a new face or fingerprint invalidates
    `biometryCurrentSet`) means pairing again;
  - `phoneId` is a random UUID;
  - in DEBUG Simulator builds only, software keys stand in for the Secure Enclave keys.
- **Pair key:**
  ```
  shared = ECDH(own private, peer public)          // 32-byte X coordinate
  key    = HKDF-SHA256(shared,
                       salt = utf8(macId ‖ phoneId),        // 72 bytes, lower-case
                       info = utf8("magic-slash relay v1"),
                       length = 32)
  ```
  The same key seals every message between that Mac and that phone, in both directions,
  `pair-request` included.

## 4. Envelope

```json
{ "v": 1, "type": "state", "from": "<id>", "to": "<id>", "epoch": "<uuid>", "seq": 7, "box": "<b64>" }
```

- The AAD is `utf8("v1|" + type + "|" + from + "|" + to + "|" + epoch + "|" + seq)`, with
  `seq` in decimal. A box therefore cannot be moved to another type, recipient, epoch or seq.
- `from` and `to` are a `macId` or a `phoneId`, depending on direction.
- `epoch` is random per sender session: a Mac draws a new one each time the relay starts. It
  is not secret.
- `seq` starts at 1 and increases on every envelope the sender sends within that epoch, across
  recipients.
- A receiver drops any envelope that is not addressed to itself, comes from an unknown sender,
  or does not open.

| `type` | Direction | Box plaintext (JSON) | Extra clear fields |
| --- | --- | --- | --- |
| `pair-request` | phone → Mac | `{ "token": "<b64url>", "name": "Xavier's iPhone", "signPub": "<b64 x963>" }` | `phonePub` |
| `pair-accepted` | Mac → phone | `{ "macName": "MacBook Pro", "requestEpoch": "<uuid>", "pairingId": "<uuid>" }` | |
| `pair-rejected` | Mac → phone | none: `box` is absent | `reason`: `expired`, `used`, `declined` |
| `state` | Mac → phone | snapshot (§5) | |
| `revoked` | Mac → phone | `{ "pairingId": "<uuid>" }` | |
| `command` | phone → Mac | `{ "payload": "<json string>", "sig": "<b64>" }` (§10) | |
| `command-result` | Mac → phone | `{ "pairingId": "<uuid>", "commandId": "<uuid>", "ok": false, "reason": "stale" }` (§10) | |
| `chat-request` | phone → Mac | `{ "pairingId": "<uuid>", "appAgentId": "claude-…" }` (§11) | |
| `chat` | Mac → phone | the conversation's tail (§11) | |

`signPub` travels inside the box, so it is as authenticated as the pairing itself: the Mac
learns a phone's signing key only from a `pair-request` that the code on both screens
confirmed, and never from any later message. It is optional: a phone paired before it existed
is stored without one, still receives `state`, and gets `re-pair` for any command.

`pair-rejected` is clear text and can be forged by anyone on the channel. The worst a forgery
can do is cancel a pairing on screen, which is accepted.

## 5. State snapshot

```json
{
  "pairingId": "<uuid>",
  "generation": 12,
  "bootId": "<uuid>",
  "sentAt": 1760000000000,
  "macName": "MacBook Pro",
  "agents": [
    {
      "appAgentId": "claude-1760000000000",
      "title": "PROJ-12: refunds",
      "state": "working",
      "usage": {
        "costUsd": 1.23, "contextPercent": 41, "model": "Opus 4.5",
        "fiveHourPercent": 12, "fiveHourResetsAt": 1760003600,
        "sevenDayPercent": 30, "sevenDayResetsAt": 1760500000
      },
      "question": {
        "token": "<uuid>",
        "kind": "ask",
        "receivedAt": 1760000000000,
        "unsupported": false,
        "questions": [
          {
            "prompt": "Which database?",
            "header": "Database",
            "multiSelect": false,
            "options": [{ "label": "Postgres", "description": "The default" }, { "label": "SQLite" }]
          }
        ]
      }
    }
  ]
}
```

- `bootId` is drawn at random at each launch of the Mac app, and again whenever the Mac forgets
  the `commandId`s it remembered (the relay paused on a refused session, or another account
  signed in). A relay that only restarts keeps it. A `prompt` or a `stop` quotes it (§10); the
  phone keeps the latest it read for that Mac, and orders nothing by it.
- `state` is `TerminalState`: `idle`, `working`, `waiting`, `completed` or `error`.
- `usage` is `null` until Claude Code's status line has reported once. Any of its fields may be
  `null`. `*ResetsAt` are epoch **seconds**, as Claude Code reports them.
- `question` is the agent's pending question, or `null`:
  - `kind` is `ask` (AskUserQuestion) or `permission`. A permission has one question whose
    options are empty: the phone offers Allow and Deny.
  - `questions` holds one entry, or several for an AskUserQuestion that asked more than one.
    `header` and `description` may be absent.
  - `unsupported` means the Mac cannot answer it from a remote choice (several questions or no
    options in terminal mode, or the user typed in that terminal): the phone shows it with
    "answer on the Mac" and offers no choice.
  - `token` is what a `command` must quote. A new question gets a new token, and a question
    expires 30 minutes after `receivedAt`.
  - `preview` is present on a permission only: the terminal's last lines, which show the
    command the permission is about (its `prompt` is just the notification's one-liner). It
    keeps its last 4000 characters.
  - It is bounded: at most 4 questions, at most 10 options each, a header or description cut
    at 300 characters. A prompt and a label are never cut, since the user answers what they
    read: a question with more than 4 questions, a prompt over 2000 characters or a label
    over 300 is sent `unsupported` instead. Options past the 10th are
    left out, past the 9th for a multi-select asked in terminal mode (it is answered by
    single digits), and only those can no longer be picked from the phone.
- `appAgentId` is the desktop terminal id, which is also `agents.app_agent_id`. The phone joins
  on it.
- The snapshot is complete: the phone replaces everything it knows about that Mac with it.
- Agents whose id starts with `script-` or `sidebar-` are not agents and are never sent.

The Mac sends a snapshot to every paired phone:

- immediately on a runtime state change;
- on a usage change, at most once every 2 s;
- when a `phone:` presence joins, debounced by 1 s;
- every 30 s as a heartbeat.

## 6. Freshness and replay (phone side)

- **No decision here reads the Mac's clock.** A Mac whose clock moves backward must keep
  updating its phones, so `sentAt` is shown, never compared. Ordering uses `generation`: a
  counter the Mac persists and increments each time its relay starts, alongside a fresh `epoch`.
- Per Mac, the phone remembers the last accepted `(generation, epoch, seq)`. It accepts a `state`
  when either:
  - `generation` is greater; or
  - `generation` and `epoch` are the same and `seq` is greater.
- The Mac is **online** when its `mac:<macId>` presence is present **and** the last snapshot is
  under 75 s old, measured from the moment the phone accepted it, on the phone's clock (never
  from its `sentAt`, which is the Mac's clock). Otherwise it is shown offline, with that
  snapshot labelled as the last known state, never as the current one.
- The phone caches the last snapshot per Mac so that it can show it after a relaunch.
- **Pairings never replay into each other.** The same phone and Mac derive the same pair key
  every time they pair, so a recorded envelope from an earlier pairing still opens. Each pairing
  is therefore named by a `pairingId`, a random lower-case UUID the Mac draws on approval, and
  the phone drops:
  - a `pair-accepted` whose `requestEpoch` is not the epoch of the `pair-request` it is waiting
    on (§7 step 5);
  - a `revoked` or a `state` whose `pairingId` is not the one it saved for that Mac (§8).

## 7. Pairing

1. **QR on the Mac.** It is shown only while remote mode is on:
   ```json
   { "v": 1, "macId": "<uuid>", "name": "MacBook Pro", "pub": "<b64 x963>", "token": "<b64url>", "exp": 1760000060000 }
   ```
   The token is valid for 60 s and single-use. A fresh one replaces it on expiry. It travels
   **only** through the QR, never over the relay in clear.
2. **The phone scans it.** It then:
   - generates its Secure Enclave key, which needs Face ID;
   - derives the pair key from that key and `pub`;
   - sends a `pair-request` envelope with `from` = phoneId, `to` = macId, a fresh `epoch`,
     `seq` 1 and `phonePub` in clear;
   - shows the code (step 4).
3. **The Mac:**
   - opens the box with ECDH(mac, `phonePub`);
   - compares the token in constant time against the current one, and checks it has not
     expired;
   - **consumes the token on the first request that opens**, whatever happens next;
   - answers an expired or already-used token with `pair-rejected` to that sender, and leaves its
     own screen as it was: only the current token moves the Mac to the confirmation;
   - ignores a box that does not open, and a token it never issued: neither reaches the screen,
     so a phone that never saw the current QR cannot interrupt a pairing in progress.
4. **Code.** `SHA-256(tokenBytes(32) ‖ macPub(65) ‖ phonePub(65))`; take the first 4 bytes as
   a big-endian UInt32, mod 10000, and zero-pad to 4 digits. Both screens show it.
5. **Approval on the Mac only.** Approve stores `{phoneId, name, pub, pairedAt, pairingId}` and
   sends `pair-accepted`, carrying the request's `epoch` as `requestEpoch` and that `pairingId`.
   `pairedAt` is for display only. Decline sends `pair-rejected` with reason `declined`. The phone
   saves the Mac (`macId`, `name`, `pub`, `pairingId`) only on a `pair-accepted` that answers its
   own pending request.
6. **One deadline for both ends.** The Mac's confirmation expires **120 s** after the request
   opened: it then answers `pair-rejected` with reason `expired` and approval is no longer
   possible. The phone waits **180 s**, so any approval the Mac can still give reaches a phone
   that is still listening.

## 8. Revocation

The Mac sends `revoked`, carrying the device's `pairingId`, then deletes the device's key. It never encrypts for
that device again, so a revoked phone receives nothing it can read, even with a valid
Supabase session. On a `revoked` whose `pairingId` matches its pairing, the phone forgets the Mac.

"Forget this Mac" on the phone is local only in v1: the Mac keeps sealing for it until it is
revoked there too.

## 9. Remote mode

Remote mode is a Mac-local setting, off by default, and never written to the cloud. While it
is off:

- no channel is joined;
- no QR is offered;
- nothing is published.

While it is on, `powerSaveBlocker('prevent-app-suspension')` is held. That keeps the app
running but does not stop a closed lid from sleeping the Mac, which is what §6's 75 s rule
covers.

## 10. Commands (phone → Mac)

The action set is closed: `answer`, `prompt` and `stop`. Any other is refused as `invalid`.

A `command` box holds `{ "payload": "<string>", "sig": "<b64>" }`. `payload` is a JSON object
serialized **once** by the phone, and `sig` is the ECDSA P-256 / SHA-256 signature of its exact
UTF-8 bytes, as CryptoKit's `rawRepresentation` (`r‖s`, 64 bytes). Nothing is re-serialized
before checking, so neither side needs a canonical JSON form.

```json
{
  "v": 1, "action": "answer",
  "macId": "<uuid>", "phoneId": "<uuid>", "pairingId": "<uuid>",
  "commandId": "<uuid>", "issuedAt": 1760000000000,
  "appAgentId": "claude-1760000000000", "token": "<question token>",
  "choice": { "kind": "option", "index": 0 }
}
```

A `prompt` and a `stop` carry the same common fields (`v` to `appAgentId`), no `token` and no
`choice`, and the `bootId` of the last snapshot the phone read from that Mac (§5):

```json
{
  "v": 1, "action": "prompt",
  "macId": "<uuid>", "phoneId": "<uuid>", "pairingId": "<uuid>",
  "commandId": "<uuid>", "issuedAt": 1760000000000,
  "appAgentId": "claude-1760000000000",
  "text": "Add a test for the refund", "bootId": "<uuid>"
}
```

```json
{
  "v": 1, "action": "stop",
  "macId": "<uuid>", "phoneId": "<uuid>", "pairingId": "<uuid>",
  "commandId": "<uuid>", "issuedAt": 1760000000000,
  "appAgentId": "claude-1760000000000",
  "bootId": "<uuid>"
}
```

- `text` is what the person typed, sent as is. The Mac formats it as the desktop chat does
  (a newline or more than 200 characters goes as a bracketed paste, control bytes are
  dropped), then submits it with Return, through the chat's own sequence.
- `text` must hold something once its control bytes are dropped, and at most **10 000**
  characters (UTF-16 code units). Otherwise: `invalid`.
- An `answer` may carry a `bootId` too; it is ignored there.

`choice` is one of:

- `{ "kind": "option", "index": n }`: one option, or Allow (index 0) for a permission;
- `{ "kind": "options", "indexes": [n, …] }`: a multi-select question;
- `{ "kind": "answers", "answers": ["…"] }`: one label per question, for a question asked
  several at once;
- `{ "kind": "deny" }`: deny a permission. It is `invalid` on an ask: Escape would
  interrupt the agent rather than answer it.

**The Mac checks, in this order**, and nothing reaches a terminal unless every step passes:

1. `from` is a paired device. Unknown or revoked: dropped, no answer, since there is no key to
   answer with.
2. The box opens with that device's pair key. Otherwise: dropped.
3. The box parses as `{payload, sig}`. A device stored without `signPub`: `re-pair`.
4. `sig` verifies against the device's `signPub` over the bytes of `payload`. Otherwise:
   `rejected`.
5. `payload` parses, `v` is 1, `phoneId` equals `from`, `macId` is this Mac and `pairingId`
   is the device's. Otherwise: `rejected`.
6. `issuedAt` is within **5 minutes** of the Mac's clock, either way. Otherwise: `rejected`.
7. `commandId` was not seen before. A command seen before is **not run again**: the Mac
   answers with the `command-result` it sent the first time, so a phone that retried after a
   lost reply still learns the outcome. A `commandId` is remembered only once its signature has
   verified, until `issuedAt` + 5 minutes, at most 1000 at a time.
8. `action` is one of the closed set, with its fields: for `answer`, a `token` and a `choice`
   in one of the shapes above; for `prompt`, a `text` as above and a string `bootId`; for
   `stop`, a string `bootId`. Otherwise: `invalid`. A `prompt` or `stop` whose `bootId` is not
   this launch's: `rejected`.
9. Right before acting: the device is still paired, the relay still serves an account, and
   `appAgentId` is an agent terminal owned by that account (as for snapshots, §5). Otherwise:
   `stale`. Then:
   - an `answer` goes through the same path as the Mac's own tray, with `token`;
   - a `prompt` is refused `unsupported` when `text`, past its leading whitespace, starts with
     `!` (Claude Code's shell mode: the phone does not run shell commands) or is one of the
     built-in commands that open a dialog of the TUI (`/model`, `/mcp`, `/permissions`… the
     desktop chat's list), since nobody at the Mac would be there to close it. It is refused
     `busy` while the agent is `waiting` or has a pending question: the bytes would land in
     the dialog. Otherwise it is submitted, and to a `working` agent it is **queued** by
     Claude Code, read after the current turn, as from the desktop chat;
   - a `stop` on a `working` or `waiting` agent sends Escape, as the chat's Stop button does,
     and on a `waiting` one forgets the pending question too. On any other state it is
     `stale`: there is no turn to stop, and Escape at an idle prompt is not harmless (twice
     opens Claude Code's rewind menu). A prompt Escape took back, before Claude answered it,
     goes back to the desktop chat's composer.

   The state is read, then the terminal written. An agent that moves in between (its turn
   ends, a question arrives) still gets the bytes: that race is accepted, and the desktop
   chat has the same one. Step 9 itself (paired, same account, an agent of it) is asked again
   at the moment the text is typed, since a submission already in flight on that terminal can
   hold it back: a phone revoked meanwhile gets nothing typed.

The question token does most of the freshness work for an `answer`: the Mac draws a new random
one for every question, keeps it in memory only and accepts it once. That is why a restart,
which forgets the `commandId` cache, opens no replay: no token from before it still matches.
`issuedAt` bounds what is left, a capture replayed while the same question is still pending.

A `prompt` or a `stop` has no token, so `bootId` does that work: a restart draws a new one, as
does anything else that empties the `commandId` cache, and a command captured before it no
longer quotes the Mac's. This closes the replay after a
restart without trusting the phone's clock: a phone whose clock runs minutes ahead would
otherwise sign a command that, replayed right after a restart, still falls within step 6's
window while the `commandId` that would have refused it is forgotten. Within one launch, the
`commandId` cache refuses the replay; a command signed just before a restart is refused
`rejected`, by design, and the phone sends it again once it has read the new snapshot.

This is the one place the Mac's clock is compared to the phone's. §6 keeps the phone from
reading the Mac's clock for ordering; a command is different, since it is a request the Mac
judges alone.

`command-result` (Mac → phone, sealed for that device) answers every command that reached
step 3: `{ "pairingId", "commandId", "ok", "reason"?, "queued"? }`. `queued: true` is present
only on an `ok` prompt that was sent while the agent was `working`.

| `reason` | `answer` | `prompt` | `stop` |
| --- | --- | --- | --- |
| none (`ok: true`) | the answer reached the agent | the prompt was submitted (`queued`: after the current turn), after any submission already in flight on that terminal, so two never merge | Escape was sent |
| `stale` | already answered on the Mac, replaced by a newer question, expired, or the agent is gone | the agent is gone | nothing to stop (idle, finished), or the agent is gone |
| `unsupported` | the question cannot be answered remotely: answer it on the Mac | a `!` shell line or a command that opens a dialog | |
| `busy` | another answer to it is being typed right now | the agent waits on a question: answer it first | |
| `write-failed` | the terminal did not take the keystrokes; the question is still pending | the terminal did not take the text | the terminal did not take Escape; nothing stopped, the question is still pending |
| `invalid` | an action or a choice the Mac does not accept | no text, an empty one or one over 10 000 characters, or no `bootId` | no `bootId` |
| `rejected` | signature, identifiers or clock | the same, or a `bootId` the Mac has since replaced | the same |
| `re-pair` | this phone was paired before commands existed: pair it again | the same | the same |

The phone accepts a `command-result` only from the Mac it sent the command to, carrying that
Mac's saved `pairingId` and a `commandId` it is waiting on; it ignores any other. It is not part
of §6's `(generation, epoch, seq)` ordering, which is for `state` alone.

## 11. Conversation (phone ↔ Mac)

The phone reads an agent's conversation as the desktop chat shows it: the entries
`desktop/src/main/chat/transcript.ts` reads off Claude Code's transcript, bounded
(`remote/chat.ts`). It is pulled, never pushed unasked, and only while the session's screen
is open on the phone.

1. **`chat-request`** (phone → Mac): `{ "pairingId", "appAgentId" }`, sealed with the pair key,
   with the phone's own `epoch` and a `seq` that grows across every envelope it sends (commands
   included). It is not a command: it changes nothing on the Mac and is only ever answered to its
   sender, so it carries no signature and asks for no Face ID. The Mac drops it unless it comes
   from a paired phone, opens, names that phone's current `pairingId`, moves forward in `seq`
   within its epoch (a replay renews nothing), and names an agent this account's snapshots carry.
2. **Lease.** A request accepted subscribes that phone to that agent for **45 s**, and to no other:
   one agent per phone, the screen it has open. The phone renews it every 15 s while the screen
   stays open, and on every snapshot that brings its Mac back online. Leaving the screen just
   stops the renewals. A revoked phone loses its lease with its key.
3. **`chat`** (Mac → phone): sent at once in answer to a request, then on every change of that
   conversation while the lease runs.
   ```json
   {
     "pairingId": "<uuid>", "appAgentId": "claude-1760000000000", "generation": 12,
     "entries": [
       { "kind": "user", "id": "u1", "text": "Fix the refund", "at": 1760000000000 },
       { "kind": "assistant", "id": "a1", "text": "Looking at it.", "cut": true },
       { "kind": "tool", "id": "t1", "name": "Bash", "summary": "npm test", "status": "done" },
       { "kind": "notice", "id": "n1", "text": "Total cost: $0.42" }
     ],
     "queue": [{ "id": "q1", "text": "Then commit" }],
     "hasEarlier": true
   }
   ```
   - Each `chat` is the **complete tail**, never a delta: a lost one is made good by the next.
   - Bounded: the last 80 entries at most, within about 96 kB of JSON, newest kept first. A
     message longer than 4 000 code points is cut and marked `cut`. Tool outputs and diffs stay
     on the Mac. `hasEarlier` says older entries were left out.
   - `tool.status` is `running`, `done` or `error`. An unknown `kind` is skipped by the phone.
4. **Ordering.** The phone accepts a `chat` only from a paired Mac, naming that Mac's saved
   `pairingId`, and newer than the last `chat` it accepted from that Mac by §6's rule on
   `(generation, epoch, seq)`, `generation` read from the box. The conversation is held in
   memory only, never cached to disk.

