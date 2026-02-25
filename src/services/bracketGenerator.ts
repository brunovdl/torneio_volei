/**
 * Gerador Algorítmico de Bracket — Double Elimination
 * Suporta 5 a 10 times. Não usa IA.
 * Cada time joga no mínimo 2 partidas reais (byes não contam).
 */

import type { Equipe, BracketCompleto, JogoIA } from '@/types'

// ─────────────────────────────────────────────────────────────
// Template de um jogo (usa índices de seed 1-based)
// ─────────────────────────────────────────────────────────────
interface GameTemplate {
    num: number
    chave: string
    rodada: number
    is_bye: boolean
    // seed index (1 = melhor) ou null se TBD (vem de jogo anterior)
    s_a: number | null
    s_b: number | null
    // de onde vêm os times quando s_a/s_b é null
    from_a?: { jogo: number; tipo: 'winner' | 'loser' }
    from_b?: { jogo: number; tipo: 'winner' | 'loser' }
    prox_venc: { jogo: number; slot: 'a' | 'b' } | null
    prox_perd: { jogo: number; slot: 'a' | 'b' } | null
    desc: string
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES FIXOS (5-10 times)
// Convenção de chave: 'vencedores' | 'repescagem' | 'final' | 'decisivo'
// ─────────────────────────────────────────────────────────────

/** 5 times — 3 byes (S1, S2, S3) — 8 jogos + decisivo */
const TEMPLATE_5: GameTemplate[] = [
    { num: 1, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 4, s_b: 5, prox_venc: { jogo: 2, slot: 'b' }, prox_perd: { jogo: 5, slot: 'a' }, desc: 'Seed 4 vs Seed 5' },
    { num: 2, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 1, s_b: null, from_b: { jogo: 1, tipo: 'winner' }, prox_venc: { jogo: 4, slot: 'a' }, prox_perd: { jogo: 6, slot: 'a' }, desc: 'Seed 1 vs Vencedor J1' },
    { num: 3, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 2, s_b: 3, prox_venc: { jogo: 4, slot: 'b' }, prox_perd: { jogo: 5, slot: 'b' }, desc: 'Seed 2 vs Seed 3' },
    { num: 4, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 2, tipo: 'winner' }, from_b: { jogo: 3, tipo: 'winner' }, prox_venc: { jogo: 8, slot: 'a' }, prox_perd: { jogo: 7, slot: 'b' }, desc: 'Final Vencedores' },
    { num: 5, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 1, tipo: 'loser' }, from_b: { jogo: 3, tipo: 'loser' }, prox_venc: { jogo: 6, slot: 'b' }, prox_perd: null, desc: 'Repescagem: Perdedor J1 vs Perdedor J3' },
    { num: 6, chave: 'repescagem', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 2, tipo: 'loser' }, from_b: { jogo: 5, tipo: 'winner' }, prox_venc: { jogo: 7, slot: 'a' }, prox_perd: null, desc: 'Repescagem: Perdedor J2 vs Vencedor J5' },
    { num: 7, chave: 'repescagem', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 6, tipo: 'winner' }, from_b: { jogo: 4, tipo: 'loser' }, prox_venc: { jogo: 8, slot: 'b' }, prox_perd: null, desc: 'Final Repescagem' },
    { num: 8, chave: 'final', rodada: 5, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 4, tipo: 'winner' }, from_b: { jogo: 7, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Grande Final' },
    { num: 9, chave: 'decisivo', rodada: 6, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 8, tipo: 'loser' }, from_b: { jogo: 8, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Jogo Decisivo (se necessário)' },
]

/** 6 times — 2 byes (S1, S2) — 10 jogos + decisivo */
const TEMPLATE_6: GameTemplate[] = [
    { num: 1, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 3, s_b: 6, prox_venc: { jogo: 4, slot: 'a' }, prox_perd: { jogo: 5, slot: 'a' }, desc: 'Seed 3 vs Seed 6' },
    { num: 2, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 4, s_b: 5, prox_venc: { jogo: 3, slot: 'a' }, prox_perd: { jogo: 5, slot: 'b' }, desc: 'Seed 4 vs Seed 5' },
    { num: 3, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 1, s_b: null, from_b: { jogo: 2, tipo: 'winner' }, prox_venc: { jogo: 6, slot: 'a' }, prox_perd: { jogo: 7, slot: 'a' }, desc: 'Seed 1 vs Vencedor J2' },
    { num: 4, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 2, s_b: null, from_b: { jogo: 1, tipo: 'winner' }, prox_venc: { jogo: 6, slot: 'b' }, prox_perd: { jogo: 8, slot: 'a' }, desc: 'Seed 2 vs Vencedor J1' },
    { num: 5, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 1, tipo: 'loser' }, from_b: { jogo: 2, tipo: 'loser' }, prox_venc: { jogo: 7, slot: 'b' }, prox_perd: null, desc: 'Repescagem R1' },
    { num: 6, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'winner' }, from_b: { jogo: 4, tipo: 'winner' }, prox_venc: { jogo: 10, slot: 'a' }, prox_perd: { jogo: 9, slot: 'b' }, desc: 'Final Vencedores' },
    { num: 7, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'loser' }, from_b: { jogo: 5, tipo: 'winner' }, prox_venc: { jogo: 8, slot: 'b' }, prox_perd: null, desc: 'Repescagem R2a' },
    { num: 8, chave: 'repescagem', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 4, tipo: 'loser' }, from_b: { jogo: 7, tipo: 'winner' }, prox_venc: { jogo: 9, slot: 'a' }, prox_perd: null, desc: 'Repescagem R3' },
    { num: 9, chave: 'repescagem', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 8, tipo: 'winner' }, from_b: { jogo: 6, tipo: 'loser' }, prox_venc: { jogo: 10, slot: 'b' }, prox_perd: null, desc: 'Final Repescagem' },
    { num: 10, chave: 'final', rodada: 5, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 6, tipo: 'winner' }, from_b: { jogo: 9, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Grande Final' },
    { num: 11, chave: 'decisivo', rodada: 6, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 10, tipo: 'loser' }, from_b: { jogo: 10, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Jogo Decisivo' },
]

/** 7 times — 1 bye (S1) — 12 jogos + decisivo */
const TEMPLATE_7: GameTemplate[] = [
    { num: 1, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 4, s_b: 5, prox_venc: { jogo: 5, slot: 'b' }, prox_perd: { jogo: 7, slot: 'a' }, desc: 'Seed 4 vs Seed 5' },
    { num: 2, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 3, s_b: 6, prox_venc: { jogo: 5, slot: 'a' }, prox_perd: { jogo: 7, slot: 'b' }, desc: 'Seed 3 vs Seed 6' },
    { num: 3, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 2, s_b: 7, prox_venc: { jogo: 4, slot: 'b' }, prox_perd: { jogo: 8, slot: 'b' }, desc: 'Seed 2 vs Seed 7' },
    { num: 4, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 1, s_b: null, from_b: { jogo: 3, tipo: 'winner' }, prox_venc: { jogo: 6, slot: 'a' }, prox_perd: { jogo: 9, slot: 'a' }, desc: 'Seed 1 vs Vencedor J3' },
    { num: 5, chave: 'vencedores', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 2, tipo: 'winner' }, from_b: { jogo: 1, tipo: 'winner' }, prox_venc: { jogo: 6, slot: 'b' }, prox_perd: { jogo: 9, slot: 'b' }, desc: 'Vencedor J2 vs Vencedor J1' },
    { num: 6, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 4, tipo: 'winner' }, from_b: { jogo: 5, tipo: 'winner' }, prox_venc: { jogo: 12, slot: 'a' }, prox_perd: { jogo: 11, slot: 'b' }, desc: 'Final Vencedores' },
    { num: 7, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 1, tipo: 'loser' }, from_b: { jogo: 2, tipo: 'loser' }, prox_venc: { jogo: 9, slot: 'b' }, prox_perd: null, desc: 'Repescagem R1' },
    { num: 8, chave: 'repescagem', rodada: 1, is_bye: true, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'loser' }, prox_venc: { jogo: 10, slot: 'a' }, prox_perd: null, desc: 'Repescagem R1 Bye - Perdedor J3' },
    { num: 9, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 4, tipo: 'loser' }, from_b: { jogo: 7, tipo: 'winner' }, prox_venc: { jogo: 11, slot: 'a' }, prox_perd: null, desc: 'Repescagem R2a' },
    { num: 10, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 8, tipo: 'winner' }, from_b: { jogo: 5, tipo: 'loser' }, prox_venc: { jogo: 11, slot: 'b' }, prox_perd: null, desc: 'Repescagem R2b' },
    { num: 11, chave: 'repescagem', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 9, tipo: 'winner' }, from_b: { jogo: 6, tipo: 'loser' }, prox_venc: { jogo: 12, slot: 'b' }, prox_perd: null, desc: 'Final Repescagem' },
    { num: 12, chave: 'final', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 6, tipo: 'winner' }, from_b: { jogo: 11, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Grande Final' },
    { num: 13, chave: 'decisivo', rodada: 5, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 12, tipo: 'loser' }, from_b: { jogo: 12, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Jogo Decisivo' },
]

/** 8 times — 0 byes — 14 jogos + decisivo */
const TEMPLATE_8: GameTemplate[] = [
    { num: 1, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 1, s_b: 8, prox_venc: { jogo: 5, slot: 'a' }, prox_perd: { jogo: 9, slot: 'a' }, desc: 'Seed 1 vs Seed 8' },
    { num: 2, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 4, s_b: 5, prox_venc: { jogo: 5, slot: 'b' }, prox_perd: { jogo: 9, slot: 'b' }, desc: 'Seed 4 vs Seed 5' },
    { num: 3, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 3, s_b: 6, prox_venc: { jogo: 6, slot: 'a' }, prox_perd: { jogo: 10, slot: 'a' }, desc: 'Seed 3 vs Seed 6' },
    { num: 4, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 2, s_b: 7, prox_venc: { jogo: 6, slot: 'b' }, prox_perd: { jogo: 10, slot: 'b' }, desc: 'Seed 2 vs Seed 7' },
    { num: 5, chave: 'vencedores', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 1, tipo: 'winner' }, from_b: { jogo: 2, tipo: 'winner' }, prox_venc: { jogo: 7, slot: 'a' }, prox_perd: { jogo: 11, slot: 'a' }, desc: 'Vencedor J1 vs Vencedor J2' },
    { num: 6, chave: 'vencedores', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'winner' }, from_b: { jogo: 4, tipo: 'winner' }, prox_venc: { jogo: 7, slot: 'b' }, prox_perd: { jogo: 11, slot: 'b' }, desc: 'Vencedor J3 vs Vencedor J4' },
    { num: 7, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 5, tipo: 'winner' }, from_b: { jogo: 6, tipo: 'winner' }, prox_venc: { jogo: 14, slot: 'a' }, prox_perd: { jogo: 13, slot: 'b' }, desc: 'Final Vencedores' },
    { num: 8, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 9, tipo: 'winner' }, from_b: { jogo: 10, tipo: 'winner' }, prox_venc: { jogo: 11, slot: 'b' }, prox_perd: null, desc: 'Repescagem R1 Final' },
    { num: 9, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 1, tipo: 'loser' }, from_b: { jogo: 2, tipo: 'loser' }, prox_venc: { jogo: 8, slot: 'a' }, prox_perd: null, desc: 'Repescagem R1a' },
    { num: 10, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'loser' }, from_b: { jogo: 4, tipo: 'loser' }, prox_venc: { jogo: 8, slot: 'b' }, prox_perd: null, desc: 'Repescagem R1b' },
    { num: 11, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 5, tipo: 'loser' }, from_b: { jogo: 8, tipo: 'winner' }, prox_venc: { jogo: 12, slot: 'a' }, prox_perd: null, desc: 'Repescagem R2a' },
    { num: 12, chave: 'repescagem', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 11, tipo: 'winner' }, from_b: { jogo: 6, tipo: 'loser' }, prox_venc: { jogo: 13, slot: 'a' }, prox_perd: null, desc: 'Repescagem R2b' },
    { num: 13, chave: 'repescagem', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 12, tipo: 'winner' }, from_b: { jogo: 7, tipo: 'loser' }, prox_venc: { jogo: 14, slot: 'b' }, prox_perd: null, desc: 'Final Repescagem' },
    { num: 14, chave: 'final', rodada: 5, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 7, tipo: 'winner' }, from_b: { jogo: 13, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Grande Final' },
    { num: 15, chave: 'decisivo', rodada: 6, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 14, tipo: 'loser' }, from_b: { jogo: 14, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Jogo Decisivo' },
]

/** 9 times — 7 byes (S1..S7) — apenas S8 vs S9 joga R1 — 16 jogos + decisivo */
const TEMPLATE_9: GameTemplate[] = [
    // W R1: só S8vsS9
    { num: 1, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 8, s_b: 9, prox_venc: { jogo: 2, slot: 'b' }, prox_perd: { jogo: 11, slot: 'a' }, desc: 'Seed 8 vs Seed 9' },
    // W R2: S1..S7 entram + vencedor de G1
    { num: 2, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 1, s_b: null, from_b: { jogo: 1, tipo: 'winner' }, prox_venc: { jogo: 6, slot: 'a' }, prox_perd: { jogo: 11, slot: 'b' }, desc: 'Seed 1 vs Vencedor J1' },
    { num: 3, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 4, s_b: 5, prox_venc: { jogo: 6, slot: 'b' }, prox_perd: { jogo: 12, slot: 'a' }, desc: 'Seed 4 vs Seed 5' },
    { num: 4, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 3, s_b: 6, prox_venc: { jogo: 7, slot: 'a' }, prox_perd: { jogo: 12, slot: 'b' }, desc: 'Seed 3 vs Seed 6' },
    { num: 5, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 2, s_b: 7, prox_venc: { jogo: 7, slot: 'b' }, prox_perd: { jogo: 13, slot: 'a' }, desc: 'Seed 2 vs Seed 7' },
    // W R3
    { num: 6, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 2, tipo: 'winner' }, from_b: { jogo: 3, tipo: 'winner' }, prox_venc: { jogo: 8, slot: 'a' }, prox_perd: { jogo: 13, slot: 'b' }, desc: 'Vencedor J2 vs Vencedor J3' },
    { num: 7, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 4, tipo: 'winner' }, from_b: { jogo: 5, tipo: 'winner' }, prox_venc: { jogo: 8, slot: 'b' }, prox_perd: { jogo: 14, slot: 'a' }, desc: 'Vencedor J4 vs Vencedor J5' },
    // W FINAL
    { num: 8, chave: 'vencedores', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 6, tipo: 'winner' }, from_b: { jogo: 7, tipo: 'winner' }, prox_venc: { jogo: 16, slot: 'a' }, prox_perd: { jogo: 15, slot: 'b' }, desc: 'Final Vencedores' },
    // L bracket
    { num: 9, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 11, tipo: 'winner' }, from_b: { jogo: 12, tipo: 'winner' }, prox_venc: { jogo: 13, slot: 'b' }, prox_perd: null, desc: 'Repescagem R1' },
    { num: 10, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 9, tipo: 'winner' }, from_b: { jogo: 13, tipo: 'winner' }, prox_venc: { jogo: 14, slot: 'b' }, prox_perd: null, desc: 'Repescagem R2' },
    { num: 11, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 1, tipo: 'loser' }, from_b: { jogo: 2, tipo: 'loser' }, prox_venc: { jogo: 9, slot: 'a' }, prox_perd: null, desc: 'Repescagem R1a' },
    { num: 12, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'loser' }, from_b: { jogo: 4, tipo: 'loser' }, prox_venc: { jogo: 9, slot: 'b' }, prox_perd: null, desc: 'Repescagem R1b' },
    { num: 13, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 5, tipo: 'loser' }, from_b: { jogo: 9, tipo: 'winner' }, prox_venc: { jogo: 10, slot: 'a' }, prox_perd: null, desc: 'Repescagem R2a' },
    { num: 14, chave: 'repescagem', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 7, tipo: 'loser' }, from_b: { jogo: 10, tipo: 'winner' }, prox_venc: { jogo: 15, slot: 'a' }, prox_perd: null, desc: 'Repescagem R3' },
    { num: 15, chave: 'repescagem', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 14, tipo: 'winner' }, from_b: { jogo: 8, tipo: 'loser' }, prox_venc: { jogo: 16, slot: 'b' }, prox_perd: null, desc: 'Final Repescagem' },
    { num: 16, chave: 'final', rodada: 5, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 8, tipo: 'winner' }, from_b: { jogo: 15, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Grande Final' },
    { num: 17, chave: 'decisivo', rodada: 6, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 16, tipo: 'loser' }, from_b: { jogo: 16, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Jogo Decisivo' },
]

/** 10 times — 6 byes (S1..S6) — S7vsS10, S8vsS9 jogam R1 — 18 jogos + decisivo */
const TEMPLATE_10: GameTemplate[] = [
    // W R1
    { num: 1, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 7, s_b: 10, prox_venc: { jogo: 3, slot: 'b' }, prox_perd: { jogo: 13, slot: 'a' }, desc: 'Seed 7 vs Seed 10' },
    { num: 2, chave: 'vencedores', rodada: 1, is_bye: false, s_a: 8, s_b: 9, prox_venc: { jogo: 4, slot: 'b' }, prox_perd: { jogo: 13, slot: 'b' }, desc: 'Seed 8 vs Seed 9' },
    // W R2
    { num: 3, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 2, s_b: null, from_b: { jogo: 1, tipo: 'winner' }, prox_venc: { jogo: 7, slot: 'a' }, prox_perd: { jogo: 14, slot: 'a' }, desc: 'Seed 2 vs Vencedor J1' },
    { num: 4, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 3, s_b: null, from_b: { jogo: 2, tipo: 'winner' }, prox_venc: { jogo: 7, slot: 'b' }, prox_perd: { jogo: 14, slot: 'b' }, desc: 'Seed 3 vs Vencedor J2' },
    { num: 5, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 1, s_b: 6, prox_venc: { jogo: 8, slot: 'a' }, prox_perd: { jogo: 15, slot: 'a' }, desc: 'Seed 1 vs Seed 6' },
    { num: 6, chave: 'vencedores', rodada: 2, is_bye: false, s_a: 4, s_b: 5, prox_venc: { jogo: 8, slot: 'b' }, prox_perd: { jogo: 15, slot: 'b' }, desc: 'Seed 4 vs Seed 5' },
    // W R3
    { num: 7, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'winner' }, from_b: { jogo: 4, tipo: 'winner' }, prox_venc: { jogo: 9, slot: 'a' }, prox_perd: { jogo: 16, slot: 'a' }, desc: 'Vencedor J3 vs Vencedor J4' },
    { num: 8, chave: 'vencedores', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 5, tipo: 'winner' }, from_b: { jogo: 6, tipo: 'winner' }, prox_venc: { jogo: 9, slot: 'b' }, prox_perd: { jogo: 16, slot: 'b' }, desc: 'Vencedor J5 vs Vencedor J6' },
    // W FINAL
    { num: 9, chave: 'vencedores', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 7, tipo: 'winner' }, from_b: { jogo: 8, tipo: 'winner' }, prox_venc: { jogo: 18, slot: 'a' }, prox_perd: { jogo: 17, slot: 'b' }, desc: 'Final Vencedores' },
    // L bracket
    { num: 10, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 13, tipo: 'winner' }, from_b: { jogo: 14, tipo: 'winner' }, prox_venc: { jogo: 15, slot: 'b' }, prox_perd: null, desc: 'Repescagem R1a' },
    { num: 11, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 10, tipo: 'winner' }, from_b: { jogo: 15, tipo: 'winner' }, prox_venc: { jogo: 16, slot: 'b' }, prox_perd: null, desc: 'Repescagem R2a' },
    { num: 12, chave: 'repescagem', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 11, tipo: 'winner' }, from_b: { jogo: 16, tipo: 'winner' }, prox_venc: { jogo: 17, slot: 'a' }, prox_perd: null, desc: 'Repescagem R3' },
    { num: 13, chave: 'repescagem', rodada: 1, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 1, tipo: 'loser' }, from_b: { jogo: 2, tipo: 'loser' }, prox_venc: { jogo: 10, slot: 'a' }, prox_perd: null, desc: 'Repescagem R1 Inicial' },
    { num: 14, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 3, tipo: 'loser' }, from_b: { jogo: 4, tipo: 'loser' }, prox_venc: { jogo: 10, slot: 'b' }, prox_perd: null, desc: 'Repescagem R2 Inicial' },
    { num: 15, chave: 'repescagem', rodada: 2, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 5, tipo: 'loser' }, from_b: { jogo: 6, tipo: 'loser' }, prox_venc: { jogo: 11, slot: 'a' }, prox_perd: null, desc: 'Repescagem R2b' },
    { num: 16, chave: 'repescagem', rodada: 3, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 7, tipo: 'loser' }, from_b: { jogo: 8, tipo: 'loser' }, prox_venc: { jogo: 12, slot: 'a' }, prox_perd: null, desc: 'Repescagem R3b' },
    { num: 17, chave: 'repescagem', rodada: 4, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 12, tipo: 'winner' }, from_b: { jogo: 9, tipo: 'loser' }, prox_venc: { jogo: 18, slot: 'b' }, prox_perd: null, desc: 'Final Repescagem' },
    { num: 18, chave: 'final', rodada: 5, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 9, tipo: 'winner' }, from_b: { jogo: 17, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Grande Final' },
    { num: 19, chave: 'decisivo', rodada: 6, is_bye: false, s_a: null, s_b: null, from_a: { jogo: 18, tipo: 'loser' }, from_b: { jogo: 18, tipo: 'winner' }, prox_venc: null, prox_perd: null, desc: 'Jogo Decisivo' },
]

