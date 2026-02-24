import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Jogador } from '@/types'

export function useJogadores() {
    const [jogadores, setJogadores] = useState<Jogador[]>([])
    const [loading, setLoading] = useState(true)

    const carregarJogadores = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('jogadores')
                .select('*')
                .order('created_at', { ascending: true })

            if (error) throw error
            setJogadores(data || [])
        } catch (err) {
            console.error('Erro ao carregar jogadores:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        carregarJogadores()

        const channel = supabase
            .channel('jogadores-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores' }, () => {
                carregarJogadores()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [carregarJogadores])

    return { jogadores, loading, recarregar: carregarJogadores }
}
