-- Migration: Add Referral System and Signup Platform Tracking
-- Description: Adds referral code, referred_by, and signup_platform columns to profiles table
-- Date: 2025-02-05

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS signup_platform TEXT;

-- Create index on referral_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Create index on referred_by for analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- Add check constraint for signup_platform (optional, but good for data integrity)
ALTER TABLE profiles
ADD CONSTRAINT IF NOT EXISTS valid_signup_platform
CHECK (signup_platform IS NULL OR signup_platform IN (
  '네이버 (검색/블로그/카페)',
  '구글',
  '인스타그램',
  '유튜브',
  '카카오톡',
  '페이스북',
  '숨고',
  '지인 추천',
  '기타'
));

-- Add comments for documentation
COMMENT ON COLUMN profiles.referral_code IS 'Unique 6-character code for user to share with others';
COMMENT ON COLUMN profiles.referred_by IS 'Profile ID of the user who referred this user';
COMMENT ON COLUMN profiles.signup_platform IS 'Platform/source where user heard about the service';
