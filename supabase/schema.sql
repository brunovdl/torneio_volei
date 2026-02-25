-- =====================================================
-- SCHEMA COMPLETO — Sistema de Torneio de Vôlei v5
-- Execute este script do zero no Supabase SQL Editor
-- ⚠️ CUIDADO: DROP TABLE apaga todos os dados!
-- =====================================================

-- =====================================================
-- 0. EXTENSÕES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. DROP (ordem reversa para evitar conflitos de FK)
-- =====================================================
DROP TABLE IF EXISTS ia_log       CASCADE;
DROP TABLE IF EXISTS jogos        CASCADE;
DROP TABLE IF EXISTS jogadores    CASCADE;
DROP TABLE IF EXISTS equipes      CASCADE;
DROP TABLE IF EXISTS torneio_config CASCADE;

-- =====================================================
-- 2. torneio_config
-- =====================================================
CREATE TABLE torneio_config (
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
  campeao_id          UUID,                    -- FK adicionada depois de equipes
  bracket_resumo_ia   TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO torneio_config (id, chaveamento_gerado, ao_vivo, fase_atual, inscricoes_abertas, times_formados)
VALUES (1, FALSE, FALSE, 'inscricoes', TRUE, FALSE);

-- =====================================================
-- 3. equipes
-- =====================================================
CREATE TABLE equipes (
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

-- FK de torneio_config → equipes (após criar equipes)
ALTER TABLE torneio_config
  ADD CONSTRAINT torneio_config_campeao_id_fkey
  FOREIGN KEY (campeao_id) REFERENCES equipes(id) ON DELETE SET NULL;

-- =====================================================
-- 4. jogadores
-- =====================================================
CREATE TABLE jogadores (
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

-- Índice único no email (ignora nulos e vazios)
CREATE UNIQUE INDEX jogadores_email_unique
  ON jogadores (email)
  WHERE email IS NOT NULL AND email <> '';

-- =====================================================
-- 5. jogos
-- =====================================================
CREATE TABLE jogos (
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
  status                    TEXT DEFAULT 'aguardando'
                              CHECK (status IN ('aguardando', 'em_andamento', 'finalizado')),
  proximo_jogo_vencedor_id  INT REFERENCES jogos(id) ON DELETE SET NULL,
  proximo_jogo_perdedor_id  INT REFERENCES jogos(id) ON DELETE SET NULL,
  slot_vencedor             TEXT CHECK (slot_vencedor IN ('equipe_a_id', 'equipe_b_id')),
  slot_perdedor             TEXT CHECK (slot_perdedor IN ('equipe_a_id', 'equipe_b_id')),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jogos_updated_at
  BEFORE UPDATE ON jogos
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- =====================================================
-- 6. ia_log
-- =====================================================
CREATE TABLE ia_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_chamada   TEXT,
  modelo_usado   TEXT,
  prompt_sistema TEXT,
  prompt_usuario TEXT,
  resposta       TEXT,
  tokens_entrada INT,
  tokens_saida   INT,
  tentativa      INT DEFAULT 1,
  sucesso        BOOLEAN,
  erro_validacao TEXT,
  duracao_ms     INT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. ÍNDICES
-- =====================================================
CREATE INDEX jogos_status_idx     ON jogos    (status);
CREATE INDEX jogos_ordem_idx      ON jogos    (ordem_exibicao);
CREATE INDEX jogadores_equipe_idx ON jogadores (equipe_id);
CREATE INDEX ia_log_tipo_idx      ON ia_log   (tipo_chamada);
CREATE INDEX ia_log_created_idx   ON ia_log   (created_at DESC);

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE jogadores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneio_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_log       ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "pub_sel_jogadores"     ON jogadores    FOR SELECT USING (true);
CREATE POLICY "pub_sel_equipes"       ON equipes      FOR SELECT USING (true);
CREATE POLICY "pub_sel_jogos"         ON jogos        FOR SELECT USING (true);
CREATE POLICY "pub_sel_config"        ON torneio_config FOR SELECT USING (true);

-- Escrita pública (torneio sem autenticação — use anon key no front-end)
CREATE POLICY "pub_ins_jogadores"     ON jogadores    FOR INSERT WITH CHECK (true);
CREATE POLICY "pub_all_equipes"       ON equipes      FOR ALL    USING (true);
CREATE POLICY "pub_all_jogos"         ON jogos        FOR ALL    USING (true);
CREATE POLICY "pub_all_config"        ON torneio_config FOR ALL  USING (true);
CREATE POLICY "pub_all_ia_log"        ON ia_log       FOR ALL    USING (true);
CREATE POLICY "pub_upd_jogadores"     ON jogadores    FOR UPDATE USING (true);
CREATE POLICY "pub_del_jogadores"     ON jogadores    FOR DELETE USING (true);

-- =====================================================
-- 9. REALTIME
-- =====================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    jogadores, equipes, jogos, torneio_config;
COMMIT;
