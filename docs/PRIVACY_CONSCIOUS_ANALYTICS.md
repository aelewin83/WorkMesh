# Privacy-Conscious Analytics

Relai should measure only what helps validate private beta behavior.

## Allowed event families

- invite_accepted
- signup_completed
- onboarding_completed
- operational_focus_selected
- request_created
- application_submitted
- agreement_created
- secure_thread_opened
- engagement_completed
- repeat_engagement_started
- feedback_submitted

## Rules

- Prefer aggregate counts over raw behavioral trails.
- Do not collect message plaintext, private profile fields, exact location, attachment contents, or full relationship graph data.
- Segment by canonical Operational Focus only when useful for liquidity planning.
- Keep retention short until production policy is finalized.
