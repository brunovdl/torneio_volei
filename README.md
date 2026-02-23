# 🏐 Sistema de Torneio de Vôlei — IEQ JD Portugal

App web completo para gerenciar um torneio de vôlei de areia focado no modelo **Eliminatória Dupla com 5 equipes**. Todo o sistema foi construído para funcionar no EasyPanel usando Vite (React), e é alimentado por um backend Supabase (Postgres, Auth, Realtime).

## 🚀 Tecnologias

- **Frontend:** React + Vite + TypeScript + TailwindCSS
- **Backend (BaaS):** Supabase (Banco de Dados, Autenticação, Storage, Tempo Real)
- **Roteamento:** React Router DOM
- **Formulários:** React Hook Form + Zod
- **Build / Deploy:** Docker multi-stage (Node builder + Nginx static server)

---

## 🏗 Como instalar e rodar localmente

### 1. Preparar o Supabase (Baas)
Você precisará de uma conta no [Supabase](https://supabase.com/).

1. Crie um novo **Projeto** no Supabase.
2. Acesse o **SQL Editor** no painel esquerdo.
3. Copie o conteúdo do arquivo `supabase/schema.sql` (encontrado na raiz deste projeto) e cole no SQL Editor.
4. Clique em **Run**. Isso criará todas as tabelas, triggers para tempo real e as regras de segurança (RLS).
5. Vá na aba **Storage**, crie um novo bucket chamado `logos` e marque a opção **Public bucket**.
6. Vá na aba **Authentication** > **Users** e clique em **Add user** -> **Create new user**. Crie um e-mail e senha pra você usar como **Administrador** da plataforma.

### 2. Configurar o projeto
Copie o arquivo de exemplo env:
```bash
cp .env.example .env
```
Abra o `.env` e preencha as duas variáveis com os dados do seu projeto Supabase (Localizados em Project Settings > API).

### 3. Executar o ambiente de desenvolvimento
```bash
npm install
npm run dev
```

Pronto! Acesse `http://localhost:5173` para visualizar a aplicação.

---

## 🚢 Como fazer o deploy no EasyPanel

O projeto já contém um `Dockerfile` preparado para Single Page Applications (SPA).

1. No **EasyPanel**, crie uma **New App** selecionando a origem do seu projeto, preferencialmente **GitHub**.
2. Conecte o repositório onde este código se encontra (`brunovdl/torneio_volei`).
3. Nas configurações do App dentro do EasyPanel:
   - Garanta que o tipo de deploy está como `Dockerfile`.
   - Adicione as **Environment Variables** (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
4. Clique em **Deploy**!
5. Se o domínio do painel pedir, a porta a ser exposta pelo docker é a `80`.

---

## 🎯 Guia Rápido de Uso no Evento

1. **Inscrições:** Divulgue o link e peça para 5 times se inscreverem. O sistema vai bloquear automaticamente quando der 5.
2. **Setup Inicial (Sorteio):** Faça o login em `/admin/login`, vá no menu **Sorteio** e defina quem é T1, T2, T3, T4 e T5 (O chapéu). Clique em `Gerar Chaveamento`. Isso vai montar a tabela visual completa.
3. **Durante o Torneio:** No menu **Dashboard**, habilite o botão vermelho **🔴 Modo Ao Vivo** para todos que estiverem acessando saberem que o torneio começou.
4. **Alimentando placar:** Vá na aba **Jogos** e simplemente selecione quem ganhou a partida e o placar (opcional) e salve. A progressão ocorre automaticamente. A mesma tela de todo mundo que estiver assistindo atualizará em tempo real sem a necessidade da pessoa apertar F5 na tela do celular.

---
Feito com ⚡ React e muito voleibol de areia.
