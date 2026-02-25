# 🏐 Torneio de Vôlei — Sistema Completo v5

App web para gerenciar torneios de vôlei no formato **Eliminatória Dupla (Double Elimination)** com número dinâmico de times. Alimentado por IA (Groq) para distribuição das equipes e geração do chaveamento.

## 🚀 Stack

- **Frontend:** React + Vite + TypeScript + TailwindCSS  
- **Backend:** Supabase (PostgreSQL + Realtime + RLS)  
- **IA:** Groq API (modelos llama via `/api/ia` proxy Vercel ou direto no dev)  
- **Deploy:** Vercel (recommended) ou Docker/EasyPanel

---

## ⚙️ Configurar e Rodar

### 1. Supabase — Criar banco

1. Crie um projeto em [supabase.com](https://supabase.com/)
2. Abra o **SQL Editor** e execute `supabase/schema.sql`
3. Em **Storage**, crie um bucket `logos` marcado como **público**

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_URL=http://localhost:5173

# Groq — para chamar a IA em desenvolvimento
VITE_GROQ_API_KEY=gsk_...

# Groq — para o proxy Vercel em produção (não expor no front)
GROQ_API_KEY=gsk_...
```

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

---

## 🎯 Fluxo do Torneio

```
Inscrições → Configurar → Divisão IA → Sorteio/Seeds → Bracket IA → Jogos Ao Vivo
```

| Etapa | URL Admin | O que faz |
|---|---|---|
| Inscrições | `/admin/jogadores` | Abrir/fechar inscrições |
| Configuração | `/admin/configurar` | Nº de times, tamanho, cabeças de chave |
| Divisão IA | `/admin/divisao-ia` | IA divide jogadores → ajuste manual via drag-drop |
| Seeds | `/admin/sorteio` | Ordenar/embaralhar seeds → IA gera bracket |
| Ao Vivo | `/admin/jogos` | Registrar resultados; alertas de eliminação em tempo real |
| Logs IA | `/admin/ia-logs` | Histórico de chamadas à IA |

---

## 🚢 Deploy Vercel (recomendado)

1. Conecte o repositório na Vercel
2. Adicione todas as variáveis do `.env.example` no painel da Vercel  
3. A variável `GROQ_API_KEY` (sem `VITE_`) fica segura no servidor — nunca exposta no front

## 🐳 Deploy Docker / EasyPanel

```bash
docker build -t torneio-volei .
docker run -p 80:80 torneio-volei
```

Na Dockerfile as variáveis do Vite precisam ser passadas em build-time via `--build-arg`.

---

Feito com ⚡ React, Supabase e Groq AI.
