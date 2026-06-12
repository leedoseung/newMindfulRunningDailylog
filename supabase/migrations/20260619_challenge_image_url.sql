-- Add optional cover image URL to challenges
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS image_url text;
