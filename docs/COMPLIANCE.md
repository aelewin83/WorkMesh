# WORKMESH MVP Compliance Caveats

## Disclaimer

This document is product planning guidance, not legal advice. WORKMESH should complete counsel-led review before handling real users, real escrowed value, tax reporting, identity documents, or cross-border payments.

## Current Regulatory Snapshot

- Worker classification: The U.S. Department of Labor's March 11, 2024 independent-contractor rule remains the active federal FLSA baseline as of April 28, 2026, but the DOL proposed a replacement rule on February 26, 2026. Product should preserve worker independence signals and track rule changes.
- Gig taxes: The IRS states gig income is taxable even if not reported on an information return and even if paid in virtual currency.
- Money transmission and crypto: FinCEN guidance treats administrators or exchangers of convertible virtual currency as money services businesses in many fact patterns; money transmission has no dollar threshold.
- Sanctions: OFAC has virtual-currency industry guidance and expects risk-based sanctions compliance.
- Privacy and data security: FTC guidance emphasizes data minimization, reasonable safeguards, and breach notification duties for covered entities; California privacy law may apply if thresholds are met.
- Securities and commodities: The SEC and CFTC continue to publish crypto-asset guidance. WORKMESH should avoid native token fundraising or profit promises in the MVP.

## Compliance Domains

| Domain | Why It Matters | MVP Product Position |
| --- | --- | --- |
| Labor classification | Marketplace design can affect employee vs contractor analysis. | Workers set rates, accept/decline work, control availability, advertise skills, and can work off-platform subject to terms. |
| Wage and hour | If workers are employees, minimum wage/overtime rules may apply. | MVP positions workers as independent businesses; legal review required by category/state. |
| Payments and escrow | Holding or transmitting funds can trigger federal/state money transmission duties. | Use non-custodial smart contract escrow where feasible; evaluate ACH/card/wallet/stablecoin partner obligations, MSB, and state MTL exposure before production. |
| AML/KYC/KYB | Fraud, sanctions, and illicit finance risks increase with crypto settlement. | Add identity-provider hooks, sanctions screening, risk tiers, transaction monitoring, and manual review. |
| Tax reporting | Marketplaces may have payer reporting and recordkeeping obligations. | Capture tax profile only behind encryption; design for 1099 reporting workflows later. |
| Privacy | Profiles, chat, location, and work history are personal information. | Minimize collection, encrypt sensitive data, publish privacy notice, support deletion/export hooks. |
| Consumer protection | Misleading fees, fake ratings, scams, and unclear refunds create enforcement risk. | Show fees before funding, escrow states, dispute rules, rating basis, and risk warnings. |
| Crypto disclosures | Users may misunderstand volatility, gas, finality, and wallet risk. | Provide clear transaction previews, network fee estimate, finality state, and no seed phrase handling. |
| Accessibility | Marketplace access should not exclude users with disabilities. | Follow WCAG-oriented UX and keyboard/screen-reader test plan. |
| Safety and prohibited work | Labor marketplaces can be misused for illegal or unsafe services. | Category controls, report flow, moderation queue, prohibited-services policy. |

## Labor Classification Design Notes

The product should avoid signals that make WORKMESH look like the employer of record:

- Do not mandate exact work method beyond safety, legality, and contract terms.
- Let workers negotiate rates and decline gigs without penalty beyond transparent reputation signals.
- Let workers advertise services, choose schedule, and set service areas.
- Avoid uniforms, mandatory scripts, or platform-controlled training for ordinary gig performance.
- Make the contracting party clear: employer/customer contracts with worker; WORKMESH provides marketplace and escrow tools.
- Keep category-specific review for areas with special licensing, child labor, healthcare, construction, transportation, or home services rules.

## Payments and Escrow Caveats

- Non-custodial smart contracts reduce custody risk but do not automatically eliminate money transmission, consumer protection, sanctions, or tax obligations.
- ACH, card, wallet processor, and stablecoin escrow rails require separate partner, chargeback, sanctions, consumer-disclosure, licensing, and tax review.
- If WORKMESH or an agent can control user funds, redirect settlement, custody private keys, or exchange value, licensing analysis becomes more serious.
- State money transmitter rules can differ from federal MSB analysis and may cover virtual currency activity.
- Optional direct settlement should be reputation-gated and category/jurisdiction-gated. It must not be positioned as a way to evade taxes, safety requirements, sanctions controls, employment law, or platform policies.
- MVP should use testnet or sandbox funds for demo and avoid real-money escrow until counsel confirms operating model.

## Privacy and Data Handling

MVP privacy requirements:

- Publish privacy notice and terms before beta.
- Separate public marketplace profile fields from encrypted private fields.
- Expose only minimal public discovery metadata: category, skill tags, approximate zone, budget band, timing band, urgency, level gate, and reputation thresholds.
- Provide delete/deactivate workflow with retention exceptions for fraud, tax, legal, and dispute records.
- Honor opt-out and consent rules where applicable.
- Keep exact location private until parties have a legitimate job interaction.
- Log selective disclosure events and limit reveals to data necessary for legitimate work completion.
- Do not use chat contents for ad targeting.

## Compliance Operating Controls

- Risk-tier users by verification level, transaction volume, category, disputes, and geography.
- Screen sanctions at onboarding and before escrow release for real-money environments.
- Freeze high-risk settlement flows pending review.
- Maintain audit logs for escrow, payout, dispute, admin, and fee-config actions.
- Maintain a prohibited-services policy and moderation escalation path.
- Keep compliance exports limited, encrypted, and logged.

## MVP Terms and Policy Checklist

- Terms of service with marketplace role, contractor relationship, fees, escrow, disputes, prohibited conduct.
- Privacy notice with encrypted chat/profile language and retention periods.
- Escrow terms explaining release, refund, dispute, chain finality, gas, and treasury fee.
- Worker classification acknowledgement.
- Tax responsibility notice.
- Crypto risk disclosure.
- Community and safety policy.
- Sanctions and prohibited-jurisdiction policy before real-money launch.

## Primary References

- U.S. Department of Labor, independent contractor final rule and FAQs: https://www.dol.gov/agencies/whd/flsa/misclassification/rulemaking/faqs
- U.S. Department of Labor, February 26, 2026 proposed rule release: https://www.dol.gov/newsroom/releases/whd/whd20260226
- IRS Gig Economy Tax Center: https://www.irs.gov/businesses/gig-economy-tax-center
- FinCEN 2019 convertible virtual currency guidance: https://www.fincen.gov/index.php/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models
- FinCEN MSB registration definitions: https://www.fincen.gov/supporting-documentation-definitions
- OFAC virtual currency sanctions guidance: https://ofac.treasury.gov/recent-actions/20211015
- FTC Safeguards Rule business guide: https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know
- FTC privacy and security guidance: https://www.ftc.gov/business-guidance/privacy-security
- California CCPA overview: https://www.oag.ca.gov/privacy/ccpa
- SEC crypto assets and federal securities laws: https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/crypto-assets-federal-securities-laws
- CFTC virtual currency risk advisory: https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/understand_risks_of_virtual_currency.html
