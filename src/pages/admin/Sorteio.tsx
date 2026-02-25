import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'
import { IAService, salvarBracket, validarBracketIA } from '@/services/ia.service'
import type { Equipe, BracketCompleto } from '@/types'

export default function Sorteio() {
    const { config, equipes, recarregar } = useTorneio()
    const [timesOrdenados, setTimesOrdenados] = useState<Equipe[]>([])
    const [gerando, setGerando] = useState(false)
    const [bracket, setBracket] = useState<BracketCompleto | null>(null)
    const [publicando, setPublicando] = useState(false)

    // Inicializar lista de times ao carregar
    const timesParaOrdenar = timesOrdenados.length > 0
        ? timesOrdenados
        : equipes.filter(e => e.misto_valido || equipes.length <= 8)

    const limparSorteio = async () => {
        if (!confirm('Isso apagará o chaveamento, jogos e vínculos de times. Os jogadores voltarão para a lista de espera.')) return

        try {
            await supabase.from('torneio_config').upsert({
                id: 1,
                chaveamento_gerado: false,
                times_formados: false,
                fase_atual: 'inscricoes',
                campeao_id: null,
                bracket_resumo_ia: null,
            })
            await supabase.from('jogadores').update({ equipe_id: null }).not('id', 'is', null)
            await supabase.from('jogos').delete().not('id', 'is', null)
            await supabase.from('equipes').delete().not('id', 'is', null)
            toast.success('Sorteio desfeito!')
            recarregar()
            setBracket(null)
            setTimesOrdenados([])
        } catch (err: unknown) {
            const error = err as Error
            toast.error(error.message || 'Erro ao desfazer')
        }
    }

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return
        const base = timesParaOrdenar
        const reordenado = Array.from(base)
        const [removed] = reordenado.splice(result.source.index, 1)
        reordenado.splice(result.destination.index, 0, removed)
        setTimesOrdenados(reordenado)
    }

    const gerarComIA = async () => {
        if (timesParaOrdenar.length < 2) {
            toast.error('Nenhum time formado. Configure os times primeiro.')
            return
        }

        setGerando(true)
        setBracket(null)

        try {
            // Atualizar seeds dos times conforme a ordem atual
            const updates = timesParaOrdenar.map((t, i) => ({ id: t.id, seed: i + 1 }))
            for (const upd of updates) {
                await supabase.from('equipes').update({ seed: upd.seed }).eq('id', upd.id)
            }

            // Montar lista com seeds atualizados
            const timesComSeed: Equipe[] = timesParaOrdenar.map((t, i) => ({ ...t, seed: i + 1 }))

            const resultado = await IAService.gerarTorneio(timesComSeed)
            setBracket(resultado)
            toast.success('🤖 Bracket gerado com sucesso!')
        } catch (err: unknown) {
            const error = err as Error
            toast.error(`Erro na IA: ${error.message}`)
        } finally {
            setGerando(false)
        }
    }

    const publicarChaveamento = async () => {
        if (!bracket) return

        // Validar novamente antes de salvar
        const validacao = validarBracketIA(bracket, timesParaOrdenar)
        if (!validacao.valido) {
            toast.error(`Bracket inválido: ${validacao.erros.join('; ')}`)
            return
        }

        setPublicando(true)
        try {
            // Salvar jogos no banco
            await salvarBracket(bracket)

            // Atualizar config
            await supabase.from('torneio_config').upsert({
                id: 1,
                chaveamento_gerado: true,
                fase_atual: 'em_andamento',
                bracket_resumo_ia: bracket.resumo,
                times_formados: true,
            })

            toast.success('🎉 Chaveamento publicado!')
            recarregar()
            setBracket(null)
        } catch (err: unknown) {
            const error = err as Error
            toast.error(error.message || 'Erro ao publicar')
        } finally {
            setPublicando(false)
        }
    }

    const chaveColors: Record<string, string> = {
        vencedores: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        repescagem: 'bg-red-500/20 text-red-400 border-red-500/30',
        semifinal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        final: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        decisivo: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    }

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-syne text-2xl font-bold text-white">🎲 Sorteio e Chaveamento</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Ordene os seeds dos times e gere o chaveamento com IA
                    </p>
                </div>
                {config?.chaveamento_gerado && (
                    <button
                        onClick={limparSorteio}
                        className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium transition-all"
                    >
                        ❌ Desfazer Sorteio
                    </button>
                )}
            </div>

            {config?.chaveamento_gerado && (
                <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400">
                    ✅ O chaveamento já foi gerado e publicado.
                    {config.bracket_resumo_ia && (
                        <p className="mt-2 text-gray-400">{config.bracket_resumo_ia}</p>
                    )}
                </div>
            )}

            {!config?.chaveamento_gerado && (
                <>
                    {/* Passo 1: Ordenar seeds */}
                    <div className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 mb-6">
                        <h2 className="font-syne font-bold text-white mb-1">
                            <span className="text-blue-400 mr-2">1.</span>Ordenar Seeds (drag-and-drop)
                        </h2>
                        <p className="text-gray-500 text-sm mb-4">
                            O Seed 1 é o favoritado. Seed 1 vs último, Seed 2 vs penúltimo, etc.
                        </p>

                        {timesParaOrdenar.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">
                                Nenhum time encontrado. Configure e confirme os times primeiro.
                            </p>
                        ) : (
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="seeds">
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                                            {timesParaOrdenar.map((time, idx) => (
                                                <Draggable key={time.id} draggableId={time.id} index={idx}>
                                                    {(prov, snap) => (
                                                        <div
                                                            ref={prov.innerRef}
                                                            {...prov.draggableProps}
                                                            {...prov.dragHandleProps}
                                                            className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all cursor-grab ${snap.isDragging
                                                                ? 'bg-blue-600 border-blue-500 text-white shadow-xl scale-105'
                                                                : 'bg-[#1f2937] border-[#374151] text-white hover:border-blue-500/40'
                                                                }`}
                                                        >
                                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${snap.isDragging ? 'bg-white/20' : 'bg-blue-600/20 text-blue-400'
                                                                }`}>
                                                                {idx + 1}
                                                            </span>
                                                            {time.logo_url ? (
                                                                <img
                                                                    src={time.logo_url}
                                                                    alt={time.nome}
                                                                    className="w-9 h-9 object-contain shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                                                    {time.nome[0]}
                                                                </div>
                                                            )}
                                                            <span className="font-medium">{time.nome}</span>
                                                            {time.misto_valido && (
                                                                <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                                                    ✅ Misto
                                                                </span>
                                                            )}
                                                            <span className="text-gray-500 text-xs ml-auto shrink-0">☰</span>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        )}
                    </div>

                    {/* Passo 2: Gerar com IA */}
                    {timesParaOrdenar.length >= 2 && (
                        <div className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 mb-6">
                            <h2 className="font-syne font-bold text-white mb-4">
                                <span className="text-blue-400 mr-2">2.</span>Gerar Bracket com IA
                            </h2>

                            <button
                                onClick={gerarComIA}
                                disabled={gerando}
                                className="py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2"
                            >
                                {gerando ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        A IA está construindo a estrutura...
                                    </>
                                ) : '🤖 Gerar Torneio com IA'}
                            </button>

                            {gerando && (
                                <p className="text-gray-500 text-sm mt-3 italic">
                                    A IA está analisando os times e construindo o bracket de eliminatória dupla...
                                </p>
                            )}
                        </div>
                    )}

                    {/* Resultado da IA */}
                    {bracket && (
                        <div className="bg-[#111827] border border-green-500/30 rounded-2xl p-6 mb-6">
                            <h2 className="font-syne font-bold text-white mb-4">✅ Bracket Gerado pela IA</h2>

                            {bracket.resumo && (
                                <div className="mb-4 bg-[#0d1117] rounded-xl p-4 text-sm text-gray-300 border border-[#1e2d40]">
                                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">🤖 Resumo</p>
                                    <p>{bracket.resumo}</p>
                                </div>
                            )}

                            {/* Validações */}
                            <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Mín. 2 jogos', ok: bracket.validacoes?.todos_times_jogam_minimo_2 ?? true },
                                    { label: 'Grande Final', ok: bracket.validacoes?.grande_final_correta ?? true },
                                    { label: 'Sem ciclos', ok: bracket.validacoes?.nenhum_confronto_repetido_precocemente ?? true },
                                    { label: `${bracket.total_jogos} jogos`, ok: true },
                                ].map((v, i) => (
                                    <div key={i} className={`rounded-xl p-3 text-sm text-center ${v.ok ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                        <p className="text-lg">{v.ok ? '✅' : '❌'}</p>
                                        <p className="text-xs">{v.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Lista de jogos */}
                            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                                {bracket.jogos.map(jogo => {
                                    const timeA = timesParaOrdenar.find(t => t.id === jogo.time_a_id)
                                    const timeB = timesParaOrdenar.find(t => t.id === jogo.time_b_id)
                                    const corClass = chaveColors[jogo.chave as string] || 'bg-gray-700/20 text-gray-400 border-gray-500/30'

                                    return (
                                        <div key={jogo.numero_jogo} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm ${corClass}`}>
                                            <span className="font-bold w-6 shrink-0">#{jogo.numero_jogo}</span>
                                            <span className="text-xs uppercase tracking-widest shrink-0">{jogo.chave}</span>
                                            {jogo.is_bye ? (
                                                <span className="flex-1 italic opacity-70">
                                                    {timeA?.nome || '?'} → BYE (avança direto)
                                                </span>
                                            ) : (
                                                <span className="flex-1">
                                                    {timeA?.nome || '?'} <span className="opacity-60">vs</span> {timeB?.nome || '?'}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <button
                                onClick={publicarChaveamento}
                                disabled={publicando}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {publicando ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Publicando...
                                    </>
                                ) : '🏆 Confirmar e Publicar Chaveamento'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </Layout>
    )
}
