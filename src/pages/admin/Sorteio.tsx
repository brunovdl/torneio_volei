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

    // Titulares são os cabeças de chave primeiro, depois o restante descendo na lista (até 20 vagas)
    const titulares = [
        ...jogadores.filter(j => j.cabeca_de_chave),
        ...jogadores.filter(j => !j.cabeca_de_chave)
    ].slice(0, 20)
    const titularesIds = new Set(titulares.map(t => t.id))

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

        if (jogadores.length < 20) {
            if (!confirm(`Temos apenas ${jogadores.length} jogadores no total. O ideal são 20 para fechar 5 times de 4. Deseja prosseguir mesmo com times incompletos?`)) {
                return
            }
        } else {
            if (!confirm('Esta ação vai formar as equipes, definir os titulares/reservas e gerar o chaveamento. Deseja prosseguir?')) {
                return
            }
        }

        setSalvando(true)
        try {
            // 1. Pegamos os titulares já separados antes da execução deste bloco
            const titularesAtuais = titulares

            // 2. Separar cabeças de chave e normais dentre os 20 titulares
            // Damos preferência em distribuir as mulheres uniformente primeiro (para que não fique um time com 0 se tiver poucas)
            const mulheresTitulares = titularesAtuais.filter(j => j.genero === 'F')
            const homensTitulares = titularesAtuais.filter(j => j.genero === 'M')

            // Dentro de cada gênero, separamos cabeças de chave embaralhados e normais embaralhados
            const cabecasM = mulheresTitulares.filter(j => j.cabeca_de_chave).sort(() => Math.random() - 0.5)
            const normaisM = mulheresTitulares.filter(j => !j.cabeca_de_chave).sort(() => Math.random() - 0.5)
            const poolMulheres = [...cabecasM, ...normaisM]

            const cabecasH = homensTitulares.filter(j => j.cabeca_de_chave).sort(() => Math.random() - 0.5)
            const normaisH = homensTitulares.filter(j => !j.cabeca_de_chave).sort(() => Math.random() - 0.5)
            const poolHomens = [...cabecasH, ...normaisH]

            // 3. Criar os 5 times
            type NovoTime = {
                nome: string
                equipe_id: string
                jogadores: Jogador[]
                posicao: Posicao | ''
                logo_url: string
            }

            const timesConfig = [
                { nome: 'Tropa do Saque', logo_url: '/tropa_do_saque.png' },
                { nome: 'Orai e Cortai', logo_url: '/orai_cortai.png' },
                { nome: 'Bloqueio Divino', logo_url: '/bloqueio_divino.png' },
                { nome: 'Muralha de Jericó', logo_url: '/muralha_de_jerico.png' },
                { nome: 'Saque Santo', logo_url: '/saque_santo.png' }
            ]

            const novosTimes: NovoTime[] = []
            for (let i = 0; i < 5; i++) {
                novosTimes.push({
                    nome: timesConfig[i].nome,
                    equipe_id: crypto.randomUUID(), // Gerar ID UUID v4 manual para relacionar
                    jogadores: [],
                    posicao: '',
                    logo_url: timesConfig[i]?.logo_url || ''
                })
            }

            // 4. Distribuir iterativamente
            // Primeiro espalhamos as mulheres (uma a cada time iterativamente)
            let timeAtual = 0
            poolMulheres.forEach(m => {
                novosTimes[timeAtual].jogadores.push(m)
                timeAtual = (timeAtual + 1) % 5
            })

            // Depois espalhamos os homens de onde paramos
            poolHomens.forEach(h => {
                novosTimes[timeAtual].jogadores.push(h)
                timeAtual = (timeAtual + 1) % 5
            })

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
                    posicao: time.posicao,
                    logo_url: time.logo_url
                })
                if (eqErr) throw eqErr

                // Atualizar jogadores com o equipe_id
                const pIds = time.jogadores.map(j => j.id)
                // Se algum time não receber nenhum jogador, a query .in() poderia falhar no supabase
                if (pIds.length > 0) {
                    const { error: jErr } = await supabase
                        .from('jogadores')
                        .update({ equipe_id: time.equipe_id })
                        .in('id', pIds)
                    if (jErr) throw jErr
                }
            }

            // 5. Preencher Jogos iniciais e garantir que todos os 9 slots existam na tabela
            const jogosUpsert = [
                { id: 1, rodada: 'abertura', tipo: 'vencedores', label: 'Jogo 1 · Abertura', equipe_a_id: posMap['T1'], equipe_b_id: posMap['T2'], status: 'aguardando' },
                { id: 2, rodada: 'abertura', tipo: 'vencedores', label: 'Jogo 2 · Abertura', equipe_a_id: posMap['T3'], equipe_b_id: posMap['T4'], status: 'aguardando' },
                { id: 3, rodada: 'segunda', tipo: 'vencedores', label: 'Jogo 3 · Chave Vencedores', equipe_a_id: null, equipe_b_id: posMap['T5'], status: 'aguardando' },
                { id: 4, rodada: 'segunda', tipo: 'repescagem', label: 'Jogo 4 · Repescagem', equipe_a_id: null, equipe_b_id: null, status: 'aguardando' },
                { id: 5, rodada: 'terceira', tipo: 'vencedores', label: 'Jogo 5 · Final Vencedores', equipe_a_id: null, equipe_b_id: null, status: 'aguardando' },
                { id: 6, rodada: 'terceira', tipo: 'repescagem', label: 'Jogo 6 · Repescagem', equipe_a_id: null, equipe_b_id: null, status: 'aguardando' },
                { id: 7, rodada: 'semifinal', tipo: 'semifinal', label: 'Jogo 7 · Semifinal', equipe_a_id: null, equipe_b_id: null, status: 'aguardando' },
                { id: 8, rodada: 'final', tipo: 'final', label: 'Jogo 8 · Grande Final', equipe_a_id: null, equipe_b_id: null, status: 'aguardando' },
                { id: 9, rodada: 'final', tipo: 'desempate', label: 'Jogo 9 · Desempate', equipe_a_id: null, equipe_b_id: null, status: 'aguardando' },
            ]

            const { error: jogosErr } = await supabase.from('jogos').upsert(jogosUpsert)
            if (jogosErr) throw jogosErr

            // 6. Ativar chaveamento e salvar fase no torneio_config
            await supabase.from('torneio_config').upsert({
                id: 1,
                chaveamento_gerado: true,
                fase_atual: 'abertura',
            })

            toast.success('🎉 Sorteio e Chaveamento concluídos!')
            recarregarTorneio()
            recarregarJogadores()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao concluir sorteio')
        } finally {
            setSalvando(false)
        }
    }

    const limparSorteio = async () => {
        if (!confirm('Você tem certeza? Isso apagará todas as equipes formadas, os jogos e o chaveamento. Os jogadores voltarão para a lista de espera.')) {
            return
        }

        setSalvando(true)
        try {
            // Volta configuração de chaveamento
            await supabase.from('torneio_config').upsert({
                id: 1,
                chaveamento_gerado: false,
                fase_atual: null,
                campeao_id: null
            })

            // Limpa chave estrangeira dos jogadores (desvincular equipes)
            await supabase.from('jogadores').update({ equipe_id: null }).not('id', 'is', null)

            // Apagar jogos e equipes
            await supabase.from('jogos').delete().not('id', 'is', null)
            await supabase.from('equipes').delete().not('id', 'is', null)

            toast.success('Sorteio desfeito com sucesso! Você pode sortear novamente.')
            recarregarTorneio()
            recarregarJogadores()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao desfazer sorteio')
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

                {!config?.chaveamento_gerado ? (
                    <button
                        onClick={gerarSorteioEChaveamento}
                        disabled={salvando || jogadores.length === 0}
                        className="py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition-all text-sm shrink-0"
                    >
                        {salvando ? 'Processando...' : '🚀 Realizar Sorteio Automático'}
                    </button>
                ) : (
                    <button
                        onClick={limparSorteio}
                        disabled={salvando}
                        className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 border border-red-500/30 rounded-lg transition-all text-sm shrink-0"
                    >
                        {salvando ? 'Desfazendo...' : '❌ Desfazer Sorteio'}
                    </button>
                )}
            </div>

            {/* Avisos */}
            {config?.chaveamento_gerado && (
                <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400 flex justify-between items-center">
                    <span>✅ O sorteio já foi realizado e as equipes foram distribuídas no chaveamento.</span>
                </div>
            )}

            {!config?.chaveamento_gerado && jogadores.length < 20 && (
                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-400">
                    ⚠️ Atenção: Há apenas {jogadores.length} jogadores inscritos no total. O sorteio tentará alocá-los, mas algumas equipes ficarão incompletas. Ideal: 20 inscritos.
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
                        globalPlayers={jogadores}
                        titularesIds={titularesIds}
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
                        globalPlayers={jogadores}
                        titularesIds={titularesIds}
                        isLocked={!!config?.chaveamento_gerado}
                        onToggleStar={toggleCabecaChave}
                    />
                </div>
            </div>
        </Layout >
    )
}

function PlayerList({
    players,
    globalPlayers,
    titularesIds,
    isLocked,
    onToggleStar
}: {
    players: Jogador[],
    globalPlayers: Jogador[],
    titularesIds: Set<string>,
    isLocked: boolean,
    onToggleStar: (j: Jogador) => void
}) {
    if (players.length === 0) {
        return <p className="text-gray-500 text-sm italic">Nenhum atleta inscrito.</p>
    }

    return (
        <div className="space-y-2">
            {players.map((j) => {
                const globalIndex = globalPlayers.findIndex(globalP => globalP.id === j.id)
                const isTitular = titularesIds.has(j.id)

                return (
                    <div
                        key={j.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors
                            ${isTitular ? 'bg-[#1f2937] border-[#374151]' : 'bg-[#0d1117] border-dashed border-[#1e2d40] opacity-80'}
                        `}
                    >
                        <div className="flex flex-col">
                            <span className={`font-semibold text-sm ${isTitular ? 'text-white' : 'text-gray-400'}`}>
                                {globalIndex + 1}. {j.nome}
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
