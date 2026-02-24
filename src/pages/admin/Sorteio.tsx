import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'
import type { Posicao } from '@/types'

const POSICOES: Posicao[] = ['T1', 'T2', 'T3', 'T4', 'T5']

const DESCRICOES: Record<string, string> = {
    T1: 'Jogo 1 (vs T2)',
    T2: 'Jogo 1 (vs T1) → Repescagem se perder',
    T3: 'Jogo 2 (vs T4)',
    T4: 'Jogo 2 (vs T3) → Repescagem se perder',
    T5: '🎩 Chapéu — entra no Jogo 3',
}

export default function Sorteio() {
    const { equipes, config, recarregar } = useTorneio()
    const [atribuicoes, setAtribuicoes] = useState<Record<string, Posicao>>({})
    const [salvando, setSalvando] = useState(false)

    // Inicializar com atribuições existentes
    useEffect(() => {
        const mapa: Record<string, Posicao> = {}
        equipes.forEach(eq => {
            if (eq.posicao) mapa[eq.id] = eq.posicao
        })
        setAtribuicoes(mapa)
    }, [equipes])

    const posicaoUsada = (pos: Posicao, ignorarId?: string): boolean =>
        Object.entries(atribuicoes).some(([id, p]) => p === pos && id !== ignorarId)

    const setPosicao = (equipeId: string, pos: Posicao) => {
        setAtribuicoes(prev => ({ ...prev, [equipeId]: pos }))
    }

    const validar = (): string | null => {
        if (equipes.length < 5) return 'É necessário ter 5 equipes inscritas'
        const posicoesMarcadas = Object.values(atribuicoes).filter(Boolean)
        if (posicoesMarcadas.length < 5) return 'Atribua posições para todas as 5 equipes'
        const unique = new Set(posicoesMarcadas)
        if (unique.size < 5) return 'Cada equipe deve ter uma posição diferente'
        return null
    }

    const salvarSorteio = async () => {
        const erroValidacao = validar()
        if (erroValidacao) {
            toast.error(erroValidacao)
            return
        }

        setSalvando(true)
        try {
            // Atualizar posições de cada equipe
            for (const [equipeId, posicao] of Object.entries(atribuicoes)) {
                const { error } = await supabase
                    .from('equipes')
                    .update({ posicao })
                    .eq('id', equipeId)
                if (error) throw error
            }
            toast.success('Posições salvas!')
            recarregar()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao salvar')
        } finally {
            setSalvando(false)
        }
    }

    const gerarChaveamento = async () => {
        const erroValidacao = validar()
        if (erroValidacao) {
            toast.error(erroValidacao)
            return
        }

        if (!confirm('Gerar o chaveamento irá travar as posições e tornar o bracket público. Confirma?')) return

        setSalvando(true)
        try {
            // Primeiro salvar as posições
            for (const [equipeId, posicao] of Object.entries(atribuicoes)) {
                await supabase.from('equipes').update({ posicao }).eq('id', equipeId)
            }

            // Montar mapa posição → equipeId
            const posMap: Record<string, string> = {}
            for (const [equipeId, posicao] of Object.entries(atribuicoes)) {
                if (posicao) posMap[posicao] = equipeId
            }

            // Preencher Jogo 1: T1 vs T2
            await supabase.from('jogos').update({
                equipe_a_id: posMap['T1'],
                equipe_b_id: posMap['T2'],
                status: 'aguardando',
            }).eq('id', 1)

            // Preencher Jogo 2: T3 vs T4
            await supabase.from('jogos').update({
                equipe_a_id: posMap['T3'],
                equipe_b_id: posMap['T4'],
                status: 'aguardando',
            }).eq('id', 2)

            // Preencher Jogo 3 slot B: T5 (chapéu)
            await supabase.from('jogos').update({
                equipe_b_id: posMap['T5'],
            }).eq('id', 3)

            // Ativar chaveamento e definir fase
            await supabase.from('torneio_config').update({
                chaveamento_gerado: true,
                fase_atual: 'abertura',
            }).eq('id', 1)

            toast.success('🏆 Chaveamento gerado! Bracket agora é público.')
            recarregar()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao gerar chaveamento')
        } finally {
            setSalvando(false)
        }
    }

    const equipesPorPosicao = (pos: Posicao) =>
        equipes.find(e => atribuicoes[e.id] === pos)

    if (equipes.length < 5) {
        return (
            <Layout config={config} showAdminNav>
                <div className="text-center py-16">
                    <p className="text-5xl mb-4">⏳</p>
                    <h2 className="font-syne text-xl font-bold text-white mb-2">Aguardando equipes</h2>
                    <p className="text-gray-500 text-sm">
                        {equipes.length}/5 equipes inscritas. O sorteio só pode ser feito com todas as 5 vagas preenchidas.
                    </p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6">
                <h1 className="font-syne text-2xl font-bold text-white">🎲 Sorteio</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Atribua uma posição (T1–T5) para cada equipe. T5 é o "chapéu" e entra no Jogo 3.
                </p>
                {config?.chaveamento_gerado && (
                    <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2 text-sm text-green-400">
                        ✅ Chaveamento já gerado. Alterar aqui não refletirá automaticamente nos jogos em andamento.
                    </div>
                )}
            </div>

            {/* Preview visual das posições */}
            <div className="grid grid-cols-5 gap-2 mb-8">
                {POSICOES.map(pos => {
                    const eq = equipesPorPosicao(pos)
                    return (
                        <div
                            key={pos}
                            className={`rounded-xl border text-center p-3 transition-all ${eq ? 'border-blue-500/40 bg-blue-500/5' : 'border-dashed border-gray-700 bg-[#0d1117]'
                                }`}
                        >
                            <div className="text-xs text-gray-500 mb-2 font-bold">{pos}</div>
                            {eq ? (
                                <>
                                    {eq.logo_url ? (
                                        <img src={eq.logo_url} alt={eq.nome} className="w-10 h-10 rounded-full mx-auto mb-1 object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white mx-auto mb-1">
                                            {eq.nome[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <p className="text-xs text-white font-medium truncate">{eq.nome}</p>
                                </>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[#1e2d40] mx-auto mb-1 flex items-center justify-center text-gray-600">?</div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Formulário de atribuição */}
            <div className="space-y-3 mb-8">
                {equipes.map(eq => (
                    <div key={eq.id} className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-4 flex items-center gap-4">
                        {eq.logo_url ? (
                            <img src={eq.logo_url} alt={eq.nome} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shrink-0">
                                {eq.nome[0]?.toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white">{eq.nome}</p>
                            {atribuicoes[eq.id] && (
                                <p className="text-xs text-gray-500">{DESCRICOES[atribuicoes[eq.id]!]}</p>
                            )}
                        </div>
                        <select
                            value={(atribuicoes[eq.id] as string) || ''}
                            onChange={e => setPosicao(eq.id, e.target.value as Posicao)}
                            className="bg-[#1f2937] border border-[#374151] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors shrink-0"
                        >
                            <option value="">Selecionar...</option>
                            {POSICOES.map(pos => (
                                <option
                                    key={pos}
                                    value={pos as string}
                                    disabled={posicaoUsada(pos, eq.id)}
                                >
                                    {pos} {pos === 'T5' ? '(Chapéu)' : ''} {posicaoUsada(pos, eq.id) ? '(em uso)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={salvarSorteio}
                    disabled={salvando}
                    className="flex-1 py-3 bg-[#1e2d40] hover:bg-[#253448] border border-[#374151] text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50"
                >
                    {salvando ? 'Salvando...' : '💾 Salvar Posições'}
                </button>
                <button
                    onClick={gerarChaveamento}
                    disabled={salvando}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50"
                >
                    {salvando ? 'Gerando...' : '🚀 Gerar Chaveamento'}
                </button>
            </div>
        </Layout>
    )
}
