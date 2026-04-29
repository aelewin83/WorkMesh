# WorkMesh Contracts Gas Notes

Optimizer settings are enabled in `hardhat.config.js` with 200 runs. Use:

```sh
npm run gas
```

The gas report is driven by the same tests as the behavioral suite.

## Hot Paths

- `Escrow.fundEscrow` writes one new escrow deposit and emits one event.
- `Escrow.verifyPayout` and the MVP alias `releaseToWorker` update escrow status, send the net payout to the worker, send the fee to `treasuryWallet`, and emit `FeeCollected(agreementId, grossAmount, feeAmount, treasuryWallet, timestamp)` plus `PayoutVerified(agreementId, worker, amount, timestamp)`.
- `Escrow.refund` updates escrow status and returns the whole escrow amount to the payer. Refunds intentionally waive the platform fee; `RefundIssued.feeWaived` records the fee that would have been collected on a payout.
- Threshold admin operations add one approval write per approving admin. Execution adds the final state update and increments `adminActionNonce` for config changes.
- `Reputation.recordCompletion` uses a single `reputationRecorded[agreementId]` guard to prevent duplicate scoring for the same agreement.

## MVP Tradeoffs

- Escrow uses direct ETH transfers for clarity. A pull-payment model can reduce payout/refund failure coupling if recipients are contracts.
- Dispute resolution reuses the same threshold approval primitive as admin config, which keeps the MVP small while approximating a multisig role model.
- String URIs are stored on-chain for MVP readability. Production deployments may prefer hashes or compact content identifiers for lower storage cost.
