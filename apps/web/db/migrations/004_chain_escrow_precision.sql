ALTER TABLE escrow_states
  ALTER COLUMN gross_task_value TYPE NUMERIC(20,8),
  ALTER COLUMN platform_fee TYPE NUMERIC(20,8),
  ALTER COLUMN net_payout TYPE NUMERIC(20,8),
  ALTER COLUMN gas_estimate TYPE NUMERIC(20,8);

ALTER TABLE payment_history
  ALTER COLUMN gross_amount TYPE NUMERIC(20,8),
  ALTER COLUMN platform_fee TYPE NUMERIC(20,8),
  ALTER COLUMN net_payout TYPE NUMERIC(20,8);

UPDATE escrow_states es
SET gross_task_value = COALESCE(NULLIF((ce.payload->>'amount')::numeric / 1000000000000000000, 0), es.gross_task_value),
    net_payout = COALESCE(NULLIF((ce.payload->>'amount')::numeric / 1000000000000000000, 0), es.net_payout)
FROM chain_events ce
WHERE es.agreement_id = ce.agreement_id
  AND es.tx_hash = ce.tx_hash
  AND ce.event_name = 'EscrowFunded'
  AND ce.payload ? 'amount';

UPDATE payment_history ph
SET gross_amount = COALESCE(NULLIF((ce.payload->>'amount')::numeric / 1000000000000000000, 0), ph.gross_amount),
    net_payout = COALESCE(NULLIF((ce.payload->>'amount')::numeric / 1000000000000000000, 0), ph.net_payout)
FROM chain_events ce
WHERE ph.agreement_id = ce.agreement_id
  AND ph.tx_hash = ce.tx_hash
  AND ce.event_name = 'EscrowFunded'
  AND ce.payload ? 'amount';
