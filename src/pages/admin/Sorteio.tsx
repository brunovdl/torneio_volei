import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import { useJogadores } from '@/hooks/useJogadores'
import Layout from '@/components/Layout'
import type { Posicao, Jogador } from '@/types'

const POSICOES: Posicao[] = ['T1', 'T2', 'T3', 'T4', 'T5']

export default function Sorteio() {
    const { config, recarregar: recarregarTorneio } = useTorneio()
    const { jogadores, recarregar: recarregarJogadores } = useJogadores()
    const [salvando, setSalvando] = useState(false)

    const homens = jogadores.filter(j => j.genero === 'M')
    const mulheres = jogadores.filter(j => j.genero === 'F')

    // Toggles a player's star (cabeça de chave)
    const toggleCabecaChave = async (jogador: Jogador) => {
        if (config?.chaveamento_gerado) return

        try {
            const { error } = await supabase
                .from('jogadores')
                .update({ cabeca_de_chave: !jogador.cabeca_de_chave })
                .eq('id', jogador.id)
            if (error) throw error
            recarregarJogadores()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao atualizar jogador')
        }
    }

    const gerarSorteioEChaveamento = async () => {
        if (config?.chaveamento_gerado) {
            toast.error('Chaveamento já foi gerado!')
            return
        }

        if (homens.length < 10 || mulheres.length < 10) {
            toast.error('É preciso no mínimo 10 Homens e 10 Mulheres para formar 5 times.')
            return
        }

        if (!confirm('Esta ação vai formar as equipes, definir os titulares/reservas e gerar o chaveamento. Deseja prosseguir?')) {
            return
        }

        setSalvando(true)
        try {
            // 1. Separar titulares (primeiros 10 por ordem de inscrição)
            // Assumimos que a ordem do useJogadores já é por created_at asc
            const titularesH = homens.slice(0, 10)
            const titularesM = mulheres.slice(0, 10)

            // Reservas (se for necessário referenciá-los, eles ficam com equipe_id = null)

            // 2. Separar cabeças de chave e normais
            const cabecasH = titularesH.filter(j => j.cabeca_de_chave).sort(() => Math.random() - 0.5)
            const normaisH = titularesH.filter(j => !j.cabeca_de_chave).sort(() => Math.random() - 0.5)

            const cabecasM = titularesM.filter(j => j.cabeca_de_chave).sort(() => Math.random() - 0.5)
            const normaisM = titularesM.filter(j => !j.cabeca_de_chave).sort(() => Math.random() - 0.5)

            // Combina novamente para ter as pilhas de sorteio
            const poolH = [...cabecasH, ...normaisH]
            const poolM = [...cabecasM, ...normaisM]

            // 3. Criar os 5 times
            const novosTimes = []
            for (let i = 1; i <= 5; i++) {
                novosTimes.push({
                    nome: `Equipe ${i}`,
                    equipe_id: crypto.randomUUID(), // Gerar ID UUID v4 manual para relacionar
                    jogadores: [] as typeof titularesH,
                    posicao: '' as Posicao
                })
            }

            // Distribuir de forma round-robin para espalhar os cabeças de chave igualmente
            for (let i = 0; i < 10; i++) {
                novosTimes[i % 5].jogadores.push(poolH[i])
                novosTimes[i % 5].jogadores.push(poolM[i])
            }

            // Shuffle posições T1 a T5
            const posicoesEmbaralhadas = [...POSICOES].sort(() => Math.random() - 0.5)

            // 4. Inserir equipes no banco e atualizar os jogadores
            const posMap: Record<string, string> = {}

            for (let i = 0; i < 5; i++) {
                const time = novosTimes[i]
                time.posicao = posicoesEmbaralhadas[i]
                posMap[time.posicao as string] = time.equipe_id

                // Inserir equipe
                const { error: eqErr } = await supabase.from('equipes').insert({
                    id: time.equipe_id,
                    nome: time.nome,
                    posicao: time.posicao
                })
                if (eqErr) throw eqErr

                // Atualizar jogadores com o equipe_id
                const pIds = time.jogadores.map(j => j.id)
                const { error: jErr } = await supabase
                    .from('jogadores')
                    .update({ equipe_id: time.equipe_id })
                    .in('id', pIds)
                if (jErr) throw jErr
            }

            // 5. Preencher Jogo 1 (T1 vs T2)
            await supabase.from('jogos').update({
                equipe_a_id: posMap['T1'],
                equipe_b_id: posMap['T2'],
                status: 'aguardando',
            }).eq('id', 1)

            // Preencher Jogo 2 (T3 vs T4)
            await supabase.from('jogos').update({
                equipe_a_id: posMap['T3'],
                equipe_b_id: posMap['T4'],
                status: 'aguardando',
            }).eq('id', 2)

            // Preencher Jogo 3 slot B (T5 - chapéu)
            await supabase.from('jogos').update({
                equipe_b_id: posMap['T5'],
            }).eq('id', 3)

            // 6. Ativar chaveamento e salvar fase no torneio_config
            await supabase.from('torneio_config').update({
                chaveamento_gerado: true,
                fase_atual: 'abertura',
            }).eq('id', 1)

            toast.success('🎉 Sorteio e Chaveamento concluídos!')
            recarregarTorneio()
            recarregarJogadores()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao concluir sorteio')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-syne text-2xl font-bold text-white">🎲 Sorteio e Equipes</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Gerencie os cabeças de chave e defina as equipes. O sorteio distribuirá Homens e Mulheres igualitariamente (2 de cada por equipe) respeitando a ordem de inscrição (titulares e reservas).
                    </p>
                </div>

                {!config?.chaveamento_gerado && (
                    <button
                        onClick={gerarSorteioEChaveamento}
                        disabled={salvando || homens.length < 10 || mulheres.length < 10}
                        className="py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition-all text-sm shrink-0"
                    >
                        {salvando ? 'Processando...' : '🚀 Realizar Sorteio Automático'}
                    </button>
                )}
            </div>

            {/* Avisos */}
            {config?.chaveamento_gerado && (
                <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400">
                    ✅ O sorteio já foi realizado e as equipes foram distribuídas no chaveamento.
                </div>
            )}

            {!config?.chaveamento_gerado && (homens.length < 10 || mulheres.length < 10) && (
                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-400">
                    ⚠️ Atenção: É necessário pelo menos 10 Homens (tem {homens.length}) e 10 Mulheres (tem {mulheres.length}) para realizar o sorteio de 5 equipes.
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* HOMENS */}
                <div className="bg-[#111827] rounded-2xl border border-[#1e2d40] p-6">
                    <h2 className="font-syne text-xl font-bold text-white flex items-center gap-2 mb-4">
                        👨 Homens <span className="text-sm font-normal text-gray-500">({homens.length})</span>
                    </h2>
                    <PlayerList
                        players={homens}
                        isLocked={!!config?.chaveamento_gerado}
                        onToggleStar={toggleCabecaChave}
                    />
                </div>

                {/* MULHERES */}
                <div className="bg-[#111827] rounded-2xl border border-[#1e2d40] p-6">
                    <h2 className="font-syne text-xl font-bold text-white flex items-center gap-2 mb-4">
                        👩 Mulheres <span className="text-sm font-normal text-gray-500">({mulheres.length})</span>
                    </h2>
                    <PlayerList
                        players={mulheres}
                        isLocked={!!config?.chaveamento_gerado}
                        onToggleStar={toggleCabecaChave}
                    />
                </div>
            </div>
        </Layout>
    )
}

function PlayerList({
    players,
    isLocked,
    onToggleStar
}: {
    players: Jogador[],
    isLocked: boolean,
    onToggleStar: (j: Jogador) => void
}) {
    if (players.length === 0) {
        return <p className="text-gray-500 text-sm italic">Nenhum atleta inscrito.</p>
    }

    return (
        <div className="space-y-2">
            {players.map((j, index) => {
                const isTitular = index < 10

                return (
                    <div
                        key={j.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors
                            ${isTitular ? 'bg-[#1f2937] border-[#374151]' : 'bg-[#0d1117] border-dashed border-[#1e2d40] opacity-80'}
                        `}
                    >
                        <div className="flex flex-col">
                            <span className={`font-semibold text-sm ${isTitular ? 'text-white' : 'text-gray-400'}`}>
                                {index + 1}. {j.nome}
                            </span>
                            <span className="text-xs text-gray-500">
                                {isTitular ? 'Titular' : 'Reserva'} {j.equipe_id ? '✓ Em equipe' : ''}
                            </span>
                        </div>

                        <button
                            disabled={isLocked}
                            onClick={() => onToggleStar(j)}
                            title={j.cabeca_de_chave ? "Remover de Cabeça de Chave" : "Marcar como Cabeça de Chave"}
                            className={`p-2 rounded-lg transition-all ${j.cabeca_de_chave
                                ? 'bg-[#f5a623]/20 text-[#f5a623]'
                                : 'bg-gray-800 text-gray-600 hover:text-gray-400 hover:bg-gray-700'
                                } ${isLocked ? 'cursor-default opacity-60' : ''}`}
                        >
                            ⭐
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
