import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchJogos, fetchEquipes } from '@/services/bracket'
import toast from 'react-hot-toast'
import type { Jogo, Equipe, TorneioConfig } from '@/types'

/**
 * Hook central de dados do torneio com suporte a tempo real.
 * Assina canais Supabase Realtime para jogos, equipes e torneio_config.
 * Ao detectar mudança em jogos, exibe um toast informativo.
 */
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
                // Se a tabela acabou de subir e está vazia, o config deve ser nulo e criamos o registro dummy "silenciosamente"
                supabase.from('torneio_config').upsert({ id: 1, chaveamento_gerado: false, fase_atual: null, campeao_id: null }).then()
                setConfig(null)
            }
        } catch (err: any) {
            console.error('Erro ao carregar dados:', err)
            toast.error(`Erro ao carregar os dados: ${err.message || JSON.stringify(err)}`)
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
                // Re-fetch para garantir dados com joins
                carregarDados()
                if (payload.eventType === 'UPDATE') {
                    const j = payload.new as Partial<Jogo>
                    if (j.status === 'finalizado') {
                        toast(`🏐 Resultado atualizado! Jogo ${j.id} finalizado.`, {
                            icon: '🔔',
                            duration: 4000,
                        })
                    }
                }
            })
            .subscribe()

        // Realtime: config (ao_vivo, campeão)
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
