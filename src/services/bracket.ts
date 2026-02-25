import { supabase } from '@/lib/supabase'
import type { Equipe, Jogo } from '@/types'

export interface ResultadoJogo {
    jogoId: number
    vencedorId: string
    perdedorId: string
    placarA?: number
    placarB?: number
}

export interface ResultadoProcessado {
    error: Error | null
    timeEliminado?: { id: string; nome: string; logo_url?: string | null; posicao: number } | null
    campeao?: { id: string; nome: string; logo_url?: string | null } | null
}

export async function processarResultado({
    jogoId,
    vencedorId,
    perdedorId,
    placarA,
    placarB,
}: ResultadoJogo): Promise<ResultadoProcessado> {
    try {
        const { data: jogoAtual, error: errBusca } = await supabase
            .from('jogos')
            .select('*')
            .eq('id', jogoId)
            .single()

        if (errBusca) throw errBusca

        // Atualizar jogo com resultado
        const { error: jogoErr } = await supabase
            .from('jogos')
            .update({
                vencedor_id: vencedorId,
                perdedor_id: perdedorId,
                placar_a: placarA ?? null,
                placar_b: placarB ?? null,
                status: 'finalizado',
                updated_at: new Date().toISOString(),
            })
            .eq('id', jogoId)

        if (jogoErr) throw jogoErr

        // Determinar fluxo
        const chaveJogo: string = jogoAtual.chave || jogoAtual.tipo || ''
        let isTournamentEnd = false
        let proximoVencedorId: number | null = jogoAtual.proximo_jogo_vencedor_id
        let proximoPerdedorId: number | null = jogoAtual.proximo_jogo_perdedor_id

        // Se o invicto ganhou a grande final → campeão direto
        if (chaveJogo === 'final' && vencedorId === jogoAtual.equipe_a_id) {
            isTournamentEnd = true
            proximoVencedorId = null
            proximoPerdedorId = null
        }
        // Se é o jogo decisivo ou o último jogo sem próximo → encerra
        if ((chaveJogo === 'decisivo' || chaveJogo === 'final') && !proximoVencedorId) {
            isTournamentEnd = true
        }

        // ── Avançar vencedor ──
        if (proximoVencedorId) {
            const { data: proxV } = await supabase
                .from('jogos').select('equipe_a_id, equipe_b_id').eq('id', proximoVencedorId).single()

            let slotV = (jogoAtual.slot_vencedor ?? (proxV?.equipe_a_id ? 'equipe_b_id' : 'equipe_a_id')) as 'equipe_a_id' | 'equipe_b_id'

            if (proxV) {
                const outro = slotV === 'equipe_a_id' ? 'equipe_b_id' : 'equipe_a_id'
                if (proxV[slotV] !== null && proxV[slotV] !== vencedorId && proxV[outro] === null) slotV = outro
            }

            const { error: vErr } = await supabase.from('jogos')
                .update({ [slotV]: vencedorId, status: 'aguardando', updated_at: new Date().toISOString() })
                .eq('id', proximoVencedorId)
            if (vErr) throw vErr
        }

        // ── Mover perdedor para repescagem ──
        if (proximoPerdedorId) {
            const { data: proxP } = await supabase
                .from('jogos').select('equipe_a_id, equipe_b_id').eq('id', proximoPerdedorId).single()

            let slotP = (jogoAtual.slot_perdedor ?? (proxP?.equipe_a_id ? 'equipe_b_id' : 'equipe_a_id')) as 'equipe_a_id' | 'equipe_b_id'

            if (proxP) {
                const outro = slotP === 'equipe_a_id' ? 'equipe_b_id' : 'equipe_a_id'
                if (proxP[slotP] === perdedorId) {
                    // já correto
                } else if (proxP[slotP] !== null && proxP[outro] === null) {
                    slotP = outro
                } else if (proxP[outro] === perdedorId) {
                    slotP = outro
                }
            }

            const { error: pErr } = await supabase.from('jogos')
                .update({ [slotP]: perdedorId, updated_at: new Date().toISOString() })
                .eq('id', proximoPerdedorId)
            if (pErr) throw pErr
        }

        // ── Posição dinâmica ──
        const { data: todasEquipes } = await supabase
            .from('equipes').select('id, nome, logo_url, colocacao_final')

        const totalTimes = todasEquipes?.length ?? 0
        // Já eliminados: têm colocação E não são o vencedor atual
        const jaEliminados = todasEquipes?.filter(e =>
            e.colocacao_final != null && e.id !== vencedorId
        ).length ?? 0

        let timeEliminado: ResultadoProcessado['timeEliminado'] = null
        let campeaoInfo: ResultadoProcessado['campeao'] = null

        // Atribuir posição ao perdedor que foi eliminado (sem próximo jogo de repescagem)
        if (!proximoPerdedorId) {
            const posicao = Math.max(2, totalTimes - jaEliminados)
            const eq = todasEquipes?.find(e => e.id === perdedorId)
            await supabase.from('equipes')
                .update({ colocacao_final: String(posicao), eliminado: true })
                .eq('id', perdedorId)
            timeEliminado = { id: perdedorId, nome: eq?.nome ?? 'Time', logo_url: eq?.logo_url, posicao }
        }

        // Campeão
        if (isTournamentEnd) {
            const eq = todasEquipes?.find(e => e.id === vencedorId)
            await supabase.from('equipes')
                .update({ colocacao_final: '1', eliminado: false })
                .eq('id', vencedorId)
            await supabase.from('torneio_config').upsert({
                id: 1, campeao_id: vencedorId, fase_atual: 'encerrado',
            })
            // Vice-campeão: se o perdedor ainda não tem posição
            const vicePend = todasEquipes?.find(e => e.id === perdedorId && !e.colocacao_final)
            if (vicePend) {
                await supabase.from('equipes').update({ colocacao_final: '2' }).eq('id', perdedorId)
                timeEliminado = { id: perdedorId, nome: vicePend.nome, logo_url: vicePend.logo_url, posicao: 2 }
            }
            campeaoInfo = { id: vencedorId, nome: eq?.nome ?? 'Campeão', logo_url: eq?.logo_url }
        }

        return { error: null, timeEliminado, campeao: campeaoInfo }
    } catch (err) {
        console.error('Erro ao processar resultado:', err)
        return { error: err as Error }
    }
}

