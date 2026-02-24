import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Variáveis de ambiente do Supabase não encontradas. Configure o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
    )
    alert('As credenciais do banco de dados (Supabase) não foram encontradas. A aplicação pode não funcionar corretamente. Verifique o arquivo .env.')
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)
