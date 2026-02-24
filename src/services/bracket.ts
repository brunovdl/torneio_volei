import { supabase } from '@/lib/supabase'
import type { Equipe, Jogo } from '@/types'

/**
 * Mapa estático das regras de progressão do torneio de eliminatória dupla (5 times).
 * Para cada jogo (1-8), define para qual próximo jogo o vencedor e o perdedor vão,
 * e em que "slot" (equipe_a ou equipe_b) eles entram.
 *
 * null significa eliminação (calcula colocação com base no andamento).
 */
export const PROGRESSAO: Record<
    number,
    {
        vencedor: { jogo: number; slot: 'equipe_a_id' | 'equipe_b_id' } | null
        perdedor: { jogo: number; slot: 'equipe_a_id' | 'equipe_b_id' } | null
        colocacao_perdedor: string | null
    }
> = {
    // Jogo 1: T1 x T2 → vencedor para J3 slot A; perdedor para J4 slot A
    1: {
        vencedor: { jogo: 3, slot: 'equipe_a_id' },
        perdedor: { jogo: 4, slot: 'equipe_a_id' },
        colocacao_perdedor: null,
    },
    // Jogo 2: T3 x T4 → vencedor para J5 slot A; perdedor para J4 slot B
    2: {
        vencedor: { jogo: 5, slot: 'equipe_a_id' },
        perdedor: { jogo: 4, slot: 'equipe_b_id' },
        colocacao_perdedor: null,
    },
    // Jogo 3: Venc J1 x T5 → vencedor para J5 slot B; perdedor para J6 slot B
    3: {
        vencedor: { jogo: 5, slot: 'equipe_b_id' },
        perdedor: { jogo: 6, slot: 'equipe_b_id' },
        colocacao_perdedor: null,
    },
    // Jogo 4: Perd J1 x Perd J2 → vencedor para J6 slot A; perdedor = ELIMINADO 5º
    4: {
        vencedor: { jogo: 6, slot: 'equipe_a_id' },
        perdedor: null,
        colocacao_perdedor: '5',
    },
    // Jogo 5: Venc J2 x Venc J3 (Final Vencedores) → vencedor para J8 slot A; perdedor para J7 slot B
    5: {
        vencedor: { jogo: 8, slot: 'equipe_a_id' },
        perdedor: { jogo: 7, slot: 'equipe_b_id' },
        colocacao_perdedor: null,
    },
    // Jogo 6: Venc J4 x Perd J3 → vencedor para J7 slot A; perdedor = ELIMINADO 4º
    6: {
        vencedor: { jogo: 7, slot: 'equipe_a_id' },
        perdedor: null,
        colocacao_perdedor: '4',
    },
    // Jogo 7: Semifinal repescagem → vencedor para J8 slot B; perdedor = 3º lugar (Bronze)
    7: {
        vencedor: { jogo: 8, slot: 'equipe_b_id' },
        perdedor: null,
        colocacao_perdedor: '3',
    },
    // Jogo 8: Grande Final
    //   Se vencedor = slot A (invicto) → CAMPEÃO, sem J9
    //   Se vencedor = slot B (repescagem) → J9 é necessário
    8: {
        vencedor: { jogo: 9, slot: 'equipe_a_id' },
        perdedor: { jogo: 9, slot: 'equipe_b_id' },
        colocacao_perdedor: null,
    },
    // Jogo 9: Desempate final
    9: {
        vencedor: null,
        perdedor: null,
        colocacao_perdedor: '2',
    },
}

export interface ResultadoJogo {
    jogoId: number
    vencedorId: string
    perdedorId: string
    placarA?: number
    placarB?: number
}

/**
 * Processa o resultado de um jogo:
 * 1. Atualiza o jogo com vencedor, perdedor e placar
 * 2. Preenche automaticamente as vagas nos próximos jogos
 * 3. Marca colocação de times eliminados
 * 4. Verifica se o torneio terminou
 */
