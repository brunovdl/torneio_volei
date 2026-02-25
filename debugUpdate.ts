import { supabase } from './src/lib/supabase'

async function debugUpdate() {
    const { data: jogo1 } = await supabase.from('jogos').select('*').eq('id', 1).single();
    if (!jogo1) {
        console.log("Jogo 1 não encontrado!");
        return;
    }

    console.log("Jogo 1 antes:", jogo1);

    const vencedorId = jogo1.equipe_a_id;
    const perdedorId = jogo1.equipe_b_id;

    console.log("Tentando definir vencedor_id=", vencedorId, " e perdedor_id=", perdedorId);

    const { data: eqVenc, error: evErr } = await supabase.from('equipes').select('*').eq('id', vencedorId).single();
    if (evErr) console.log("Equipe A NÃO encontrada na tabela equipes!", evErr);
    else console.log("Equipe A EXISTE:", eqVenc);

    // Tenta fazer o MESMO update que o processarResultado faz:
    const { error: updErr } = await supabase
        .from('jogos')
        .update({
            vencedor_id: vencedorId,
            perdedor_id: perdedorId,
            status: 'finalizado',
        })
        .eq('id', 1);

    if (updErr) {
        console.error("ERRO NO PRIMEIRO UPDATE:", updErr);
    } else {
        console.log("Primeiro update passou sem erro de FK!");
        // e o próximo?
        if (jogo1.proximo_jogo_vencedor_id) {
            console.log("Avançando para prox vencedor, jogo:", jogo1.proximo_jogo_vencedor_id, " slot:", jogo1.slot_vencedor);
            const { error: vErr } = await supabase
                .from('jogos')
                .update({ [jogo1.slot_vencedor]: vencedorId, status: 'aguardando' })
                .eq('id', jogo1.proximo_jogo_vencedor_id)
            if (vErr) console.error("ERRO NO SEGUNDO UPDATE (Vencedor):", vErr);
            else console.log("Segundo update (Vencedor) passou!");
        }
    }
}

debugUpdate();
