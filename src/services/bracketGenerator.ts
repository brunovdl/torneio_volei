import type { Equipe, Jogo } from '@/types'

export interface GenerationNode {
    id: number
    rodada: number | string
    tipo: 'vencedores' | 'repescagem' | 'semifinal' | 'final' | 'desempate'
    equipe_a_id: string | null
    equipe_b_id: string | null
    label: string
    proximo_jogo_vencedor_id: number | null
    proximo_jogo_perdedor_id: number | null
    slot_vencedor: 'equipe_a_id' | 'equipe_b_id' | null
    slot_perdedor: 'equipe_a_id' | 'equipe_b_id' | null
}

/**
 * Gera as partidas da Double Elimination e preenche ligações de próximo jogo automaticamente.
 */
export function gerarDoubleEliminationMatches(times: Equipe[]): Partial<Jogo>[] {
    const n = times.length;
    if (n < 3) throw new Error("Mínimo de 3 times");

    if (n === 6) {
        return gerarDoubleElimination6Times(times);
    }

    const nodes: GenerationNode[] = [];
    let jogoId = 1;

    // Calculando potência de 2 superior ou igual a n
    const p = Math.pow(2, Math.ceil(Math.log2(n)));

    // WINNERS BRACKET (WB)
    const wbRoundsCount = Math.log2(p);
    const wbMatches: GenerationNode[][] = Array.from({ length: wbRoundsCount }, () => []);

    let currentMatchesCount = p / 2;
    for (let r = 0; r < wbRoundsCount; r++) {
        for (let m = 0; m < currentMatchesCount; m++) {
            const match: GenerationNode = {
                id: jogoId++,
                rodada: `WB R${r + 1} `,
                tipo: 'vencedores',
                equipe_a_id: null,
                equipe_b_id: null,
                label: `Jogo ${jogoId - 1} · Chave Principal`,
                proximo_jogo_vencedor_id: null,
                proximo_jogo_perdedor_id: null,
                slot_vencedor: null,
                slot_perdedor: null,
            };
            nodes.push(match);
            wbMatches[r].push(match);
        }
        currentMatchesCount /= 2;
    }

    // Interligando WB e mapeando para LB
    for (let r = 0; r < wbRoundsCount - 1; r++) {
        const nextRound = wbMatches[r + 1];
        for (let m = 0; m < wbMatches[r].length; m++) {
            const parentMatch = wbMatches[r][m];
            const nextMatch = nextRound[Math.floor(m / 2)];
            const isSlotA = m % 2 === 0;

            parentMatch.proximo_jogo_vencedor_id = nextMatch.id;
            parentMatch.slot_vencedor = isSlotA ? 'equipe_a_id' : 'equipe_b_id';
        }
    }

    // LOSERS BRACKET (LB)
    const lbMatches: GenerationNode[][] = [];
    let lbRoundsCount = 2 * (wbRoundsCount - 1);

    if (lbRoundsCount > 0) {
        let lbCurrentMatches = p / 4;
        for (let r = 0; r < lbRoundsCount; r++) {
            const roundMatches: GenerationNode[] = [];
            for (let m = 0; m < Math.max(1, lbCurrentMatches); m++) {
                const match: GenerationNode = {
                    id: jogoId++,
                    rodada: `LB R${r + 1} `,
                    tipo: 'repescagem',
                    equipe_a_id: null,
                    equipe_b_id: null,
                    label: `Jogo ${jogoId - 1} · Repescagem`,
                    proximo_jogo_vencedor_id: null,
                    proximo_jogo_perdedor_id: null,
                    slot_vencedor: null,
                    slot_perdedor: null,
                };
                nodes.push(match);
                roundMatches.push(match);
            }
            lbMatches.push(roundMatches);
            if (r % 2 !== 0 && lbCurrentMatches > 1) {
                lbCurrentMatches /= 2;
            }
        }

        // Interligando LB
        for (let r = 0; r < lbRoundsCount - 1; r++) {
            const nextRound = lbMatches[r + 1];
            for (let m = 0; m < lbMatches[r].length; m++) {
                const parentMatch = lbMatches[r][m];
                // O mapeamento exato da repescagem pode variar, o padrão genérico liga
                // no próximo com base se é Major ou Minor round.
                const isMajorRound = (r % 2 === 1);
                const nextMatchIdx = isMajorRound ? Math.floor(m / 2) : m;
                const nextMatch = nextRound[nextMatchIdx];

                parentMatch.proximo_jogo_vencedor_id = nextMatch.id;
                parentMatch.slot_vencedor = isMajorRound ? (m % 2 === 0 ? 'equipe_a_id' : 'equipe_b_id') : 'equipe_a_id';
            }
        }

        // Interligando perdedores da WB para a LB
        for (let r = 0; r < wbRoundsCount; r++) {
            if (r === wbRoundsCount - 1) break; // A final da WB vai para a Grand Final

            const targetLbRoundIdx = (r === 0) ? 0 : (r * 2 - 1);
            if (targetLbRoundIdx < lbRoundsCount) {
                const targetLbRound = lbMatches[targetLbRoundIdx];
                for (let m = 0; m < wbMatches[r].length; m++) {
                    const match = wbMatches[r][m];
                    let targetMatchIdx = Math.floor(m / (wbMatches[r].length / targetLbRound.length));
                    if (!targetLbRound[targetMatchIdx]) targetMatchIdx = 0; // fallback safety

                    match.proximo_jogo_perdedor_id = targetLbRound[targetMatchIdx].id;
                    // Na Rodada 1, dois times caem no mesmo jogo, então um preenche o A e outro o B
                    // Nas demais rodadas, o slot A já vem com o vencedor anterior da LB, e o da WB cai no B
                    match.slot_perdedor = (r === 0) ? (m % 2 === 0 ? 'equipe_a_id' : 'equipe_b_id') : 'equipe_b_id';
                }
            }
        }
    }

    // GRANDE FINAL
    const grandFinal: GenerationNode = {
        id: jogoId++,
        rodada: 'GF',
        tipo: 'final',
        equipe_a_id: null,
        equipe_b_id: null,
        label: `Jogo ${jogoId - 1} · Grande Final`,
        proximo_jogo_vencedor_id: null,
        proximo_jogo_perdedor_id: null, // Será GF Resolutiva se necessário
        slot_vencedor: null,
        slot_perdedor: null,
    };
    nodes.push(grandFinal);

    // Vencedor da WB vai para GF
    const wbFinal = wbMatches[wbRoundsCount - 1][0];
    wbFinal.proximo_jogo_vencedor_id = grandFinal.id;
    wbFinal.slot_vencedor = 'equipe_a_id';
    wbFinal.proximo_jogo_perdedor_id = lbMatches.length > 0 ? lbMatches[lbRoundsCount - 1][0].id : grandFinal.id;
    wbFinal.slot_perdedor = lbMatches.length > 0 ? 'equipe_b_id' : 'equipe_b_id';

    // Campeão da LB vai para GF (se houver LB)
    if (lbMatches.length > 0) {
        const lbFinal = lbMatches[lbRoundsCount - 1][0];
        lbFinal.proximo_jogo_vencedor_id = grandFinal.id;
        lbFinal.slot_vencedor = 'equipe_b_id';
    }

    const grandFinalDesempate: GenerationNode = {
        id: jogoId++,
        rodada: 'GF2',
        tipo: 'desempate',
        equipe_a_id: null,
        equipe_b_id: null,
        label: `Jogo ${jogoId - 1} · Desempate`,
        proximo_jogo_vencedor_id: null,
        proximo_jogo_perdedor_id: null,
        slot_vencedor: null,
        slot_perdedor: null,
    };
    nodes.push(grandFinalDesempate);

    // A final tem um branch opcional (se perdedor da WB perder a sua primeira vez na GF)
    grandFinal.proximo_jogo_perdedor_id = grandFinalDesempate.id;
    grandFinal.slot_perdedor = 'equipe_a_id'; // Invicto perde a primeira
    grandFinal.proximo_jogo_vencedor_id = grandFinalDesempate.id; // Repescagem vence a GF (vai pro set 2) - o código do front/gerenciador deve processar q so é GF2 se a equipe B vencer.
    grandFinal.slot_vencedor = 'equipe_b_id';

    // INSERÇÃO DAS EQUIPES E BYES NA RODADA 1
    let nextTeamIdx = 0;
    for (let m = 0; m < wbMatches[0].length; m++) {
        const match = wbMatches[0][m];
        match.equipe_a_id = nextTeamIdx < n ? times[nextTeamIdx++].id : null;
        match.equipe_b_id = nextTeamIdx < n ? times[nextTeamIdx++].id : null;
        // Tratar byes se o id for nulo, isso precisaria simular um avanço automático.
        // Como o nosso 'Sorteio' fará isso no runtime, apenas deixamos nulo se vazio.
    }

    return nodes as Partial<Jogo>[];
}

