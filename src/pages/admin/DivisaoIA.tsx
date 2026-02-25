import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import { useJogadores } from '@/hooks/useJogadores'
import Layout from '@/components/Layout'
import { IAService } from '@/services/ia.service'
import type { Jogador, DistribuicaoTimes } from '@/types'

interface TimeLocal {
    id: string
    nome: string
    logo_url?: string | null
    jogadores: Jogador[]
    misto_valido: boolean
}

export default function DivisaoIA() {
    const navigate = useNavigate()
    const { config, equipes, recarregar: recarregarTorneio } = useTorneio()
    const { jogadores, recarregar: recarregarJogadores } = useJogadores()

    const [times, setTimes] = useState<TimeLocal[]>([])
    const [listaEspera, setListaEspera] = useState<Jogador[]>([])
    const [justificativa, setJustificativa] = useState('')
    const [avisos, setAvisos] = useState<string[]>([])
    const [carregandoIA, setCarregandoIA] = useState(false)
    const [confirmando, setConfirmando] = useState(false)
    const [geracaoFeita, setGeracaoFeita] = useState(false)

    // Inicializar times a partir das equipes existentes e jogadores já vinculados
    useEffect(() => {
        if (equipes.length > 0 && jogadores.length > 0) {
            const timesComJogadores = equipes.map(eq => {
                const jogsDoTime = jogadores.filter(j => j.equipe_id === eq.id)
                return {
                    id: eq.id,
                    nome: eq.nome,
                    logo_url: eq.logo_url,
                    jogadores: jogsDoTime,
                    misto_valido: calcularMisto(jogsDoTime),
                }
            })
            setTimes(timesComJogadores)
            const semTime = jogadores.filter(j => !j.equipe_id)
            setListaEspera(semTime)
        }
    }, [equipes, jogadores])

    function calcularMisto(jogsNoTime: Jogador[]): boolean {
        const temHomem = jogsNoTime.some(j => j.genero === 'M' || j.genero === 'masculino')
        const temMulher = jogsNoTime.some(j => j.genero === 'F' || j.genero === 'feminino')
        return temHomem && temMulher
    }

    const gerarComIA = async () => {
        if (!config?.num_times_definido || !config?.jogadores_por_time) {
            toast.error('Configure o torneio antes de chamar a IA')
            navigate('/admin/configurar')
            return
        }

        setCarregandoIA(true)
        try {
            // Montar estrutura de cabeças de chave por equipe
            const cabecasDeChave = equipes
                .map(eq => {
                    const cabeca = jogadores.find(j => j.equipe_id === eq.id && (j.cabeca_de_chave || j.is_cabeca_de_chave))
                    return cabeca ? { id: eq.id, nome: eq.nome, cabecaDeChave: cabeca } : null
                })
                .filter(Boolean) as Array<{ id: string; nome: string; cabecaDeChave: Jogador }>

            // Jogadores disponíveis (excluindo cabeças de chave, que já estão fixados)
            const cabecaIds = new Set(cabecasDeChave.map(c => c.cabecaDeChave.id))
            const disponiveis = jogadores.filter(j => !cabecaIds.has(j.id))

            const resultado: DistribuicaoTimes = await IAService.dividirTimes(
                { numTimes: config.num_times_definido, porTime: config.jogadores_por_time },
                cabecasDeChave,
                disponiveis
            )

            // Mapear resultado para o estado local
            const timesIA = resultado.times.map((t, i) => {
                const equipe = equipes[i] || equipes.find(e => e.id === t.id)
                const jogsIds = t.jogadores.map(j => j.id)
                const jogs = jogadores.filter(j => jogsIds.includes(j.id))
                return {
                    id: equipe?.id || t.id,
                    nome: equipe?.nome || `Time ${i + 1}`,
                    logo_url: equipe?.logo_url,
                    jogadores: jogs,
                    misto_valido: t.misto_valido,
                }
            })

            const espera = jogadores.filter(j =>
                resultado.lista_espera.some(le => le.id === j.id)
            )

            setTimes(timesIA)
            setListaEspera(espera)
            setJustificativa(resultado.justificativa || '')
            setAvisos(resultado.avisos || [])
            setGeracaoFeita(true)
            toast.success('🤖 IA dividiu os times com sucesso!')
        } catch (err: unknown) {
            const error = err as Error
            toast.error(`Erro na IA: ${error.message}`)
        } finally {
            setCarregandoIA(false)
        }
    }

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return

        const { source, destination } = result
        const jogadorId = result.draggableId

        // Encontrar jogador
        const jogador = jogadores.find(j => j.id === jogadorId)
        if (!jogador) return

        // Clone do estado
        const newTimes = times.map(t => ({ ...t, jogadores: [...t.jogadores] }))
        const newEspera = [...listaEspera]

        // Remover do source
        if (source.droppableId === 'espera') {
            const idx = newEspera.findIndex(j => j.id === jogadorId)
            if (idx !== -1) newEspera.splice(idx, 1)
        } else {
            const sourceTime = newTimes.find(t => t.id === source.droppableId)
            if (sourceTime) {
                const idx = sourceTime.jogadores.findIndex(j => j.id === jogadorId)
                if (idx !== -1) sourceTime.jogadores.splice(idx, 1)
            }
        }

        // Inserir no destination
        if (destination.droppableId === 'espera') {
            newEspera.splice(destination.index, 0, jogador)
        } else {
            const destTime = newTimes.find(t => t.id === destination.droppableId)
            if (destTime) {
                destTime.jogadores.splice(destination.index, 0, jogador)
                destTime.misto_valido = calcularMisto(destTime.jogadores)
            }
        }

        // Atualizar misto do source
        if (source.droppableId !== 'espera') {
            const st = newTimes.find(t => t.id === source.droppableId)
            if (st) st.misto_valido = calcularMisto(st.jogadores)
        }

        setTimes(newTimes)
        setListaEspera(newEspera)
    }

    const todosTimesValidos = times.every(t => t.misto_valido)

    const confirmarTimes = async () => {
        if (!todosTimesValidos) {
            toast.error('Todos os times devem ter ao menos 1 homem e 1 mulher')
            return
        }

        setConfirmando(true)
        try {
            // Salvar distribuição no banco
            for (const time of times) {
                // Limpar jogadores do time anteriores
                await supabase.from('jogadores').update({ equipe_id: null }).eq('equipe_id', time.id)

                const jogsIds = time.jogadores.map(j => j.id)
                if (jogsIds.length > 0) {
                    await supabase.from('jogadores').update({ equipe_id: time.id }).in('id', jogsIds)
                }

                // Contar gêneros
                const masc = time.jogadores.filter(j => j.genero === 'M' || j.genero === 'masculino').length
                const fem = time.jogadores.filter(j => j.genero === 'F' || j.genero === 'feminino').length
                const ni = time.jogadores.length - masc - fem

                await supabase.from('equipes').update({
                    total_masculino: masc,
                    total_feminino: fem,
                    total_nao_informado: ni,
                    misto_valido: time.misto_valido,
                }).eq('id', time.id)
            }

            // Marcar lista de espera
            if (listaEspera.length > 0) {
                await supabase.from('jogadores')
                    .update({ lista_espera: true, equipe_id: null })
                    .in('id', listaEspera.map(j => j.id))
            }

            await supabase.from('torneio_config').upsert({
                id: 1,
                times_formados: true,
                fase_atual: 'sorteio',
            })

            toast.success('✅ Times confirmados! Vá para Sorteio para gerar o chaveamento.')
            recarregarTorneio()
            recarregarJogadores()
            navigate('/admin/sorteio')
        } catch (err: unknown) {
            const error = err as Error
            toast.error(error.message || 'Erro ao confirmar times')
        } finally {
            setConfirmando(false)
        }
    }

    const getGeneroIcon = (genero: string) => {
        if (genero === 'M' || genero === 'masculino') return '👨'
        if (genero === 'F' || genero === 'feminino') return '👩'
        return '👤'
    }

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-syne text-2xl font-bold text-white">🤖 Divisão IA — Times</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        A IA distribui os jogadores. Ajuste manualmente com drag-and-drop se necessário.
                    </p>
                </div>
                <button
                    onClick={gerarComIA}
                    disabled={carregandoIA}
                    className="py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2 shrink-0"
                >
                    {carregandoIA ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            IA processando...
                        </>
                    ) : (
                        '🤖 Gerar com IA'
                    )}
                </button>
            </div>

            {/* Loading overlay */}
            {carregandoIA && (
                <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-blue-400 font-medium">A IA está distribuindo os times...</p>
                    <p className="text-gray-500 text-sm mt-1">Isso pode levar até 30 segundos</p>
                </div>
            )}

            {/* Justificativa da IA */}
            {justificativa && (
                <div className="mb-4 bg-[#111827] border border-[#1e2d40] rounded-xl px-4 py-3 text-sm text-gray-300">
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">🤖 Justificativa da IA</p>
                    <p>{justificativa}</p>
                </div>
            )}

            {avisos.length > 0 && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-400 space-y-1">
                    {avisos.map((a, i) => <p key={i}>⚠️ {a}</p>)}
                </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                    {times.map(time => (
                        <div
                            key={time.id}
                            className={`bg-[#111827] rounded-2xl border p-4 transition-all ${time.misto_valido
                                ? 'border-green-500/30'
                                : 'border-yellow-500/30'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {time.logo_url ? (
                                        <img src={time.logo_url} alt={time.nome} className="w-8 h-8 object-contain" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-white text-xs font-bold">
                                            {time.nome[0]}
                                        </div>
                                    )}
                                    <h3 className="font-syne font-bold text-white text-sm">{time.nome}</h3>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${time.misto_valido
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {time.misto_valido ? '✅ Misto' : '⚠️ Sem misto'}
                                </span>
                            </div>

                            <Droppable droppableId={time.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`min-h-[60px] rounded-xl p-2 transition-all ${snapshot.isDraggingOver
                                            ? 'bg-blue-500/10 border border-blue-500/30'
                                            : 'bg-[#0d1117]'
                                            }`}
                                    >
                                        {time.jogadores.map((jogador, idx) => (
                                            <Draggable key={jogador.id} draggableId={jogador.id} index={idx}>
                                                {(prov, snap) => (
                                                    <div
                                                        ref={prov.innerRef}
                                                        {...prov.draggableProps}
                                                        {...prov.dragHandleProps}
                                                        className={`flex items-center gap-2 p-2 rounded-lg mb-1 text-sm transition-all cursor-grab ${snap.isDragging
                                                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                                                            : 'bg-[#1f2937] text-gray-300 hover:bg-[#374151]'
                                                            }`}
                                                    >
                                                        <span>{getGeneroIcon(jogador.genero)}</span>
                                                        <span className="flex-1 truncate">{jogador.nome}</span>
                                                        {(jogador.cabeca_de_chave || jogador.is_cabeca_de_chave) && (
                                                            <span className="text-yellow-400 text-xs" title="Cabeça de Chave">⭐</span>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        {time.jogadores.length === 0 && (
                                            <p className="text-gray-600 text-xs text-center py-2 italic">
                                                Arraste jogadores aqui
                                            </p>
                                        )}
                                    </div>
                                )}
                            </Droppable>

                            <p className="text-xs text-gray-600 mt-2">
                                {time.jogadores.length} jogador(es)
                            </p>
                        </div>
                    ))}
                </div>

                {/* Lista de Espera */}
                {(listaEspera.length > 0 || geracaoFeita) && (
                    <div className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-4 mb-6">
                        <h3 className="font-syne font-bold text-white text-sm mb-3">
                            📋 Lista de Espera ({listaEspera.length})
                        </h3>
                        <Droppable droppableId="espera" direction="horizontal">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex flex-wrap gap-2 min-h-[40px] p-2 rounded-xl transition-all ${snapshot.isDraggingOver
                                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                                        : 'bg-[#0d1117]'
                                        }`}
                                >
                                    {listaEspera.map((jogador, idx) => (
                                        <Draggable key={jogador.id} draggableId={jogador.id} index={idx}>
                                            {(prov, snap) => (
                                                <div
                                                    ref={prov.innerRef}
                                                    {...prov.draggableProps}
                                                    {...prov.dragHandleProps}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs cursor-grab transition-all ${snap.isDragging
                                                        ? 'bg-yellow-500 text-black shadow-lg'
                                                        : 'bg-[#1f2937] text-gray-400 hover:bg-[#374151]'
                                                        }`}
                                                >
                                                    <span>{getGeneroIcon(jogador.genero)}</span>
                                                    <span>{jogador.nome}</span>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    {listaEspera.length === 0 && (
                                        <p className="text-gray-600 text-xs italic py-1">Nenhum jogador em espera</p>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </div>
                )}
            </DragDropContext>

            {/* Botão confirmar */}
            {geracaoFeita && (
                <div className="flex flex-col items-end gap-2">
                    {!todosTimesValidos && (
                        <p className="text-yellow-400 text-sm">
                            ⚠️ {times.filter(t => !t.misto_valido).length} time(s) sem misto — ajuste antes de confirmar
                        </p>
                    )}
                    <button
                        onClick={confirmarTimes}
                        disabled={!todosTimesValidos || confirmando}
                        className={`py-3 px-8 font-bold rounded-xl transition-all text-sm flex items-center gap-2 ${todosTimesValidos && !confirmando
                            ? 'bg-green-600 hover:bg-green-500 text-white hover:scale-105'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {confirmando ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Confirmando...
                            </>
                        ) : '✅ Confirmar Times →'}
                    </button>
                </div>
            )}

            {equipes.length === 0 && !carregandoIA && (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3">⚙️</p>
                    <p>Configure o torneio primeiro.</p>
                    <button onClick={() => navigate('/admin/configurar')} className="mt-3 text-blue-400 hover:underline text-sm">
                        Ir para Configurar →
                    </button>
                </div>
            )}
        </Layout>
    )
}
