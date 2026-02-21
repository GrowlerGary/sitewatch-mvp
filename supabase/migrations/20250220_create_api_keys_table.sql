-- Create api_keys table for persistent API key storage
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default API Key',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  webhook_url TEXT,
  webhook_secret TEXT
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Create a unique partial index to ensure only one active key per user
-- (optional - remove if you want to support multiple active keys per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_user_active 
  ON api_keys(user_id) 
  WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can insert their own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update their own API keys"
  ON api_keys FOR UPDATE
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete their own API keys"
  ON api_keys FOR DELETE
  USING (user_id = auth.uid()::TEXT);

-- Grant access to the service role (for server-side operations)
GRANT ALL ON api_keys TO service_role;