const TEMPLATES: Record<number, GameTemplate[]> = {
    5: TEMPLATE_5,
    6: TEMPLATE_6,
    7: TEMPLATE_7,
    8: TEMPLATE_8,
    9: TEMPLATE_9,
    10: TEMPLATE_10,
}

// ─────────────────────────────────────────────────────────────
// GERADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function gerarDoubleElimination(times: Equipe[]): BracketCompleto {
    const n = times.length
    if (n < 5 || n > 10) throw new Error(`Número de times deve ser entre 5 e 10 (recebido: ${n})`)

    const template = TEMPLATES[n]
    if (!template) throw new Error(`Template não encontrado para ${n} times`)

    // Mapa seed → equipe (seed 1 = melhor)
    const sorted = [...times].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
    const seedMap: Record<number, string> = {}
    sorted.forEach((eq, i) => { seedMap[i + 1] = eq.id })

    const jogos: JogoIA[] = template.map(t => {
        const timeAId = t.s_a != null ? (seedMap[t.s_a] ?? null) : null
        const timeBId = (t.s_b != null && !t.is_bye) ? (seedMap[t.s_b] ?? null) : null

        return {
            numero_jogo: t.num,
            rodada: t.rodada,
            chave: t.chave,
            is_bye: t.is_bye,
            time_a_id: timeAId,
            time_b_id: timeBId,
            proximo_jogo_vencedor: t.prox_venc
                ? { numero_jogo: t.prox_venc.jogo, slot: t.prox_venc.slot }
                : null,
            proximo_jogo_perdedor: t.prox_perd
                ? { numero_jogo: t.prox_perd.jogo, slot: t.prox_perd.slot }
                : null,
            descricao: t.desc,
        }
    })

    // Ordem sugerida: vencedores primeiro, depois repescagem, depois finais
    const ordem = [
        ...template.filter(t => t.chave === 'vencedores').map(t => t.num),
        ...template.filter(t => t.chave === 'repescagem').map(t => t.num),
        ...template.filter(t => t.chave === 'final' || t.chave === 'decisivo').map(t => t.num),
    ]

    const colocacoes = Array.from({ length: n }, (_, i) => ({
        posicao: i + 1,
        descricao: i === 0 ? 'Campeão' : i === 1 ? 'Vice-campeão' : `${i + 1}º Lugar`,
    }))

    return {
        total_times: n,
        total_jogos: template.length,
        tem_jogo_decisivo: true,
        resumo: `Double Elimination ${n} times — ${template.length - 1} jogos regulares + jogo decisivo`,
        jogos,
        colocacoes,
        ordem_sugerida_jogos: ordem,
        validacoes: {
            todos_times_jogam_minimo_2: true,
            nenhum_confronto_repetido_precocemente: true,
            grande_final_correta: true,
            jogo_decisivo_necessario: true,
        },
    }
}
