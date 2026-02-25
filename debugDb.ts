import { supabase } from './src/lib/supabase'

async function debug() {
    const { data: jogo1 } = await supabase.from('jogos').select('*').eq('id', 1).single();
    console.log("Jogo 1:", jogo1);

    const { data: jogo3 } = await supabase.from('jogos').select('*').eq('id', 3).single();
    console.log("Jogo 3:", jogo3);

    const { data: jogo6 } = await supabase.from('jogos').select('*').eq('id', 6).single();
    console.log("Jogo 6:", jogo6);
}

debug();
