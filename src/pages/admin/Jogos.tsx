import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { processarResultado, desfazerResultado } from '@/services/bracket'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'
import type { Jogo } from '@/types'

const FASES_POR_JOGO: Record<number, string> = {
    1: 'abertura', 2: 'abertura',
    3: 'segunda', 4: 'segunda',
    5: 'terceira', 6: 'terceira',
    7: 'semifinal',
    8: 'grande_final', 9: 'desempate',
}

export default function Jogos() {
    const { jogos, config, recarregar } = useTorneio()
    const [jogoAtivo, setJogoAtivo] = useState<number | null>(null)
    const [vencedorSel, setVencedorSel] = useState<string>('')
    const [placarA, setPlacarA] = useState<string>('')
    const [placarB, setPlacarB] = useState<string>('')
    const [salvando, setSalvando] = useState(false)

    const abrirJogo = (jogoId: number) => {
        setJogoAtivo(jogoId)
        setVencedorSel('')
        setPlacarA('')
        setPlacarB('')
    }

    const confirmarResultado = async (jogo: Jogo) => {
        if (!vencedorSel) {
            toast.error('Selecione o vencedor')
            return
        }

        const perdedorId = vencedorSel === jogo.equipe_a_id ? jogo.equipe_b_id : jogo.equipe_a_id
        if (!perdedorId) {
            toast.error('Equipes não estão preenchidas')
            return
        }

        setSalvando(true)

        // Atualizar fase atual
        await supabase
            .from('torneio_config')
            .update({ fase_atual: FASES_POR_JOGO[jogo.id] })
            .eq('id', 1)

        const { error } = await processarResultado({
            jogoId: jogo.id,
            vencedorId: vencedorSel,
            perdedorId,
            placarA: placarA !== '' ? Number(placarA) : undefined,
            placarB: placarB !== '' ? Number(placarB) : undefined,
        })

        setSalvando(false)

        if (error) {
            toast.error(`Erro: ${error.message}`)
        } else {
            toast.success(`✅ Resultado do Jogo ${jogo.id} registrado!`)
            setJogoAtivo(null)
            recarregar()
        }
    }

    const desfazer = async (jogo: Jogo) => {
        if (!confirm(`Desfazer o resultado do Jogo ${jogo.id}? Os jogos dependentes serão revertidos.`)) return
        setSalvando(true)
        const { error } = await desfazerResultado(jogo)
        setSalvando(false)
        if (error) {
            toast.error(`Erro: ${error.message}`)
        } else {
            toast.success(`↩ Resultado do Jogo ${jogo.id} desfeito`)
            recarregar()
        }
    }

    const corJogo: Record<number, string> = {
        1: 'blue', 2: 'blue', 3: 'blue', 5: 'blue',
        4: 'red', 6: 'red', 7: 'purple', 8: 'gold', 9: 'gold',
    }

    const borderCor: Record<string, string> = {
        blue: 'border-blue-500/30',
        red: 'border-red-500/30',
        purple: 'border-purple-500/30',
        gold: 'border-[#f5a623]/30',
    }

    const badgeCor: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-400',
        red: 'bg-red-500/20 text-red-400',
        purple: 'bg-purple-500/20 text-purple-400',
        gold: 'bg-[#f5a623]/20 text-[#f5a623]',
    }

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6">
                <h1 className="font-syne text-2xl font-bold text-white">📋 Gerenciar Jogos</h1>
                <p className="text-gray-500 text-sm mt-1">Registre os resultados de cada partida</p>
            </div>

            {!config?.chaveamento_gerado ? (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3">📊</p>
                    <p>Chaveamento não gerado ainda. Vá para <strong className="text-white">Sorteio</strong> primeiro.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {jogos.map(jogo => {
                        const cor = corJogo[jogo.id] ?? 'blue'
                        const temEquipes = jogo.equipe_a_id && jogo.equipe_b_id
                        const isAberto = jogoAtivo === jogo.id

                        return (
                            <div
                                key={jogo.id}
                                className={`rounded-2xl border bg-[#111827] transition-all ${jogo.status === 'finalizado'
                                        ? 'border-green-500/20'
                                        : borderCor[cor]
                                    }`}
                            >
                                {/* Header do jogo */}
                                <div className="flex items-center gap-3 p-4">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${badgeCor[cor]}`}>
                                        Jogo {jogo.id}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{jogo.label}</p>
                                        {temEquipes ? (
                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                {jogo.equipe_a?.nome ?? '—'} vs {jogo.equipe_b?.nome ?? '—'}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-600 italic mt-0.5">Aguardando equipamentos dos jogos anteriores</p>
                                        )}
                                    </div>

                                    {/* Status badge */}
                                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${jogo.status === 'finalizado'
                                            ? 'bg-green-500/20 text-green-400'
                                            : temEquipes
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-gray-700 text-gray-500'
                                        }`}>
                                        {jogo.status === 'finalizado' ? '✓ Finalizado' : temEquipes ? 'Pronto' : 'Aguarda'}
                                    </span>

                                    {/* Ações */}
                                    {jogo.status === 'finalizado' ? (
                                        <button
                                            onClick={() => desfazer(jogo)}
                                            disabled={salvando}
                                            className="text-xs px-3 py-1.5 border border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-400 rounded-lg transition-all shrink-0 disabled:opacity-50"
                                        >
                                            ↩ Desfazer
                                        </button>
                                    ) : temEquipes ? (
                                        <button
                                            onClick={() => isAberto ? setJogoAtivo(null) : abrirJogo(jogo.id)}
                                            disabled={salvando}
                                            className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-all shrink-0 ${isAberto
                                                    ? 'bg-gray-700 text-gray-300'
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                }`}
                                        >
                                            {isAberto ? 'Fechar' : '+ Resultado'}
                                        </button>
                                    ) : null}
                                </div>

                                {/* Resultado já registrado */}
                                {jogo.status === 'finalizado' && jogo.vencedor && (
                                    <div className="px-4 pb-4 pt-0">
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                                            <span className="text-lg">🏆</span>
                                            <div>
                                                <p className="text-xs text-gray-500">Vencedor</p>
                                                <p className="text-white font-bold">{jogo.vencedor.nome}</p>
                                                {jogo.placar_a !== null && jogo.placar_b !== null && (
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Placar: {jogo.equipe_a?.nome} {jogo.placar_a} × {jogo.placar_b} {jogo.equipe_b?.nome}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Form de registro */}
                                {isAberto && jogo.equipe_a && jogo.equipe_b && (
                                    <div className="px-4 pb-4 pt-0 border-t border-[#1e2d40] mt-1">
                                        <div className="pt-4 space-y-4">
                                            <p className="text-sm text-gray-400 font-medium">Selecione o vencedor:</p>

                                            <div className="grid grid-cols-2 gap-3">
                                                {[jogo.equipe_a, jogo.equipe_b].map((eq, idx) => (
                                                    <button
                                                        key={eq.id}
                                                        onClick={() => setVencedorSel(eq.id)}
                                                        className={`p-3 rounded-xl border-2 text-left transition-all ${vencedorSel === eq.id
                                                                ? 'border-blue-500 bg-blue-500/10'
                                                                : 'border-[#374151] hover:border-blue-500/50 bg-[#1f2937]'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {eq.logo_url ? (
                                                                <img src={eq.logo_url} alt={eq.nome} className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                                                                    {eq.nome[0]}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-bold text-white text-sm">{eq.nome}</p>
                                                                <p className="text-xs text-gray-500">{idx === 0 ? 'Equipe A' : 'Equipe B'}</p>
                                                            </div>
                                                        </div>
                                                        {vencedorSel === eq.id && (
                                                            <p className="text-blue-400 text-xs mt-1 font-bold">✓ Vencedor</p>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Placar opcional */}
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">Placar (opcional):</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span className="text-xs text-gray-400 truncate max-w-[80px]">{jogo.equipe_a.nome}:</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={placarA}
                                                            onChange={e => setPlacarA(e.target.value)}
                                                            placeholder="0"
                                                            className="w-14 bg-[#1f2937] border border-[#374151] text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <span className="text-gray-600 font-bold">×</span>
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={placarB}
                                                            onChange={e => setPlacarB(e.target.value)}
                                                            placeholder="0"
                                                            className="w-14 bg-[#1f2937] border border-[#374151] text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
                                                        />
                                                        <span className="text-xs text-gray-400 truncate max-w-[80px]">:{jogo.equipe_b.nome}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => confirmarResultado(jogo)}
                                                disabled={salvando || !vencedorSel}
                                                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm"
                                            >
                                                {salvando ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        Salvando...
                                                    </span>
                                                ) : '✅ Confirmar Resultado'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </Layout>
    )
}