/**
 * Motor Estático e Exato para Torneios de 6 Equipes,
 * evitando Byes fantasmas e cruzamentos vazios.
 */
function gerarDoubleElimination6Times(times: Equipe[]): Partial<Jogo>[] {
    const nodes: GenerationNode[] = [];

    // As equipes 5 e 6 entram de Byes na WB R2
    const t = times.map(eq => eq.id);

    nodes.push({ id: 1, rodada: 'WB R1', tipo: 'vencedores', label: 'Jogo 1 · Chave Principal', equipe_a_id: t[0] || null, equipe_b_id: t[1] || null, proximo_jogo_vencedor_id: 3, proximo_jogo_perdedor_id: 6, slot_vencedor: 'equipe_a_id', slot_perdedor: 'equipe_a_id' });
    nodes.push({ id: 2, rodada: 'WB R1', tipo: 'vencedores', label: 'Jogo 2 · Chave Principal', equipe_a_id: t[2] || null, equipe_b_id: t[3] || null, proximo_jogo_vencedor_id: 4, proximo_jogo_perdedor_id: 7, slot_vencedor: 'equipe_a_id', slot_perdedor: 'equipe_a_id' });

    // T5 e T6 aguardam os vencedores na R2
    nodes.push({ id: 3, rodada: 'WB R2', tipo: 'vencedores', label: 'Jogo 3 · Chave Principal', equipe_a_id: null, equipe_b_id: t[4] || null, proximo_jogo_vencedor_id: 5, proximo_jogo_perdedor_id: 7, slot_vencedor: 'equipe_a_id', slot_perdedor: 'equipe_b_id' });
    nodes.push({ id: 4, rodada: 'WB R2', tipo: 'vencedores', label: 'Jogo 4 · Chave Principal', equipe_a_id: null, equipe_b_id: t[5] || null, proximo_jogo_vencedor_id: 5, proximo_jogo_perdedor_id: 6, slot_vencedor: 'equipe_b_id', slot_perdedor: 'equipe_b_id' });

    // Final dos Vencedores (W3 vs W4)
    nodes.push({ id: 5, rodada: 'WB R3', tipo: 'vencedores', label: 'Jogo 5 · Final WB', equipe_a_id: null, equipe_b_id: null, proximo_jogo_vencedor_id: 10, proximo_jogo_perdedor_id: 9, slot_vencedor: 'equipe_a_id', slot_perdedor: 'equipe_b_id' });

    // --- REPESCAGEM (LB) ---
    // Repescagem R1: Cruzamento invertido para não repetir confrontos precoces (L1 x L4) (L2 x L3)
    nodes.push({ id: 6, rodada: 'LB R1', tipo: 'repescagem', label: 'Jogo 6 · Repescagem', equipe_a_id: null, equipe_b_id: null, proximo_jogo_vencedor_id: 8, proximo_jogo_perdedor_id: null, slot_vencedor: 'equipe_a_id', slot_perdedor: null });
    nodes.push({ id: 7, rodada: 'LB R1', tipo: 'repescagem', label: 'Jogo 7 · Repescagem', equipe_a_id: null, equipe_b_id: null, proximo_jogo_vencedor_id: 8, proximo_jogo_perdedor_id: null, slot_vencedor: 'equipe_b_id', slot_perdedor: null });

    // Repescagem R2: W6 vs W7
    nodes.push({ id: 8, rodada: 'LB R2', tipo: 'repescagem', label: 'Jogo 8 · Repescagem', equipe_a_id: null, equipe_b_id: null, proximo_jogo_vencedor_id: 9, proximo_jogo_perdedor_id: null, slot_vencedor: 'equipe_a_id', slot_perdedor: null });

    // Final da Repescagem (LB R3): W8 vs L5
    nodes.push({ id: 9, rodada: 'LB R3', tipo: 'repescagem', label: 'Jogo 9 · Final LB', equipe_a_id: null, equipe_b_id: null, proximo_jogo_vencedor_id: 10, proximo_jogo_perdedor_id: null, slot_vencedor: 'equipe_b_id', slot_perdedor: null });

    // --- GRANDE FINAL ---
    nodes.push({ id: 10, rodada: 'GF', tipo: 'final', label: 'Jogo 10 · Grande Final', equipe_a_id: null, equipe_b_id: null, proximo_jogo_vencedor_id: 11, proximo_jogo_perdedor_id: 11, slot_vencedor: 'equipe_b_id', slot_perdedor: 'equipe_a_id' });
    nodes.push({ id: 11, rodada: 'GF2', tipo: 'desempate', label: 'Jogo 11 · Desempate GF', equipe_a_id: null, equipe_b_id: null, proximo_jogo_vencedor_id: null, proximo_jogo_perdedor_id: null, slot_vencedor: null, slot_perdedor: null });

    return nodes as Partial<Jogo>[];
}
