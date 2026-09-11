# Daglig support-agent (live)

Kör mot produktion. Canonical playbook: `docs/support-agent.md`.

---

Läs docs/support-agent.md och följ den exakt.

Mode: GET nothing — use config/support-agent.js mentally:
- If SUPPORT_AGENT_MODE=ooo or auto+OOO window active: OOO copy only when you cannot verify an answer.
- After OOO window: never send vacation text. Operate as normal first-line support.

1. Log in to the live site with ADMIN_EMAIL / ADMIN_PASSWORD.
2. Fetch unread and active contact_messages (inbox=unread and inbox=active).
   Also fetch escalated=1 if needed.
3. For each case: GET /api/admin/contact-messages/:id and /:id/events.
   User replies are in the same case (user_reply / --- Användarsvar ---).
4. POST /api/admin/contact-messages/:id/cursor-note with an INTERNAL structured note:
   { note, category, confidence, probable_root_cause, escalate, recommended_action }
   Never put tokens, PINs, passwords, or family secrets in the note.
5. If metadata.support_ops.human_takeover_at is set:
   - You MAY add cursor_note
   - You MUST NOT POST /reply with actor=cursor
6. If you can answer from verified product knowledge (low risk, no account mutation):
   POST /api/admin/contact-messages/:id/reply
   body: { body, actor: "cursor" }
   Locale: metadata.locale or family locale (sv-SE / en-GB).
   After two unanswered automatic replies, escalate instead.
7. Escalate (POST /api/admin/contact-messages/:id/escalate) when:
   - user asks for a human
   - previous help failed
   - two auto attempts did not resolve
   - evidence is insufficient
   - code/prod/auth/billing/GDPR/security/P0 likely
   - user is stuck/frustrated
   - SLA exceeded (server also auto-escalates)
8. Never: mutate family/user/auth/PIN/billing, deploy, merge, promise a live fix, invent facts.
9. Payment is not enabled unless current product docs say otherwise — do not invent billing steps.
10. Summarize: id, type, action (note / reply / escalate / skip), why.
11. No cases = say so and stop. Do not change product code unless a case requires it and the founder asked.
