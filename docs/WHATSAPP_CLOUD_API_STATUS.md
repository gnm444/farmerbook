# WhatsApp Cloud API status and safe continuation

Last verified: 25 August 2026 (Asia/Kolkata)

## Executive status

FarmerBook does **not** currently have a live WhatsApp sender, webhook, template,
token, or autonomous WhatsApp action. Keep every FarmerBook WhatsApp feature
flag and delivery path disabled.

A separate, self-owned proof-of-concept bot was built for **Namaha Mobility** at
`/Users/ngonapa/Documents/code/namaha-whatsapp-bot`. The intended sender has now
been migrated into a Namaha-owned WhatsApp Business Account and is visible in
the developer API Setup page, but Meta still reports it as **Pending**. The bot
is not deployed, the webhook is not configured, no token has been generated,
and no real API message has been sent. It must not be described as a working
FarmerBook or Namaha production channel yet.

The intended future production number is the Indian number with masked form
`+91 95…1022`.
The full number must remain in the private operator inventory rather than this
repository. Do not delete, re-register, or re-verify the migrated sender while
Meta is processing it.

## What was built

The separate Namaha bot implements:

- a FastAPI webhook service for Meta's official WhatsApp Cloud API;
- greeting/menu, new-order capture, order-status lookup, and human handoff;
- raw-body webhook signature verification and configured phone-number filtering;
- transactional SQLite conversation, order, handoff, inbox, and outbox storage;
- duplicate-message protection and retryable outbound delivery;
- redaction of delivered message bodies and owner-only database permissions.

Repository: `/Users/ngonapa/Documents/code/namaha-whatsapp-bot`

Current verification:

- Git commit: `eb5e769` (`Build self-owned WhatsApp Cloud API bot`)
- clean working tree at the last inspection;
- 30 tests passed on 25 August 2026;
- no `.env` file, live token, App Secret, verify token, or production customer
  data is present;
- no public deployment, Meta webhook subscription, or real API message has been
  completed.

A separate Namaha business website with contact, privacy, and terms routes also
exists at `/Users/ngonapa/Documents/code/namaha-mobility-web`, but it has not
been published.

## Meta assets and live blocker

The following identifiers are non-secret operational references. Never add
tokens, OTPs, two-step PINs, App Secrets, or unmasked personal numbers beside
them.

| Asset | Identifier | Last verified state |
| --- | --- | --- |
| Business Portfolio | Namaha Mobility, `1371424244498854` | Accessible |
| Developer app | Namaha Mobility Bot, `2150684888867469` | Accessible |
| Original test WABA | `1681914162906629` | Owned by Namaha; test phone still Unverified |
| Test Phone Number ID | `1207920485748757` | Previously `PENDING`, `NOT_VERIFIED`, `platform_type: NOT_APPLICABLE` |
| Duplicate test WABA | `2713515069063670` | Inaccessible; WhatsApp Manager returns `waba_access`/404 |
| Newly provisioned WABA | `1056316180711542` | Accessible; contains one production and one test number |
| Newly provisioned Phone Number ID | `1191375764069666` | Display name Namaha; **Unverified** |

On 25 August 2026:

- Business Settings still showed the original test phone as **Unverified**;
- API Setup had an empty **From** selector and offered only **Get new test
  number**;
- the saved Meta Business Assistant thread confirmed that both WABAs are stuck
  in inconsistent provisioning and that the duplicate is inaccessible;
- Meta did not offer a human transfer and directed the owner to its developer
  bug-report route;
- no numbered support case or open developer bug was visible.

An escalation was entered on 23 August, but Meta supplied no case/reference
number. On 25 August 2026, a new report was submitted through the exact
**Report developer bug** route supplied by Meta Business Assistant. Facebook
confirmed **Feedback submitted**, but again returned no case/reference number
and the general report form offers no case-tracking surface. Preserve that
submission confirmation as the current escalation evidence. Do not click **Get
new test number** while these duplicate assets exist; doing so could create a
third orphaned WABA.

Later on 25 August, the API Setup page began working and exposed WABA
`1056316180711542`, production Phone Number ID `1191375764069666`, and the
Namaha display name. The sender remains **Unverified**. The number shown by Meta
has masked form `+91 91…1022`, while the operator inventory and Codex history
consistently identify the intended chatbot number as `+91 95…1022`. Treat this
as a blocking mismatch: do not request an OTP, create a token, send a message,
or delete the new asset until the owner confirms whether the Meta number is
also controlled. The webhook callback and verify-token fields are blank, and
the developer app is unpublished.

Owner confirmation on 25 August 2026: `+91 95…1022` is the correct number;
`+91 91…1022` is not the intended chatbot sender. Meta's **Add phone number**
flow is prepared with display name Namaha, Asia/Kolkata, and Automotive, but the
correct number has not been transmitted and no OTP has been requested.

