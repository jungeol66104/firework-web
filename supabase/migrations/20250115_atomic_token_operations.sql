-- Migration: Atomic Token Operations
-- Description: Creates PostgreSQL functions for race-condition-free token operations
-- Date: 2025-01-15

-- Function 1: spend_tokens (atomic deduction with balance check)
CREATE OR REPLACE FUNCTION spend_tokens(
  user_id_param UUID,
  amount_param NUMERIC
) RETURNS TABLE(success BOOLEAN, new_balance NUMERIC, message TEXT) AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT tokens INTO current_balance
  FROM profiles
  WHERE id = user_id_param
  FOR UPDATE;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient balance
  IF current_balance < amount_param THEN
    RETURN QUERY SELECT FALSE, current_balance,
      format('Insufficient tokens. Required: %s, Available: %s', amount_param, current_balance)::TEXT;
    RETURN;
  END IF;

  -- Atomic update (deduct tokens)
  UPDATE profiles
  SET tokens = tokens - amount_param
  WHERE id = user_id_param
  RETURNING tokens INTO current_balance;

  -- Return success
  RETURN QUERY SELECT TRUE, current_balance,
    format('Successfully spent %s tokens. Remaining: %s', amount_param, current_balance)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function 2: add_tokens (atomic addition)
CREATE OR REPLACE FUNCTION add_tokens(
  user_id_param UUID,
  amount_param NUMERIC
) RETURNS TABLE(success BOOLEAN, new_balance NUMERIC, message TEXT) AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Atomic update (add tokens)
  UPDATE profiles
  SET tokens = tokens + amount_param
  WHERE id = user_id_param
  RETURNING tokens INTO current_balance;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Return success
  RETURN QUERY SELECT TRUE, current_balance,
    format('Successfully added %s tokens. New balance: %s', amount_param, current_balance)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function 3: get_user_tokens (simple read, no locking needed)
CREATE OR REPLACE FUNCTION get_user_tokens(
  user_id_param UUID
) RETURNS NUMERIC AS $$
DECLARE
  token_balance NUMERIC;
BEGIN
  SELECT tokens INTO token_balance
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN COALESCE(token_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Add database constraint to prevent negative token balances
ALTER TABLE profiles
ADD CONSTRAINT IF NOT EXISTS tokens_non_negative
CHECK (tokens >= 0);

-- Add comment for documentation
COMMENT ON FUNCTION spend_tokens IS 'Atomically deducts tokens from user balance with balance check and row locking';
COMMENT ON FUNCTION add_tokens IS 'Atomically adds tokens to user balance';
COMMENT ON FUNCTION get_user_tokens IS 'Safely retrieves user token balance';
