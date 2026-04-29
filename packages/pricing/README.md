# @workmesh/pricing

Deterministic dynamic pricing for WorkMesh.

The pricing formula returns the required quote outputs:

- `requestId`, optional `workerId`, `currency`
- `total`, `withinBudget`, `minChargeApplied`
- base rate, premiums, multipliers, fees, reserve, and estimated hours
- explanations suitable for audit logs and UI display

The package does not perform currency conversion. If a worker and request use
different currencies, the quote is calculated in the worker currency and marked
outside budget because the package has no FX source of truth.
