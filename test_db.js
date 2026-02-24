import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkJogos() {
    console.log('Consultando as equipes...');
    const { data: equipes, error: e1 } = await supabase.from('equipes').select('*');
    if (e1) console.error('Erro equipes:', e1);
    else console.log('Total de equipes:', equipes.length);

    console.log('Consultando os jogos...');
    const { data: jogos, error: e2 } = await supabase.from('jogos').select('*').order('id');
    if (e2) console.error('Erro jogos:', e2);
    else {
        console.log('Total de jogos:', jogos.length);
        if (jogos.length > 0) {
            console.log('Jogo 1 equipe_a_id:', jogos[0].equipe_a_id);
            console.log('Jogo 1 equipe_b_id:', jogos[0].equipe_b_id);
        }
    }
}

checkJogos();