Later on 25 August, the owner approved submitting the correct number and one
SMS verification request. Meta detected an existing provider/WABA registration
and rejected the migration before sending an OTP: **“Migrating a phone number
requires the source and destination display names to be the same”**
(`#2388361:WBxP-1646286304-1310734478`). The locally available WROTI record did
not establish the exact source-WABA display name; `Namaha`, `Namaha Mobility`,
and the historical casing `Namaha mobility` all failed the equality check. Do
not guess further or delete either asset. Obtain the exact registered display
name and source WABA/Phone Number IDs from WROTI or the source WhatsApp Manager,
then resume the prepared migration.

Owner-directed retry on 25 August established that the exact source display
name is **Namaha Mobility Services**. Meta accepted that name and sent one
six-digit SMS verification code to the controlled `+91 95…1022` SIM. The OTP
screen is open for private owner entry; never copy the OTP into chat or a
repository. The final **Confirm transfer** action has not been clicked. Meta
warns that confirmation will log the number out of the WhatsApp Business app,
export its chats and contacts, remove app access to chats/groups/catalog, and
make migrated conversations available in Inbox after processing. Require an
explicit owner go-ahead at that final transfer boundary.

The owner completed OTP verification on 25 August and Meta initiated the
transfer. The developer app now selects the correct `+91 95…1022` sender under
new WABA `1107571931859328` with Phone Number ID `1324126314111095` and display
name **Namaha Mobility Services**. WhatsApp Manager still reports the number as
**Pending**, so do not create a token or send a test message until it becomes
connected/active. The previous incorrect `+91 91…1022` asset remains separate
and must not be deleted without an explicit cleanup decision.

## How the chatbot will work after activation

Once WhatsApp Manager changes the canonical sender from **Pending** to
**Active/Connected**, an inbound conversation will follow this path:

1. A customer sends a WhatsApp message to the Namaha Mobility Services number.
2. Meta's WhatsApp Cloud API delivers a signed `messages` webhook event to the
   deployed Namaha bot over HTTPS.
3. The FastAPI service verifies the webhook signature, checks that the event is
   for Phone Number ID `1324126314111095`, rejects duplicates, and stores the
   minimum operational conversation state.
4. The conversation flow handles the greeting/menu, New Order, Order Status, or
   Talk to Us/human-handoff path.
5. The bot sends its reply through Meta's Graph API using the canonical Phone
   Number ID and an access token held only in the deployment's secret manager.
6. Delivery status webhooks update the outbox, while retry and idempotency logic
   prevent avoidable duplicate replies.

The customer will therefore use ordinary WhatsApp; no separate app or link is
required. The chatbot server and Meta webhook perform the automation behind the
Namaha Mobility Services account. Unsupported or sensitive requests should be
placed into the human-handoff queue rather than answered autonomously.

## Legacy production-number boundary

The historical WROTI/Writio setup reportedly worked in November 2024 with the
production number ending in `1022`, including New Order and Order History.
No source code for that provider-hosted bot was recovered.

That uncertainty is now resolved for the intended sender. The owner confirmed
physical control of the active SIM, received Meta's SMS OTP, and completed the
transfer using the exact source display name **Namaha Mobility Services**. The
canonical number is now associated with the new WABA and Phone Number ID listed
above. The historical provider setup should be retained only as migration/audit
context; it must not be used as a second active delivery path.

## Required sequence

1. Wait for WhatsApp Manager to change the canonical sender from **Pending** to
   **Active/Connected**. Do not repeat OTP verification while processing.
2. Review Meta account quality, required business actions, and the payment
   warning. Do not add billing or alter the incorrect historical sender without
   a separate explicit approval.
3. With owner approval at the time of action, generate a private test token and
   send the standard `hello_world` message only to an owner-controlled test
   recipient. Never place the token or recipient's full number in this repo.
4. Deploy the Namaha bot to an approved public HTTPS host with persistent
   storage and secret management. Store the production System User token, App
   Secret, and webhook verify token only in that secret manager.
5. Configure the Meta callback, complete the verification challenge, subscribe
   the canonical WABA to the `messages` field, and confirm signature checks.
6. Exercise inbound `Hi`, New Order, Order Status, and Talk to Us. Verify
   idempotency, retries, order records, delivery statuses, handoff handling, and
   deletion/retention before opening the number to customers.
7. Configure billing and approve only the necessary templates before any
   business-initiated communication. Publish/pilot the Meta app only after the
   controlled end-to-end test passes.
8. FarmerBook integration is a separate reviewed tranche. It requires a
   FarmerBook-owned verified sender, explicit WhatsApp opt-in, withdrawal and
   suppression handling, approved templates where applicable, rate limits,
   delivery evidence, human escalation, and a production go/no-go approval.

## Security and policy invariants

- Use only Meta's official WhatsApp Business Platform/Cloud API or an approved
  Solution Provider; never automate WhatsApp Web or store a QR session.
- Never commit access tokens, App Secrets, verify tokens, OTPs, PINs, complete
  phone numbers, message bodies, or customer exports.
- Do not use cold lists. A phone number alone is not WhatsApp consent.
- Do not create another test number while Meta's duplicate provisioning remains
  unresolved.
- Do not touch the live number until ownership, SIM control, backup, downtime,
  two-step verification, and rollback are explicitly documented.
- Keep FarmerBook WhatsApp delivery technically impossible until its own release
  gates pass.
