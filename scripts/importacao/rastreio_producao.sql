-- Rastreio de visitantes: novas colunas em site_visits (rode UMA vez no phpMyAdmin da produção,
-- ANTES do redeploy). Pode rodar de novo sem erro (IF NOT EXISTS, MariaDB).
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE NULL,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE NULL,
  ADD COLUMN IF NOT EXISTS fonte VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS meio VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS referrer_host VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS device VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS browser VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS os VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS language VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS entrada TINYINT(1) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS site_visits_created_at_idx ON site_visits (created_at);
CREATE INDEX IF NOT EXISTS site_visits_visitor_id_idx ON site_visits (visitor_id);
CREATE INDEX IF NOT EXISTS site_visits_session_id_idx ON site_visits (session_id);
