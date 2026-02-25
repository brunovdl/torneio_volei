/**
 * Serviço Central de IA — Sistema de Torneio de Vôlei v5
 * Todas as chamadas ao modelo passam por este módulo
 */

import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type {
    Jogador,
    Equipe,
    ConfigTorneio,
    DistribuicaoTimes,
    BracketCompleto,
    JogoIA,
    IALog,
    TipoChamadaIA,
} from '@/types'

// =====================================================
// SCHEMAS ZOD — validação da resposta da IA
// =====================================================

const JogadorIASchema = z.object({
    id: z.string(),
    nome: z.string(),
    genero: z.string().optional().default('nao_informado'),
    cabeca_de_chave: z.boolean().optional().default(false),
})

const TimeDistribuidoSchema = z.object({
    id: z.string(),
    jogadores: z.array(JogadorIASchema.extend({ cabeca_de_chave: z.boolean().optional().default(false) })),
    resumo_genero: z.object({
        masculino: z.number(),
        feminino: z.number(),
        nao_informado: z.number().optional().default(0),
    }),
    misto_valido: z.boolean(),
})

const DistribuicaoTimesSchema = z.object({
    times: z.array(TimeDistribuidoSchema),
    lista_espera: z.array(JogadorIASchema.partial()).default([]),
    justificativa: z.string().optional().default(''),
    avisos: z.array(z.string()).optional().default([]),
})

const ProximoJogoSchema = z.object({
    numero_jogo: z.number(),
    slot: z.enum(['a', 'b']),
}).nullable()

const JogoIASchema = z.object({
    numero_jogo: z.number(),
    rodada: z.number(),
    chave: z.string(),
    is_bye: z.boolean().optional().default(false),
    time_a_id: z.string().nullable(),
    time_b_id: z.string().nullable(),
    proximo_jogo_vencedor: ProximoJogoSchema,
    proximo_jogo_perdedor: ProximoJogoSchema,
    descricao: z.string().optional().default(''),
})

const BracketCompletoSchema = z.object({
    total_times: z.number(),
    total_jogos: z.number(),
    tem_jogo_decisivo: z.boolean(),
    resumo: z.string().optional().default(''),
    jogos: z.array(JogoIASchema),
    colocacoes: z.array(z.object({
        posicao: z.number(),
        descricao: z.string(),
    })).optional().default([]),
    ordem_sugerida_jogos: z.array(z.number()).optional().default([]),
    validacoes: z.object({
        todos_times_jogam_minimo_2: z.boolean(),
        nenhum_confronto_repetido_precocemente: z.boolean().optional().default(true),
        grande_final_correta: z.boolean(),
        jogo_decisivo_necessario: z.boolean(),
    }).optional().default({
        todos_times_jogam_minimo_2: true,
        nenhum_confronto_repetido_precocemente: true,
        grande_final_correta: true,
        jogo_decisivo_necessario: false,
    }),
})

// =====================================================
// PROMPTS
// =====================================================

function buildSistemaDivisaoPrompt(): string {
    return `Você é um assistente especializado em organização de torneios esportivos de vôlei.
Retorne APENAS JSON válido. Sem texto, sem markdown, sem comentários fora do JSON.`
}

function buildUsuarioDivisaoPrompt(
    config: ConfigTorneio,
    timesComCabecas: Array<{ id: string; nome: string; cabecaDeChave: Jogador }>,
    jogadoresDisponiveis: Jogador[]
): string {
    const cabecasFixos = timesComCabecas.reduce((acc, t) => {
        const j = t.cabecaDeChave
        acc[t.id] = {
            cabeca_de_chave: {
                id: j.id,
                nome: j.nome,
                genero: j.genero,
                posicao: j.posicao ?? null,
            }
        }
        return acc
    }, {} as Record<string, unknown>)

    const jogadoresParaIa = jogadoresDisponiveis.map(j => ({
        id: j.id,
        nome: j.nome,
        genero: j.genero,
        posicao: j.posicao ?? null,
    }))

    return `Distribua os jogadores abaixo em ${config.numTimes} times de ${config.porTime} jogadores cada.

REGRAS OBRIGATÓRIAS:
1. Cabeças de chave são IMUTÁVEIS — não os mova de seus times.
2. Cada time deve ter ao menos 1 masculino E 1 feminino (obrigatório).
3. Jogadores "nao_informado" não satisfazem a cota de gênero.
4. Equilibre posições: prefira 1 levantador por time se possível.
5. Distribua gêneros proporcionalmente além do mínimo obrigatório.
6. Excedentes vão para lista_espera (prefira o gênero com mais excedente).

TIMES E CABEÇAS DE CHAVE FIXOS:
${JSON.stringify(cabecasFixos, null, 2)}

JOGADORES DISPONÍVEIS:
${JSON.stringify(jogadoresParaIa, null, 2)}

RETORNE APENAS ESTE JSON:
{
  "times": [
    {
      "id": "time_1",
      "jogadores": [{ "id": "...", "nome": "...", "genero": "...", "cabeca_de_chave": true }],
      "resumo_genero": { "masculino": 0, "feminino": 0, "nao_informado": 0 },
      "misto_valido": true
    }
  ],
  "lista_espera": [],
  "justificativa": "...",
  "avisos": []
}`
}

