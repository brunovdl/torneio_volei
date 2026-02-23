-- Schema completo para o torneio de vôlei

-- 1. Remover tabelas existentes (cuidado em prod)
DROP TABLE IF EXISTS jogos;
DROP TABLE IF EXISTS torneio_config;
DROP TABLE IF EXISTS equipes;

-- 2. Tabela de Equipes
CREATE TABLE equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  logo_url TEXT,
  posicao TEXT CHECK (posicao IN ('T1', 'T2', 'T3', 'T4', 'T5', null)),
  colocacao_final TEXT CHECK (colocacao_final IN ('1', '2', '3', '4', '5', null)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Jogos
CREATE TABLE jogos (
  id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 9),
  rodada TEXT NOT NULL,
  tipo TEXT NOT NULL,
  label TEXT NOT NULL,
  equipe_a_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
  equipe_b_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
  vencedor_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
  perdedor_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
  placar_a INTEGER,
  placar_b INTEGER,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_andamento', 'finalizado')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Configuração (sempre 1 única linha)
CREATE TABLE torneio_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  chaveamento_gerado BOOLEAN DEFAULT false,
  ao_vivo BOOLEAN DEFAULT false,
  fase_atual TEXT,
  campeao_id UUID REFERENCES equipes(id) ON DELETE SET NULL
);

-- INSERIR LINHA ÚNICA NA CONFIG
INSERT INTO torneio_config (id) VALUES (1);

-- INSERIR OS 9 JOGOS BASE
INSERT INTO jogos (id, rodada, tipo, label) VALUES
  (1, 'abertura', 'vencedores', 'Jogo 1 · Abertura'),
  (2, 'abertura', 'vencedores', 'Jogo 2 · Abertura'),
  (3, 'segunda', 'vencedores', 'Jogo 3 · Chave Vencedores'),
  (4, 'segunda', 'repescagem', 'Jogo 4 · Repescagem'),
  (5, 'terceira', 'vencedores', 'Jogo 5 · Final Vencedores'),
  (6, 'terceira', 'repescagem', 'Jogo 6 · Repescagem'),
  (7, 'semifinal', 'semifinal', 'Jogo 7 · Semifinal'),
  (8, 'final', 'final', 'Jogo 8 · Grande Final'),
  (9, 'final', 'desempate', 'Jogo 9 · Desempate');

-- 5. Trigger para updated_at automático na tabela de jogos
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jogos_modtime
BEFORE UPDATE ON jogos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- POLITICAS DE SEGURANÇA BÁSICAS (RLS)
-- =========================================

-- Habilitar RLS
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneio_config ENABLE ROW LEVEL SECURITY;

-- Equipes: leitura pública. Apenas anônimos/auth podem inserir. Up/Del só admin (auth)
CREATE POLICY "Leitura pública equips" ON equipes FOR SELECT USING (true);
CREATE POLICY "Inserção pública equips" ON equipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin pode tudo equips" ON equipes FOR ALL USING (auth.role() = 'authenticated');

-- Jogos: leitura pública. Up/Del só admin.
CREATE POLICY "Leitura pública jogos" ON jogos FOR SELECT USING (true);
CREATE POLICY "Admin pode tudo jogos" ON jogos FOR ALL USING (auth.role() = 'authenticated');

-- Config: leitura pública. Up/Del só admin.
CREATE POLICY "Leitura pública config" ON torneio_config FOR SELECT USING (true);
CREATE POLICY "Admin pode tudo config" ON torneio_config FOR ALL USING (auth.role() = 'authenticated');

-- STORAGE (Crie o bucket "logos" manualmente nas configs do Supabase e coloque como Público)
-- Ou execute via script:
-- insert into storage.buckets (id, name, public) values ('logos', 'logos', true);
-- create policy "Leitura publica" on storage.objects for select using ( bucket_id = 'logos' );
-- create policy "Insert publico" on storage.objects for insert with check ( bucket_id = 'logos' );
