# Website greeter conversation context

The public greeter can use earlier turns only after the visitor enables **Use
earlier messages in this chat**. The control is off by default and its choice is
kept only in browser session storage. It is separate from marketing, follow-up,
account, and contact consent.

## Storage and isolation

- Context is stored in the existing website-greeter Durable Object, not in
  Supabase and not in a user profile. The private Google `/chat` canary may also
  store sanitized durable facts in Agent Engine Memory Bank after explicit
  context consent.
- A cryptographically random browser-session UUID partitions every query and
  write. Context APIs never accept an account ID or a different conversation
  lookup key.
- Email addresses, phone-like strings, links, control characters, and excess
  text are removed before a turn is retained or reused.
- At most eight recent turns and 2,400 sanitized characters are sent to an AI
  provider. Prompt-cost reservation includes those retained characters.
- Context becomes unavailable 24 hours after the latest consented exchange.
  Expired rows are pruned on access and by the existing 15-minute Worker
  heartbeat. Disabling the control requests immediate deletion. A later request
  with the control off also deletes any retained context for that anonymous
  session.
- The Google canary uses a distinct server-generated opaque `memory-<UUID>`
  value under the provider-required `user_id` scope key, never the browser
  session ID or a FarmerBook account ID. Memory Bank limits consolidation to
  one revision candidate and applies a 24-hour TTL to memories and revisions.
  Retrieval is capped at three facts and 1,200 sanitized characters.
- The visible browser transcript is not reloaded from server storage and is not
  exposed through a read API.

## Failure and provider boundaries

Transcript reads, writes, and Memory Bank retrieval or generation failures must
not prevent an approved answer, safe handoff, or existing single-turn
Cloudflare inference. The provider-neutral request receives only bounded,
sanitized prior turns and retrieved facts.

The local `provider_session_id` holds only the opaque Memory Bank scope. On
withdrawal or expiry, local turns are removed first and all memories in that
exact scope are deleted and verified absent. If Google deletion cannot be
confirmed, the local row is marked withdrawal-pending and preserves the opaque
scope only so the heartbeat or a later request can retry; it cannot be read as
active conversation context. Request-scoped ADK inference sessions remain
separate and are deleted after every call.

## Review gate

Before production use, a privacy owner and native-language reviewers should
approve the retention notice and confirm whether 24 hours is appropriate under
the applicable policy. Changing the retention period or making context enabled
by default requires a separate reviewed release.
