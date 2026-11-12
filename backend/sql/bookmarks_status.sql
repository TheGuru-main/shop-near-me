-- Bookmarks: user → merchant/driver/service (not buyers as targets preferred in app)
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  kind VARCHAR(16) NOT NULL DEFAULT 'user',
  target_user_id UUID NULL REFERENCES users(id),
  target_phone VARCHAR(32) NULL,
  product_id UUID NULL,
  title VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_bookmarks_user ON bookmarks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookmarks_user_phone
  ON bookmarks(user_id, target_phone) WHERE kind = 'user' AND target_phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookmarks_user_product
  ON bookmarks(user_id, product_id) WHERE kind = 'product' AND product_id IS NOT NULL;

-- Status: metadata in Neon; media bytes in B2 (media_url is https URL)
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id),
  author_phone VARCHAR(32) NOT NULL,
  author_name VARCHAR(255) NULL,
  body TEXT NOT NULL DEFAULT '',
  media_url TEXT NULL,
  media_type VARCHAR(16) NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS ix_statuses_author ON statuses(author_id);
CREATE INDEX IF NOT EXISTS ix_statuses_expires ON statuses(expires_at);
