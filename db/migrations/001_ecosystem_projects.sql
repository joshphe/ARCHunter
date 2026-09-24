CREATE TABLE IF NOT EXISTS ecosystem_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  symbol text NOT NULL,
  handle text NOT NULL,
  tagline_en text NOT NULL,
  tagline_zh text NOT NULL DEFAULT '',
  description_en text NOT NULL,
  description_zh text NOT NULL DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('beta', 'live', 'upcoming')),
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  website_url text NOT NULL,
  x_url text NOT NULL,
  token_address text,
  tvl_usd numeric,
  fees_24h_usd numeric,
  volume_24h_usd numeric,
  source_urls text[] NOT NULL DEFAULT '{}',
  verified_on date NOT NULL DEFAULT CURRENT_DATE,
  recommended boolean NOT NULL DEFAULT false,
  recommendation_reason_en text,
  recommendation_reason_zh text,
  sort_order integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecosystem_project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES ecosystem_projects(id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_zh text NOT NULL DEFAULT '',
  summary_en text NOT NULL,
  summary_zh text NOT NULL DEFAULT '',
  source_url text NOT NULL,
  published_at timestamptz,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ecosystem_project_updates_source_idx
  ON ecosystem_project_updates (project_id, source_url);

CREATE INDEX IF NOT EXISTS ecosystem_projects_published_order_idx
  ON ecosystem_projects (is_published, sort_order, name);
CREATE INDEX IF NOT EXISTS ecosystem_project_updates_project_date_idx
  ON ecosystem_project_updates (project_id, published_at DESC);

INSERT INTO ecosystem_projects (
  slug, name, symbol, handle, tagline_en, tagline_zh, description_en, description_zh,
  categories, status, products, website_url, x_url, token_address, tvl_usd,
  fees_24h_usd, volume_24h_usd, source_urls, verified_on, sort_order, recommended
) VALUES
  (
    'vort', 'Vort', 'V', '@VortLaunch', 'Verifiable reward flow on Arc.', 'Arc 上可验证的奖励分配机制。',
    'Vort routes creator proceeds into holder rewards through settled epochs, with reward allocations and settlement records published on Arc.',
    'Vort 将创作者收益按周期分配给持币者，并在 Arc 上公开奖励分配与结算记录。',
    ARRAY['Tokens'], 'live',
    '[{"en":"Holder rewards","zh":"持币者奖励"},{"en":"Epoch settlements","zh":"周期结算"},{"en":"Public reward ledger","zh":"公开奖励账本"},{"en":"Buyback and burn","zh":"回购与销毁"}]'::jsonb,
    'https://vort.bot/', 'https://x.com/VortLaunch', '0x4d57060f3825d3b995f35a30194f3e74e105f3ec',
    NULL, NULL, NULL, ARRAY['https://vort.bot/'], DATE '2026-09-23', 10, true
  ),
  (
    'kairo', 'KAIRO', 'K', '@kairo_market', 'Trade. Predict. Earn. Create.', '交易、预测、赚取、创建。',
    'A financial platform on Arc bringing prediction markets, swaps, perpetuals, token creation, and rewards into one experience.',
    'Arc 上的综合金融平台，整合预测市场、兑换、永续合约、代币创建与奖励产品。',
    ARRAY['DeFi','Prediction Markets'], 'live',
    '[{"en":"Prediction markets","zh":"预测市场"},{"en":"Swap","zh":"兑换"},{"en":"Perpetuals","zh":"永续合约"},{"en":"Create token","zh":"创建代币"},{"en":"KAIRO Pools","zh":"KAIRO 池","status":"upcoming"}]'::jsonb,
    'https://kairo.market/', 'https://x.com/kairo_market', NULL,
    NULL, NULL, NULL, ARRAY['https://kairo.market/'], DATE '2026-09-23', 20, true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  handle = EXCLUDED.handle,
  tagline_en = EXCLUDED.tagline_en,
  tagline_zh = EXCLUDED.tagline_zh,
  description_en = EXCLUDED.description_en,
  description_zh = EXCLUDED.description_zh,
  categories = EXCLUDED.categories,
  status = EXCLUDED.status,
  products = EXCLUDED.products,
  website_url = EXCLUDED.website_url,
  x_url = EXCLUDED.x_url,
  token_address = EXCLUDED.token_address,
  source_urls = EXCLUDED.source_urls,
  verified_on = EXCLUDED.verified_on,
  updated_at = now();
