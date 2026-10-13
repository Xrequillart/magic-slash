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

The action set is closed: `answer` here; `prompt` and `stop` are reserved and refused as
`invalid` until their own version of this section names them.

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
8. `action` is `answer` and `choice` has one of the shapes above. Otherwise: `invalid`.
9. Right before answering: the device is still paired, the relay still serves an account, and
   `appAgentId` is an agent terminal owned by that account (as for snapshots, §5). Otherwise:
   `stale`. The answer then goes through the same path as the Mac's own tray, with `token`.

The question token does most of the freshness work: the Mac draws a new random one for every
question, keeps it in memory only and accepts it once. That is why a restart, which forgets the
`commandId` cache, opens no replay: no token from before it still matches. `issuedAt` bounds
what is left, a capture replayed while the same question is still pending.

This is the one place the Mac's clock is compared to the phone's. §6 keeps the phone from
reading the Mac's clock for ordering; a command is different, since it is a request the Mac
judges alone.

`command-result` (Mac → phone, sealed for that device) answers every command that reached
step 3:

| `reason` | Meaning |
| --- | --- |
| none (`ok: true`) | the answer reached the agent |
| `stale` | already answered on the Mac, replaced by a newer question, expired, or the agent is gone |
| `unsupported` | the question cannot be answered remotely: answer it on the Mac |
| `busy` | another answer to it is being typed right now |
| `write-failed` | the terminal did not take the keystrokes; the question is still pending |
| `invalid` | an action or a choice the Mac does not accept |
| `rejected` | signature, identifiers or clock |
| `re-pair` | this phone was paired before commands existed: pair it again |

The phone accepts a `command-result` only from the Mac it sent the command to, carrying that
Mac's saved `pairingId` and a `commandId` it is waiting on; it ignores any other. It is not part
of §6's `(generation, epoch, seq)` ordering, which is for `state` alone.