function buildSistemaGeracaoTorneioPrompt(): string {
    return `Você é um especialista em estruturação de torneios esportivos no formato de eliminatória dupla (double elimination).
Sua tarefa é gerar a estrutura completa de jogos de um torneio dado um número de times.
Retorne APENAS um objeto JSON válido. Nenhum texto fora do JSON. Nenhum bloco markdown.
O JSON será processado diretamente por um sistema — qualquer texto extra causará erro fatal.`
}

function buildUsuarioGeracaoTorneioPrompt(times: Equipe[]): string {
    const timesParaIA = times.map((t, i) => ({
        id: t.id,
        nome: t.nome,
        seed: t.seed ?? (i + 1),
    }))

    return `Gere a estrutura completa de jogos para um torneio de eliminatória dupla com os times abaixo.

════════════════════════════════════════════════
TIMES PARTICIPANTES (em ordem de seed)
════════════════════════════════════════════════

${JSON.stringify(timesParaIA, null, 2)}

════════════════════════════════════════════════
REGRAS DO TORNEIO — TODAS OBRIGATÓRIAS
════════════════════════════════════════════════

REGRA 1 — ELIMINATÓRIA DUPLA:
- Todo time que perde pela PRIMEIRA vez vai para a Repescagem (Losers Bracket).
- Todo time que perde pela SEGUNDA vez está ELIMINADO definitivamente.
- As duas chaves correm em paralelo e se encontram na Grande Final.

REGRA 2 — MÍNIMO DE 2 JOGOS POR TIME:
- Nenhum time pode ser eliminado sem ter jogado pelo menos 2 partidas.
- BYES (folgas) NÃO contam como partida jogada.

REGRA 3 — BYES:
- Insira byes na 1ª rodada da Chave Vencedores para equilibrar o bracket.
- Times com seed menor recebem os byes preferencialmente.
- Marque jogos de bye com "is_bye": true e apenas "time_a_id" preenchido.
- "time_b_id" deve ser null para byes.

REGRA 4 — 1ª RODADA: seed 1 vs seed N, seed 2 vs seed N-1, etc.

REGRA 5 — GRANDE FINAL:
- O vencedor da Chave Vencedores enfrenta o vencedor da Repescagem.
- Se o time invicto ganhar → CAMPEÃO DIRETO.
- Se o time da repescagem ganhar → jogo decisivo (chave: "decisivo").

REGRA 6 — PROGRESSÃO: informe proximo_jogo_vencedor e proximo_jogo_perdedor para cada jogo.

REGRA 7 — NUMERAÇÃO: sequencial a partir de 1, em ordem cronológica.

════════════════════════════════════════════════
SCHEMA DE RETORNO (JSON puro — sem nada mais)
════════════════════════════════════════════════

{
  "total_times": ${timesParaIA.length},
  "total_jogos": <número>,
  "tem_jogo_decisivo": <boolean>,
  "resumo": "Descrição breve da estrutura gerada",
  "jogos": [
    {
      "numero_jogo": 1,
      "rodada": 1,
      "chave": "vencedores",
      "is_bye": false,
      "time_a_id": "<uuid>",
      "time_b_id": "<uuid>",
      "proximo_jogo_vencedor": { "numero_jogo": 3, "slot": "a" },
      "proximo_jogo_perdedor": { "numero_jogo": 4, "slot": "a" },
      "descricao": "Seed 1 vs Seed ${timesParaIA.length}"
    }
  ],
  "colocacoes": [
    { "posicao": 1, "descricao": "Campeão" },
    { "posicao": 2, "descricao": "Vice" },
    { "posicao": 3, "descricao": "3º Lugar" }
  ],
  "ordem_sugerida_jogos": [1, 2, 3, ...],
  "validacoes": {
    "todos_times_jogam_minimo_2": true,
    "nenhum_confronto_repetido_precocemente": true,
    "grande_final_correta": true,
    "jogo_decisivo_necessario": <boolean>
  }
}`
}

