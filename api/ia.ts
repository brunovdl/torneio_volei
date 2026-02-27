/**
 * API Proxy para chamadas à IA via Groq
 * Vercel Serverless Function — roda no servidor, nunca expõe GROQ_API_KEY ao cliente
 *
 * Desenvolvimento local: use `vercel dev` para que esta função seja servida em /api/ia
 * Produção: Vercel executa este arquivo como Function automaticamente
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const GROQ_BASE = 'https://api.groq.com/openai/v1'

// Modelos disponíveis no Groq (em ordem de preferência):
// - llama-3.3-70b-versatile   ← recomendado para tarefas complexas
// - llama3-70b-8192
// - mixtral-8x7b-32768
// - gemma2-9b-it
// Nota: o ID "openai/gpt-oss-120b" é formato OpenRouter; no Groq use os IDs acima.
const MODEL_PRIMARY = 'openai/gpt-oss-120b'
const MODEL_FALLBACK = 'llama-3.3-70b-versatile' // fallback mais rápido

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        console.error('[IA Proxy] GROQ_API_KEY não definida')
        return res.status(500).json({ error: 'API Key do Groq não configurada no servidor' })
    }

    const { systemPrompt, userPrompt, tentativa = 1 } = req.body as {
        systemPrompt: string
        userPrompt: string
        tentativa?: number
    }

    if (!systemPrompt || !userPrompt) {
        return res.status(400).json({ error: 'systemPrompt e userPrompt são obrigatórios' })
    }

    // Usar modelo fallback a partir da 3ª tentativa
    const model = tentativa >= 3 ? MODEL_FALLBACK : MODEL_PRIMARY

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000) // 60s timeout

    try {
        const response = await fetch(`${GROQ_BASE}/chat/completions`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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

        clearTimeout(timeout)

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[IA Proxy] Erro Groq ${response.status}:`, errorText)
            return res.status(response.status).json({
                error: `Erro na API do Groq: ${response.status}`,
                details: errorText,
                modelo_usado: model,
            })
        }

        const data = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>
            usage?: { prompt_tokens?: number; completion_tokens?: number }
        }

        const content = data.choices?.[0]?.message?.content
        if (!content) {
            return res.status(500).json({ error: 'Resposta vazia da IA' })
        }

        return res.status(200).json({
            content,
            modelo_usado: model,
            tokens_entrada: data.usage?.prompt_tokens,
            tokens_saida: data.usage?.completion_tokens,
        })
    } catch (err: unknown) {
        clearTimeout(timeout)
        const error = err as Error
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: 'Timeout: o Groq demorou mais de 60 segundos' })
        }
        console.error('[IA Proxy] Erro inesperado:', error)
        return res.status(500).json({ error: error.message || 'Erro interno no proxy de IA' })
    }
}
