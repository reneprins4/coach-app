-- Migration: Add media columns to exercises table
-- Run this FIRST in Supabase SQL Editor

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS image_url_0 text,
  ADD COLUMN IF NOT EXISTS image_url_1 text,
  ADD COLUMN IF NOT EXISTS media_source text DEFAULT 'free-exercise-db';

-- Verify
SELECT name, image_url_0 FROM exercises LIMIT 5;