// =====================================================
// VALIDAÇÃO DO BRACKET
// =====================================================

export interface ResultadoValidacao {
    valido: boolean
    erros: string[]
}

export function validarBracketIA(bracket: BracketCompleto, times: Equipe[]): ResultadoValidacao {
    const erros: string[] = []
    const idsValidos = new Set(times.map(t => t.id))
    const jogosMap = new Map<number, JogoIA>(bracket.jogos.map(j => [j.numero_jogo, j]))

    for (const jogo of bracket.jogos) {
        // 1. IDs de times válidos
        if (jogo.time_a_id && !idsValidos.has(jogo.time_a_id)) {
            erros.push(`Jogo ${jogo.numero_jogo}: time_a_id "${jogo.time_a_id}" não existe na lista de times`)
        }
        if (jogo.time_b_id && !idsValidos.has(jogo.time_b_id)) {
            erros.push(`Jogo ${jogo.numero_jogo}: time_b_id "${jogo.time_b_id}" não existe na lista de times`)
        }

        // 2. Mesmo time nos dois slots
        if (jogo.time_a_id && jogo.time_b_id && jogo.time_a_id === jogo.time_b_id) {
            erros.push(`Jogo ${jogo.numero_jogo}: time_a_id e time_b_id são iguais`)
        }

        // 3. Referências de próximos jogos existem
        if (jogo.proximo_jogo_vencedor && !jogosMap.has(jogo.proximo_jogo_vencedor.numero_jogo)) {
            erros.push(`Jogo ${jogo.numero_jogo}: proximo_jogo_vencedor ${jogo.proximo_jogo_vencedor.numero_jogo} não existe`)
        }
        if (jogo.proximo_jogo_perdedor && !jogosMap.has(jogo.proximo_jogo_perdedor.numero_jogo)) {
            erros.push(`Jogo ${jogo.numero_jogo}: proximo_jogo_perdedor ${jogo.proximo_jogo_perdedor.numero_jogo} não existe`)
        }
    }

    // 4. Existe exatamente 1 jogo final
    const finais = bracket.jogos.filter(j => j.chave === 'final')
    if (finais.length === 0) {
        erros.push('Nenhum jogo com chave "final" encontrado')
    } else if (finais.length > 1) {
        erros.push(`Mais de um jogo com chave "final": ${finais.map(j => j.numero_jogo).join(', ')}`)
    }

    // 5. 0 ou 1 jogo decisivo
    const decisivos = bracket.jogos.filter(j => j.chave === 'decisivo')
    if (decisivos.length > 1) {
        erros.push(`Mais de um jogo decisivo: ${decisivos.map(j => j.numero_jogo).join(', ')}`)
    }

    // 6. Sem ciclos simples (jogo não referencia a si mesmo)
    for (const jogo of bracket.jogos) {
        if (jogo.proximo_jogo_vencedor?.numero_jogo === jogo.numero_jogo ||
            jogo.proximo_jogo_perdedor?.numero_jogo === jogo.numero_jogo) {
            erros.push(`Jogo ${jogo.numero_jogo}: referencia a si mesmo (ciclo)`)
        }
    }

    // 7. Número de jogos coerente (mínimo: 2*n-1 para single elim, menos byes)
    const n = times.length
    const minJogos = n - 1 // mínimo absoluto
    if (bracket.jogos.length < minJogos) {
        erros.push(`Total de jogos (${bracket.jogos.length}) insuficiente para ${n} times (mínimo ${minJogos})`)
    }

    return { valido: erros.length === 0, erros }
}

// =====================================================
// SERVIÇO PRINCIPAL
// =====================================================

