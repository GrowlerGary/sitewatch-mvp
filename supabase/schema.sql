-- Supabase Database Schema for SiteWatch Freemium Model
-- Run this in the Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  phone_number TEXT,
  sms_count_monthly INTEGER NOT NULL DEFAULT 0,
  sms_count_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'paused')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'business')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Websites table
CREATE TABLE websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('up', 'down', 'unknown')),
  last_checked TIMESTAMP WITH TIME ZONE,
  ssl_expiry_date TIMESTAMP WITH TIME ZONE,
  ssl_days_remaining INTEGER,
  response_time INTEGER,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Monitor logs table
CREATE TABLE monitor_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('up', 'down')),
  response_time INTEGER,
  error TEXT,
  ssl_days_remaining INTEGER,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_websites_user ON websites(user_id);
CREATE INDEX idx_monitor_logs_website ON monitor_logs(website_id);
CREATE INDEX idx_monitor_logs_checked_at ON monitor_logs(checked_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY users_read_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions accessible to user
CREATE POLICY subscriptions_read_own ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Websites accessible to user
CREATE POLICY websites_read_own ON websites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY websites_insert_own ON websites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY websites_update_own ON websites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY websites_delete_own ON websites
  FOR DELETE USING (auth.uid() = user_id);

-- Monitor logs accessible via website
CREATE POLICY monitor_logs_read_own ON monitor_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM websites 
      WHERE websites.id = monitor_logs.website_id 
      AND websites.user_id = auth.uid()
    )
  );

-- Note: For server-side operations (API routes), you'll need to use the service role key
-- which bypasses RLS policies. Client-side queries will be restricted by RLS.