export async function processarResultado({
    jogoId,
    vencedorId,
    perdedorId,
    placarA,
    placarB,
}: ResultadoJogo): Promise<{ error: Error | null }> {
    try {
        // 1. Atualizar o jogo atual
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

        const regra = PROGRESSAO[jogoId]

        // 2. Registrar próximo jogo do vencedor
        if (regra.vencedor) {
            const { error: vErr } = await supabase
                .from('jogos')
                .update({ [regra.vencedor.slot]: vencedorId, status: 'aguardando', updated_at: new Date().toISOString() })
                .eq('id', regra.vencedor.jogo)
            if (vErr) throw vErr
        }

        // 3. Registrar próximo jogo do perdedor (ou marcar colocação)
        if (regra.perdedor) {
            const { error: pErr } = await supabase
                .from('jogos')
                .update({ [regra.perdedor.slot]: perdedorId, updated_at: new Date().toISOString() })
                .eq('id', regra.perdedor.jogo)
            if (pErr) throw pErr
        }

        // 4. Se há colocação final para o perdedor, atualizar equipe
        if (regra.colocacao_perdedor) {
            const { error: elErr } = await supabase
                .from('equipes')
                .update({ colocacao_final: regra.colocacao_perdedor })
                .eq('id', perdedorId)
            if (elErr) throw elErr
        }

        // 5. Verificar desfecho da Grande Final (Jogo 8)
        if (jogoId === 8) {
            // Buscar jogo 8 para saber qual era o slot A (time invicto)
            const { data: j8 } = await supabase
                .from('jogos')
                .select('equipe_a_id')
                .eq('id', 8)
                .single()

            if (vencedorId === j8?.equipe_a_id) {
                // Invicto ganhou → campeão sem jogo 9
                await supabase
                    .from('equipes')
                    .update({ colocacao_final: '1' })
                    .eq('id', vencedorId)
                await supabase
                    .from('equipes')
                    .update({ colocacao_final: '2' })
                    .eq('id', perdedorId)
                await supabase
                    .from('torneio_config')
                    .upsert({ id: 1, campeao_id: vencedorId, fase_atual: 'encerrado' })
                // Deletar / marcar J9 como irrelevante
                await supabase
                    .from('jogos')
                    .update({ status: 'aguardando', equipe_a_id: null, equipe_b_id: null })
                    .eq('id', 9)
            } else {
                // Repescagem ganhou → J9 necessário, preencher equipes
                await supabase
                    .from('torneio_config')
                    .upsert({ id: 1, fase_atual: 'desempate' })
                // Equipes já preenchidas via regra.vencedor / regra.perdedor acima
            }
        }

        // 6. Verificar desfecho do Jogo 9 (Desempate)
        if (jogoId === 9) {
            await supabase
                .from('equipes')
                .update({ colocacao_final: '1' })
                .eq('id', vencedorId)
            await supabase
                .from('equipes')
                .update({ colocacao_final: '2' })
                .eq('id', perdedorId)
            await supabase
                .from('torneio_config')
                .upsert({ id: 1, campeao_id: vencedorId, fase_atual: 'encerrado' })
        }

        return { error: null }
    } catch (err) {
        console.error('Erro ao processar resultado:', err)
        return { error: err as Error }
    }
}

/**
 * Desfaz o resultado de um jogo: limpa vencedor/perdedor e limpa os slots
 * dos jogos dependentes, cascadeando reset se necessário (leve, apenas 1 nível).
 */
export async function desfazerResultado(jogo: Jogo): Promise<{ error: Error | null }> {
    try {
        const regra = PROGRESSAO[jogo.id]

        // 1. Limpar jogo atual
        const { error: e1 } = await supabase
            .from('jogos')
            .update({
                vencedor_id: null,
                perdedor_id: null,
                placar_a: null,
                placar_b: null,
                status: 'aguardando',
                updated_at: new Date().toISOString(),
            })
            .eq('id', jogo.id)
        if (e1) throw e1

        // 2. Limpar slot do vencedor no próximo jogo
        if (regra.vencedor) {
            await supabase
                .from('jogos')
                .update({ [regra.vencedor.slot]: null, status: 'aguardando', updated_at: new Date().toISOString() })
                .eq('id', regra.vencedor.jogo)
        }

        // 3. Limpar slot do perdedor no próximo jogo
        if (regra.perdedor) {
            await supabase
                .from('jogos')
                .update({ [regra.perdedor.slot]: null, updated_at: new Date().toISOString() })
                .eq('id', regra.perdedor.jogo)
        }

        // 4. Reverter colocação do perdedor
        if (regra.colocacao_perdedor && jogo.perdedor_id) {
            await supabase
                .from('equipes')
                .update({ colocacao_final: null })
                .eq('id', jogo.perdedor_id)
        }

        // 5. Reverter campeão se necessário
        if (jogo.id === 8 || jogo.id === 9) {
            await supabase
                .from('torneio_config')
                .upsert({ id: 1, campeao_id: null, fase_atual: 'grande_final' })
            if (jogo.vencedor_id) {
                await supabase.from('equipes').update({ colocacao_final: null }).eq('id', jogo.vencedor_id)
            }
            if (jogo.perdedor_id) {
                await supabase.from('equipes').update({ colocacao_final: null }).eq('id', jogo.perdedor_id)
            }
        }

        return { error: null }
    } catch (err) {
        return { error: err as Error }
    }
}

/** Retorna o label de cor para cada tipo de jogo */
export function getJogoColor(tipo: Jogo['tipo']): string {
    switch (tipo) {
        case 'vencedores': return 'blue'
        case 'repescagem': return 'red'
        case 'semifinal': return 'purple'
        case 'final': return 'gold'
        case 'desempate': return 'gold'
        default: return 'gray'
    }
}

export function getColocacaoLabel(c: string | null): { emoji: string; texto: string } | null {
    switch (c) {
        case '1': return { emoji: '🥇', texto: '1º Lugar' }
        case '2': return { emoji: '🥈', texto: '2º Lugar' }
        case '3': return { emoji: '🥉', texto: '3º Lugar' }
        case '4': return { emoji: '4️⃣', texto: '4º Lugar' }
        case '5': return { emoji: '5️⃣', texto: '5º Lugar' }
        default: return null
    }
}

/** Busca todos os jogos com equipes relacionadas */
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
        .order('id')

    if (error) throw error
    return (data ?? []) as unknown as Jogo[]
}

/** Busca todas as equipes */
export async function fetchEquipes(): Promise<Equipe[]> {
    const { data, error } = await supabase
        .from('equipes')
        .select('*')
        .order('created_at')
    if (error) throw error
    return (data ?? []) as Equipe[]
}