export const IAService = {

    /**
     * Fase 3: Dividir jogadores nos times
     */
    async dividirTimes(
        config: ConfigTorneio,
        timesComCabecas: Array<{ id: string; nome: string; cabecaDeChave: Jogador }>,
        jogadoresDisponiveis: Jogador[]
    ): Promise<DistribuicaoTimes> {
        const systemPrompt = buildSistemaDivisaoPrompt()
        const userPrompt = buildUsuarioDivisaoPrompt(config, timesComCabecas, jogadoresDisponiveis)

        let ultimoErro = ''
        for (let tentativa = 1; tentativa <= 3; tentativa++) {
            const inicio = Date.now()
            let resposta = ''
            let sucesso = false
            let erroValidacao: string | null = null

            try {
                const promptFinal = tentativa > 1
                    ? `[RETRY — ERRO NA GERAÇÃO ANTERIOR]\nA estrutura gerada anteriormente falhou na validação:\n"${ultimoErro}"\n\nPor favor, corrija e gere novamente. Os dados são os mesmos.\n\n${userPrompt}`
                    : userPrompt

                resposta = await this._chamarModelo(systemPrompt, promptFinal, tentativa)
                const resultado = this._parsearJSON(resposta, DistribuicaoTimesSchema)
                sucesso = true

                await this._registrarLog({
                    tipo_chamada: tentativa > 1 ? 'retry' : 'divisao_times',
                    modelo_usado: 'openai/gpt-oss-120b',
                    prompt_sistema: systemPrompt,
                    prompt_usuario: promptFinal,
                    resposta,
                    tentativa,
                    sucesso: true,
                    duracao_ms: Date.now() - inicio,
                })

                return resultado as DistribuicaoTimes
            } catch (err: unknown) {
                const error = err as Error
                ultimoErro = error.message
                erroValidacao = error.message
                sucesso = false

                await this._registrarLog({
                    tipo_chamada: tentativa > 1 ? 'retry' : 'divisao_times',
                    modelo_usado: 'openai/gpt-oss-120b',
                    prompt_sistema: systemPrompt,
                    prompt_usuario: userPrompt,
                    resposta,
                    tentativa,
                    sucesso,
                    erro_validacao: erroValidacao,
                    duracao_ms: Date.now() - inicio,
                })

                if (tentativa === 3) throw new Error(`Falha após 3 tentativas: ${ultimoErro}`)
            }
        }

        throw new Error('Falha inesperada na divisão de times')
    },

    /**
     * Fase 4: Gerar a estrutura completa do torneio
     */
    async gerarTorneio(times: Equipe[]): Promise<BracketCompleto> {
        const systemPrompt = buildSistemaGeracaoTorneioPrompt()
        const userPrompt = buildUsuarioGeracaoTorneioPrompt(times)

        let ultimoErro = ''
        for (let tentativa = 1; tentativa <= 3; tentativa++) {
            const inicio = Date.now()
            let resposta = ''
            let sucesso = false
            let erroValidacao: string | null = null

            try {
                const promptFinal = tentativa > 1
                    ? `[RETRY — ERRO NA GERAÇÃO ANTERIOR]\nA estrutura gerada anteriormente falhou na validação:\n"${ultimoErro}"\n\nPor favor, corrija e gere novamente. Os times e regras são os mesmos informados anteriormente.\n\n${userPrompt}`
                    : userPrompt

                resposta = await this._chamarModelo(systemPrompt, promptFinal, tentativa)
                const bracket = this._parsearJSON(resposta, BracketCompletoSchema) as BracketCompleto

                // Validação semântica do bracket
                const validacao = validarBracketIA(bracket, times)
                if (!validacao.valido) {
                    ultimoErro = validacao.erros.join('; ')
                    throw new Error(`Bracket inválido: ${ultimoErro}`)
                }

                sucesso = true

                await this._registrarLog({
                    tipo_chamada: tentativa > 1 ? 'retry' : 'geracao_torneio',
                    modelo_usado: 'openai/gpt-oss-120b',
                    prompt_sistema: systemPrompt,
                    prompt_usuario: promptFinal,
                    resposta,
                    tentativa,
                    sucesso: true,
                    duracao_ms: Date.now() - inicio,
                })

                return bracket
            } catch (err: unknown) {
                const error = err as Error
                ultimoErro = error.message
                erroValidacao = error.message
                sucesso = false

                await this._registrarLog({
                    tipo_chamada: tentativa > 1 ? 'retry' : 'geracao_torneio',
                    modelo_usado: 'openai/gpt-oss-120b',
                    prompt_sistema: systemPrompt,
                    prompt_usuario: userPrompt,
                    resposta,
                    tentativa,
                    sucesso,
                    erro_validacao: erroValidacao,
                    duracao_ms: Date.now() - inicio,
                })

                if (tentativa === 3) throw new Error(`Falha após 3 tentativas: ${ultimoErro}`)
            }
        }

        throw new Error('Falha inesperada na geração do torneio')
    },

    /**
   * Interno: chama o Groq diretamente no client (desenvolvimento) ou via proxy /api/ia (produção Vercel)
   */
    async _chamarModelo(
        systemPrompt: string,
        userPrompt: string,
        tentativa = 1
    ): Promise<string> {
        const viteKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined

        // Em desenvolvimento (npm run dev): chamada direta ao Groq com VITE_GROQ_API_KEY
        if (viteKey) {
            const GROQ_BASE = 'https://api.groq.com/openai/v1'
            // Modelo primário — troque pelo modelo Groq desejado:
            // llama-3.3-70b-versatile | llama3-70b-8192 | mixtral-8x7b-32768
            const model = tentativa >= 3 ? 'llama-3.3-70b-versatile' : 'llama-3.3-70b-versatile'

            const response = await fetch(`${GROQ_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${viteKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.3,
                    max_tokens: 4096,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                }),
            })

            if (!response.ok) {
                const errText = await response.text()
                throw new Error(`Groq ${response.status}: ${errText.slice(0, 200)}`)
            }

            const data = await response.json() as {
                choices?: Array<{ message?: { content?: string } }>
            }
            const content = data.choices?.[0]?.message?.content
            if (!content) throw new Error('Resposta vazia do Groq')
            return content
        }

        // Em produção (Vercel): usa o proxy serverless /api/ia que guarda a chave no servidor
        const response = await fetch('/api/ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userPrompt, tentativa }),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText })) as { error: string }
            throw new Error(err.error || `Erro HTTP ${response.status}`)
        }

        const data = await response.json() as { content: string }
        return data.content
    },

    /**
     * Interno: parseia e valida o JSON retornado pela IA com Zod
     */
    _parsearJSON<T>(resposta: string, schema: z.ZodType<T>): T {
        // Tentar extrair JSON de resposta que pode ter texto extra
        let jsonStr = resposta.trim()

        // Remover blocos markdown se existirem
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')

        // Encontrar o primeiro { e o último }
        const firstBrace = jsonStr.indexOf('{')
        const lastBrace = jsonStr.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
        }

        let parsed: unknown
        try {
            parsed = JSON.parse(jsonStr)
        } catch {
            throw new Error(`JSON inválido retornado pela IA: ${jsonStr.slice(0, 200)}...`)
        }

        const resultado = schema.safeParse(parsed)
        if (!resultado.success) {
            const erroFormatado = resultado.error.errors
                .map(e => `${e.path.join('.')}: ${e.message}`)
                .join('; ')
            throw new Error(`Schema inválido: ${erroFormatado}`)
        }

        return resultado.data
    },

    /**
     * Interno: registra a chamada no banco (auditoria)
     */
    async _registrarLog(dados: Omit<IALog, 'id' | 'created_at'>): Promise<void> {
        try {
            await supabase.from('ia_log').insert({
                tipo_chamada: dados.tipo_chamada as TipoChamadaIA,
                modelo_usado: dados.modelo_usado,
                prompt_sistema: dados.prompt_sistema,
                prompt_usuario: dados.prompt_usuario.slice(0, 5000), // limitar tamanho
                resposta: dados.resposta?.slice(0, 5000),
                tokens_entrada: dados.tokens_entrada,
                tokens_saida: dados.tokens_saida,
                tentativa: dados.tentativa,
                sucesso: dados.sucesso,
                erro_validacao: dados.erro_validacao,
                duracao_ms: dados.duracao_ms,
            })
        } catch (err) {
            // Log de auditoria não deve quebrar o fluxo principal
            console.warn('[IAService] Falha ao registrar log:', err)
        }
    },
}

// =====================================================
// UTILIDADES DE CONFIGURAÇÃO
// =====================================================

export function calcularOpcoes(
    jogadores: Jogador[],
    porTime: number
): Array<{ numTimes: number; porTime: number; listaEspera: number; mistoGarantido: boolean }> {
    const total = jogadores.length
    const masc = jogadores.filter(j =>
        j.genero === 'M' || j.genero === 'masculino'
    ).length
    const fem = jogadores.filter(j =>
        j.genero === 'F' || j.genero === 'feminino'
    ).length

    const max = Math.floor(total / porTime)
    if (max < 2) return []

    const opcoes = []
    for (let n = max; n >= Math.max(2, max - 10); n--) {
        if (n < 2) break
        const listaEspera = total - n * porTime
        if (listaEspera < 0) continue

        opcoes.push({
            numTimes: n,
            porTime,
            listaEspera,
            mistoGarantido: masc >= n && fem >= n,
        })
    }

    return opcoes
}

export function validarMistoPossivel(
    jogadores: Jogador[],
    numTimes: number
): { valido: boolean; aviso?: string } {
    const masc = jogadores.filter(j => j.genero === 'M' || j.genero === 'masculino').length
    const fem = jogadores.filter(j => j.genero === 'F' || j.genero === 'feminino').length

    if (masc < numTimes) {
        return {
            valido: false,
            aviso: `Insuficiente: ${masc} homens para ${numTimes} times (precisa de pelo menos 1 por time)`,
        }
    }
    if (fem < numTimes) {
        return {
            valido: false,
            aviso: `Insuficiente: ${fem} mulheres para ${numTimes} times (precisa de pelo menos 1 por time)`,
        }
    }
    return { valido: true }
}

/**
 * Salva o bracket gerado pela IA na tabela `jogos`
 * Normaliza os numero_jogo para IDs sequenciais 1..N para evitar
 * overflow do tipo INTEGER do PostgreSQL (max ~2.1 bilhões).
 */
export async function salvarBracket(bracket: BracketCompleto): Promise<void> {
    // 1. Deletar jogos anteriores
    await supabase.from('jogos').delete().not('id', 'is', null)

    // 2. Construir mapa: numero_jogo_original → id_sequencial (1, 2, 3...)
    const idMap = new Map<number, number>()
    bracket.jogos.forEach((jogo, idx) => {
        idMap.set(jogo.numero_jogo, idx + 1)
    })

    // 3. Montar objetos para inserção com IDs normalizados
    const jogosParaInserir = bracket.jogos.map((jogo, idx) => {
        const idNormal = idx + 1  // ID sequencial seguro para INTEGER
        const proximoVenc = jogo.proximo_jogo_vencedor
        const proximoPerd = jogo.proximo_jogo_perdedor

        // Traduzir referências de numero_jogo para IDs sequenciais
        const proxVencId = proximoVenc ? (idMap.get(proximoVenc.numero_jogo) ?? null) : null
        const proxPerdId = proximoPerd ? (idMap.get(proximoPerd.numero_jogo) ?? null) : null

        // Mapear slot 'a'/'b' para o nome de coluna do banco
        const slotVencedor = proximoVenc?.slot === 'a' ? 'equipe_a_id'
            : proximoVenc?.slot === 'b' ? 'equipe_b_id' : null
        const slotPerdedor = proximoPerd?.slot === 'a' ? 'equipe_a_id'
            : proximoPerd?.slot === 'b' ? 'equipe_b_id' : null

        // Calcular ordem de exibição: usar índice no array ordem_sugerida se disponível
        const ordemOriginal = jogo.numero_jogo
        const ordemIdx = bracket.ordem_sugerida_jogos.indexOf(ordemOriginal)
        const ordemExibicao = ordemIdx !== -1 ? ordemIdx + 1 : idNormal

        return {
            id: idNormal,
            numero_jogo: idNormal,
            rodada: String(jogo.rodada),
            tipo: jogo.chave,
            chave: jogo.chave,
            is_bye: jogo.is_bye ?? false,
            label: jogo.descricao || `Jogo ${idNormal}`,
            descricao: jogo.descricao,
            ordem_exibicao: ordemExibicao,
            equipe_a_id: jogo.time_a_id ?? null,
            equipe_b_id: jogo.is_bye ? null : (jogo.time_b_id ?? null),
            proximo_jogo_vencedor_id: proxVencId,
            proximo_jogo_perdedor_id: proxPerdId,
            slot_vencedor: slotVencedor,
            slot_perdedor: slotPerdedor,
            status: 'aguardando',
        }
    })

    const { error } = await supabase.from('jogos').insert(jogosParaInserir)
    if (error) throw new Error(`Erro ao salvar bracket: ${error.message}`)
}

