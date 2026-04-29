# @workmesh/matching

Deterministic worker/request matching for WorkMesh.

The formula returns the required audit outputs for each candidate:

- `requestId`, `workerId`, `rank`
- `eligible`, `decision`, `score`, `normalizedScore`
- per-component scores
- matched/missing skills
- human-readable explanations

Scores are deterministic for a fixed input and `now` value. Ranked output uses
worker id as the final stable tie-breaker.
