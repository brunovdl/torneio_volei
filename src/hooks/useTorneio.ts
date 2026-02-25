import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchJogos, fetchEquipes } from '@/services/bracket'
import toast from 'react-hot-toast'
import type { Jogo, Equipe, TorneioConfig } from '@/types'

export function useTorneio() {
    const [jogos, setJogos] = useState<Jogo[]>([])
    const [equipes, setEquipes] = useState<Equipe[]>([])
    const [config, setConfig] = useState<TorneioConfig | null>(null)
    const [loading, setLoading] = useState(true)

    const carregarDados = useCallback(async () => {
        try {
            const [j, e, c] = await Promise.all([
                fetchJogos(),
                fetchEquipes(),
                supabase
                    .from('torneio_config')
                    .select('*, campeao:equipes!torneio_config_campeao_id_fkey(*)')
                    .eq('id', 1)
                    .single(),
            ])
            setJogos(j)
            setEquipes(e)

            if (c.data) {
                setConfig(c.data as unknown as TorneioConfig)
            } else {
                // Criar registro padrão se não existir
                await supabase.from('torneio_config').upsert({
                    id: 1,
                    chaveamento_gerado: false,
                    ao_vivo: false,
                    fase_atual: 'inscricoes',
                    inscricoes_abertas: true,
                    times_formados: false,
                })
                setConfig(null)
            }
        } catch (err: unknown) {
            const error = err as Error
            console.error('Erro ao carregar dados:', error)
            toast.error(`Erro ao carregar os dados: ${error.message || 'Erro desconhecido'}`)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        carregarDados()

        // Realtime: jogos
        const jogosChannel = supabase
            .channel('jogos-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, (payload) => {
                carregarDados()
                if (payload.eventType === 'UPDATE') {
                    const j = payload.new as Partial<Jogo>
                    if (j.status === 'finalizado' && j.vencedor_id) {
                        toast(`🏐 Jogo ${j.id || j.numero_jogo} finalizado!`, {
                            icon: '🔔',
                            duration: 4000,
                        })
                    }
                }
            })
            .subscribe()

        // Realtime: config
        const configChannel = supabase
            .channel('config-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'torneio_config' }, () => {
                carregarDados()
            })
            .subscribe()

        // Realtime: equipes
        const equipesChannel = supabase
            .channel('equipes-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'equipes' }, () => {
                carregarDados()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(jogosChannel)
            supabase.removeChannel(configChannel)
            supabase.removeChannel(equipesChannel)
        }
    }, [carregarDados])

    return { jogos, equipes, config, loading, recarregar: carregarDados }
}
