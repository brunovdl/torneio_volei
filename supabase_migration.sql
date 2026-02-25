-- =====================================================
-- MIGRAÇÃO v5 — Sistema de Torneio de Vôlei
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. EXTENSÕES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. TABELA: torneio_config (atualizar existente)
-- =====================================================
CREATE TABLE IF NOT EXISTS torneio_config (
  id                  INT PRIMARY KEY DEFAULT 1,
  nome                TEXT DEFAULT 'Torneio de Vôlei',
  data_evento         DATE,
  inscricoes_abertas  BOOLEAN DEFAULT TRUE,
  jogadores_por_time  INT CHECK (jogadores_por_time BETWEEN 2 AND 6),
  num_times_definido  INT,
  times_formados      BOOLEAN DEFAULT FALSE,
  chaveamento_gerado  BOOLEAN DEFAULT FALSE,
  ao_vivo             BOOLEAN DEFAULT FALSE,
  fase_atual          TEXT DEFAULT 'inscricoes',
  campeao_id          UUID,
  bracket_resumo_ia   TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas que podem não existir ainda
ALTER TABLE torneio_config ADD COLUMN IF NOT EXISTS inscricoes_abertas BOOLEAN DEFAULT TRUE;
ALTER TABLE torneio_config ADD COLUMN IF NOT EXISTS jogadores_por_time INT CHECK (jogadores_por_time BETWEEN 2 AND 6);
ALTER TABLE torneio_config ADD COLUMN IF NOT EXISTS num_times_definido INT;
ALTER TABLE torneio_config ADD COLUMN IF NOT EXISTS times_formados BOOLEAN DEFAULT FALSE;
ALTER TABLE torneio_config ADD COLUMN IF NOT EXISTS bracket_resumo_ia TEXT;
ALTER TABLE torneio_config ADD COLUMN IF NOT EXISTS nome TEXT DEFAULT 'Torneio de Vôlei';
ALTER TABLE torneio_config ADD COLUMN IF NOT EXISTS data_evento DATE;

-- Garantir linha padrão
INSERT INTO torneio_config (id, chaveamento_gerado, ao_vivo, fase_atual, inscricoes_abertas, times_formados)
VALUES (1, FALSE, FALSE, 'inscricoes', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. TABELA: equipes (atualizar existente)
-- =====================================================
CREATE TABLE IF NOT EXISTS equipes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                TEXT NOT NULL,
  logo_url            TEXT,
  posicao             TEXT,
  seed                INT,
  num_derrotas        INT DEFAULT 0,
  eliminado           BOOLEAN DEFAULT FALSE,
  colocacao_final     TEXT,
  misto_valido        BOOLEAN DEFAULT FALSE,
  total_masculino     INT DEFAULT 0,
  total_feminino      INT DEFAULT 0,
  total_nao_informado INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE equipes ADD COLUMN IF NOT EXISTS seed INT;
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS num_derrotas INT DEFAULT 0;
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT FALSE;
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS misto_valido BOOLEAN DEFAULT FALSE;
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS total_masculino INT DEFAULT 0;
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS total_feminino INT DEFAULT 0;
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS total_nao_informado INT DEFAULT 0;

-- =====================================================
-- 4. TABELA: jogadores (atualizar existente)
-- =====================================================
CREATE TABLE IF NOT EXISTS jogadores (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               TEXT NOT NULL,
  apelido            TEXT,
  email              TEXT,
  whatsapp           TEXT,
  genero             TEXT NOT NULL DEFAULT 'nao_informado',
  posicao            TEXT,
  foto_url           TEXT,
  equipe_id          UUID REFERENCES equipes(id) ON DELETE SET NULL,
  cabeca_de_chave    BOOLEAN DEFAULT FALSE,
  is_cabeca_de_chave BOOLEAN DEFAULT FALSE,
  lista_espera       BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS apelido TEXT;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS posicao TEXT;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS lista_espera BOOLEAN DEFAULT FALSE;
ALTER TABLE jogadores ADD COLUMN IF NOT EXISTS is_cabeca_de_chave BOOLEAN DEFAULT FALSE;

-- Unique index no email (ignorando nulos)
CREATE UNIQUE INDEX IF NOT EXISTS jogadores_email_unique
  ON jogadores (email)
  WHERE email IS NOT NULL AND email <> '';

-- =====================================================
-- 5. TABELA: jogos (atualizar existente)
-- =====================================================
CREATE TABLE IF NOT EXISTS jogos (
  id                        INT PRIMARY KEY,
  numero_jogo               INT,
  rodada                    TEXT,
  tipo                      TEXT,
  chave                     TEXT,
  is_bye                    BOOLEAN DEFAULT FALSE,
  label                     TEXT,
  descricao                 TEXT,
  ordem_exibicao            INT,
  equipe_a_id               UUID REFERENCES equipes(id) ON DELETE SET NULL,
  equipe_b_id               UUID REFERENCES equipes(id) ON DELETE SET NULL,
  vencedor_id               UUID REFERENCES equipes(id) ON DELETE SET NULL,
  perdedor_id               UUID REFERENCES equipes(id) ON DELETE SET NULL,
  placar_a                  INT,
  placar_b                  INT,
  status                    TEXT DEFAULT 'aguardando',
  proximo_jogo_vencedor_id  INT REFERENCES jogos(id),
  proximo_jogo_perdedor_id  INT REFERENCES jogos(id),
  slot_vencedor             TEXT,
  slot_perdedor             TEXT,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jogos ADD COLUMN IF NOT EXISTS numero_jogo INT;
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS chave TEXT;
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE;
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS ordem_exibicao INT;

-- =====================================================
-- 6. TABELA: ia_log (nova)
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_chamada      TEXT,
  modelo_usado      TEXT,
  prompt_sistema    TEXT,
  prompt_usuario    TEXT,
  resposta          TEXT,
  tokens_entrada    INT,
  tokens_saida      INT,
  tentativa         INT DEFAULT 1,
  sucesso           BOOLEAN,
  erro_validacao    TEXT,
  duracao_ms        INT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. FOREIGN KEY: torneio_config → equipes
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'torneio_config_campeao_id_fkey'
  ) THEN
    ALTER TABLE torneio_config
      ADD CONSTRAINT torneio_config_campeao_id_fkey
      FOREIGN KEY (campeao_id) REFERENCES equipes(id) ON DELETE SET NULL;
  END IF;
END$$;

-- =====================================================
-- 8. ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS jogos_status_idx ON jogos (status);
CREATE INDEX IF NOT EXISTS jogos_ordem_idx ON jogos (ordem_exibicao);
CREATE INDEX IF NOT EXISTS jogadores_equipe_idx ON jogadores (equipe_id);
CREATE INDEX IF NOT EXISTS ia_log_tipo_idx ON ia_log (tipo_chamada);
CREATE INDEX IF NOT EXISTS ia_log_created_idx ON ia_log (created_at DESC);

-- =====================================================
-- 9. ROW LEVEL SECURITY (Supabase)
-- =====================================================
-- Habilitar RLS (se ainda não)
ALTER TABLE jogadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneio_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_log ENABLE ROW LEVEL SECURITY;

-- Política: leitura pública
DROP POLICY IF EXISTS "Leitura pública jogadores" ON jogadores;
CREATE POLICY "Leitura pública jogadores"
  ON jogadores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública equipes" ON equipes;
CREATE POLICY "Leitura pública equipes"
  ON equipes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública jogos" ON jogos;
CREATE POLICY "Leitura pública jogos"
  ON jogos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública torneio_config" ON torneio_config;
CREATE POLICY "Leitura pública torneio_config"
  ON torneio_config FOR SELECT USING (true);

-- Política: escrita pública (para demo; em produção restringir por autenticação)
DROP POLICY IF EXISTS "Escrita pública jogadores" ON jogadores;
CREATE POLICY "Escrita pública jogadores"
  ON jogadores FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Modificação jogadores" ON jogadores;
CREATE POLICY "Modificação jogadores"
  ON jogadores FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Modificação equipes" ON equipes;
CREATE POLICY "Modificação equipes"
  ON equipes FOR ALL USING (true);

DROP POLICY IF EXISTS "Modificação jogos" ON jogos;
CREATE POLICY "Modificação jogos"
  ON jogos FOR ALL USING (true);

DROP POLICY IF EXISTS "Modificação torneio_config" ON torneio_config;
CREATE POLICY "Modificação torneio_config"
  ON torneio_config FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso ia_log" ON ia_log;
CREATE POLICY "Acesso ia_log"
  ON ia_log FOR ALL USING (true);

-- =====================================================
-- 10. REALTIME
-- =====================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    jogadores, equipes, jogos, torneio_config;
COMMIT;
