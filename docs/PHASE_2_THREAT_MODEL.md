# Phase 2 Threat Model

Phase 2 assumes Relai is a privacy-first coordination platform where backend compromise, account takeover, device loss, and metadata correlation are realistic risks.

## Expanded Adversaries

- Account takeover through stolen password, wallet session, or cookie.
- Stolen but not fully compromised user device.
- Compromised browser session.
- Rogue admin/operator with database visibility.
- Leaked object storage containing encrypted attachments.
- Attachment exfiltration attempts.
- Session hijacking and replay.
- Malicious insider.
- Dependency compromise.
- Metadata correlation through timing, participants, and notifications.
- Notification leakage on shared screens or lock screens.
- Compromised recovery flow.

## Still Out Of Scope

- Fully compromised endpoint malware.
- OS-level compromise.
- Advanced intelligence collection at ISP/device level.
- Physical coercion or compelled user disclosure.
- Perfect secrecy or full Signal protocol.
