import { supabase } from '@/lib/supabase'

export const AdminService = {
    /**
     * Reseta o torneio para o estado inicial de inscrições.
     * Apaga equipes, jogos e logs, e limpa as referências nos jogadores.
     */
    async resetTorneio() {
        // 1. Apagar jogos (ordem importa se houver FKs, mas o Supabase lida bem com delete sequencial em transação implícita se configurado)
        // No schema.sql, jogadores -> equipes e jogos -> equipes. Torneio_config -> equipes (campeao_id).

        // Limpar campeão em config primeiro para evitar erro de FK
        await supabase.from('torneio_config').update({
            campeao_id: null,
            fase_atual: 'inscricoes',
            inscricoes_abertas: true,
            times_formados: false,
            chaveamento_gerado: false,
            ao_vivo: false,
            num_times_definido: null,
            bracket_resumo_ia: null
        }).eq('id', 1)

        // 2. Limpar logs de IA
        await supabase.from('ia_log').delete().not('id', 'is', null)

        // 3. Limpar jogos
        await supabase.from('jogos').delete().not('id', 'is', null)

        // 4. Limpar referências de equipe nos jogadores E o status de cabeça de chave
        await supabase.from('jogadores').update({
            equipe_id: null,
            cabeca_de_chave: false,
            is_cabeca_de_chave: false
        }).not('id', 'is', null)

        // 5. Apagar equipes
        await supabase.from('equipes').delete().not('id', 'is', null)

        return { success: true }
    }
}