export async function desfazerResultado(jogo: Jogo): Promise<{ error: Error | null }> {
    try {
        // Limpar resultado do jogo
        const { error: e1 } = await supabase
            .from('jogos')
            .update({
                vencedor_id: null, perdedor_id: null,
                placar_a: null, placar_b: null,
                status: 'aguardando', updated_at: new Date().toISOString(),
            })
            .eq('id', jogo.id)
        if (e1) throw e1

        // Limpar vencedor do próximo jogo
        if (jogo.proximo_jogo_vencedor_id) {
            await supabase.from('jogos')
                .update({ [jogo.slot_vencedor!]: null, status: 'aguardando', updated_at: new Date().toISOString() })
                .eq('id', jogo.proximo_jogo_vencedor_id)
        }

        // Limpar perdedor do próximo jogo (repescagem)
        if (jogo.proximo_jogo_perdedor_id) {
            await supabase.from('jogos')
                .update({ [jogo.slot_perdedor!]: null, updated_at: new Date().toISOString() })
                .eq('id', jogo.proximo_jogo_perdedor_id)
        }

        // Limpar colocação / eliminado do perdedor
        if (jogo.perdedor_id) {
            await supabase.from('equipes')
                .update({ colocacao_final: null, eliminado: false })
                .eq('id', jogo.perdedor_id)
        }

        // Se era o jogo final, reverter estado do torneio e vencedor
        const chaveJogo = jogo.chave || jogo.tipo
        const isFinalOrDecisive = chaveJogo === 'final' || chaveJogo === 'decisivo'
        if (isFinalOrDecisive && !jogo.proximo_jogo_vencedor_id) {
            await supabase.from('torneio_config').upsert({
                id: 1, campeao_id: null, fase_atual: 'em_andamento',
            })
            if (jogo.vencedor_id) {
                await supabase.from('equipes')
                    .update({ colocacao_final: null })
                    .eq('id', jogo.vencedor_id)
            }
        }

        return { error: null }
    } catch (err) {
        return { error: err as Error }
    }
}

export function getColocacaoLabel(c: string | null): { emoji: string; texto: string } | null {
    if (!c) return null
    const n = Number(c)
    if (n === 1) return { emoji: '🥇', texto: '1º Lugar' }
    if (n === 2) return { emoji: '🥈', texto: '2º Lugar' }
    if (n === 3) return { emoji: '🥉', texto: '3º Lugar' }
    if (n <= 5) return { emoji: ['', '🎖️', '🎖️', '🎖️', '4️⃣', '5️⃣'][n] ?? '🏅', texto: `${n}º Lugar` }
    return { emoji: '🏅', texto: `${n}º Lugar` }
}

export async function fetchJogos(): Promise<Jogo[]> {
    const { data, error } = await supabase
        .from('jogos')
        .select(`
      *,
      equipe_a:equipes!jogos_equipe_a_id_fkey(*),
      equipe_b:equipes!jogos_equipe_b_id_fkey(*),
      vencedor:equipes!jogos_vencedor_id_fkey(*),
      perdedor:equipes!jogos_perdedor_id_fkey(*)
    `)
        .order('id', { ascending: true })

    if (error) throw error
    return (data ?? []) as unknown as Jogo[]
}

export async function fetchEquipes(): Promise<Equipe[]> {
    const { data, error } = await supabase
        .from('equipes')
        .select('*')
        .order('seed', { ascending: true, nullsFirst: false })
    if (error) throw error
    return (data ?? []) as Equipe[]
}
