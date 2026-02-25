import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import { useJogadores } from '@/hooks/useJogadores'
import Layout from '@/components/Layout'
import type { Jogador } from '@/types'
import { calcularOpcoes, validarMistoPossivel } from '@/services/ia.service'

const TIMES_CONFIG = [
    { nome: 'Tropa do Saque', logo_url: '/tropa_do_saque.png' },
    { nome: 'Orai e Cortai', logo_url: '/orai_cortai.png' },
    { nome: 'Bloqueio Divino', logo_url: '/bloqueio_divino.png' },
    { nome: 'Muralha de Jericó', logo_url: '/muralha_de_jerico.png' },
    { nome: 'Saque Santo', logo_url: '/saque_santo.png' },
    { nome: 'Levanta-te Anda', logo_url: '/levantate_anda.png' },
    { nome: 'Funda de Davi', logo_url: '/funda_de_davi.png' },
    { nome: 'Manchete de Fogo', logo_url: '/manchete_de_fogo.png' },
    { nome: 'Projeto Sansão', logo_url: '/projeto_sansao.png' },
    { nome: 'Rede de Pescadores', logo_url: '/rede_de_pescadores.png' },
]

export default function Configurar() {
    const navigate = useNavigate()
    const { config, recarregar } = useTorneio()
    const { jogadores } = useJogadores()

    const [porTime, setPorTime] = useState(5)
    const [numTimes, setNumTimes] = useState<number | null>(null)
    const [cabecasDeChave, setCabecasDeChave] = useState<Record<number, string>>({}) // time index → jogador id
    const [salvando, setSalvando] = useState(false)

    // Opções de formação disponíveis
    const opcoes = useMemo(() => calcularOpcoes(jogadores, porTime), [jogadores, porTime])

    // Validação de misto
    const validacaoMisto = numTimes
        ? validarMistoPossivel(jogadores, numTimes)
        : { valido: true }

    // Verificar se podemos avançar
    const cabecasDefinidas = numTimes
        ? Array.from({ length: numTimes }, (_, i) => i).every(i => !!cabecasDeChave[i])
        : false

    const podeContinuar = !!numTimes && validacaoMisto.valido && cabecasDefinidas

    const handlePorTime = (v: number) => {
        setPorTime(v)
        setNumTimes(null)
        setCabecasDeChave({})
    }

    const handleNumTimes = (n: number) => {
        setNumTimes(n)
        setCabecasDeChave({})
    }

    const handleCabecaDeChave = (timeIdx: number, jogadorId: string) => {
        setCabecasDeChave(prev => {
            const updated = { ...prev, [timeIdx]: jogadorId }
            // Garantir que o mesmo jogador não seja cabeça de chave em dois times
            const ids = Object.values(updated)
            const unicosPorId = ids.filter((id, i) => ids.indexOf(id) === i)
            if (unicosPorId.length < ids.length) {
                toast.error('Este jogador já é cabeça de chave em outro time.')
                return prev
            }
            return updated
        })
    }

    const acionarIA = async () => {
        if (!numTimes || !podeContinuar) return

        setSalvando(true)
        try {
            // 1. Remove equipes anteriores e jogos
            await supabase.from('jogos').delete().not('id', 'is', null)
            await supabase.from('jogadores').update({ equipe_id: null }).not('id', 'is', null)
            await supabase.from('equipes').delete().not('id', 'is', null)

            // 2. Criar equipes com UUIDs fixos
            const timesParaCriar = Array.from({ length: numTimes }, (_, i) => ({
                id: crypto.randomUUID(),
                nome: TIMES_CONFIG[i]?.nome || `Time ${i + 1}`,
                logo_url: TIMES_CONFIG[i]?.logo_url || null,
                seed: i + 1,
                misto_valido: false,
            }))

            const { error: eqErr } = await supabase.from('equipes').insert(timesParaCriar)
            if (eqErr) throw eqErr

            // 3. Marcar cabeças de chave e vincular ao time
            for (let i = 0; i < numTimes; i++) {
                const jogadorId = cabecasDeChave[i]
                const timeId = timesParaCriar[i].id

                await supabase.from('jogadores').update({
                    cabeca_de_chave: true,
                    is_cabeca_de_chave: true,
                    equipe_id: timeId,
                }).eq('id', jogadorId)
            }

            // 4. Salvar configuração
            await supabase.from('torneio_config').upsert({
                id: 1,
                jogadores_por_time: porTime,
                num_times_definido: numTimes,
                fase_atual: 'divisao_ia',
                inscricoes_abertas: false,
                times_formados: false,
                chaveamento_gerado: false,
            })

            toast.success('✅ Configuração salva! Redirecionando para Divisão IA...')
            recarregar()
            navigate('/admin/divisao-ia')
        } catch (err: unknown) {
            const error = err as Error
            toast.error(error.message || 'Erro ao salvar configuração')
        } finally {
            setSalvando(false)
        }
    }

    const homens = jogadores.filter(j => j.genero === 'M' || j.genero === 'masculino').length
    const mulheres = jogadores.filter(j => j.genero === 'F' || j.genero === 'feminino').length
    const cabecasSelecionadas = Object.values(cabecasDeChave)

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6">
                <h1 className="font-syne text-2xl font-bold text-white">⚙️ Configurar Torneio</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Defina o tamanho dos times, número de times e cabeças de chave
                </p>
            </div>

            {/* Stats */}
            <div className="flex gap-3 mb-6 flex-wrap">
                <div className="bg-[#111827] border border-[#1e2d40] rounded-xl px-4 py-2 flex items-center gap-2">
                    <span className="text-blue-400">👨</span>
                    <span className="text-white font-bold">{homens}</span>
                    <span className="text-gray-500 text-sm">Homens</span>
                </div>
                <div className="bg-[#111827] border border-[#1e2d40] rounded-xl px-4 py-2 flex items-center gap-2">
                    <span className="text-pink-400">👩</span>
                    <span className="text-white font-bold">{mulheres}</span>
                    <span className="text-gray-500 text-sm">Mulheres</span>
                </div>
                <div className="bg-[#111827] border border-[#1e2d40] rounded-xl px-4 py-2 flex items-center gap-2">
                    <span>👥</span>
                    <span className="text-white font-bold">{jogadores.length}</span>
                    <span className="text-gray-500 text-sm">Total</span>
                </div>
            </div>

            {/* PASSO 1: Tamanho dos times */}
            <div className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 mb-6">
                <h2 className="font-syne font-bold text-white mb-4">
                    <span className="text-blue-400 mr-2">1.</span>Jogadores por time
                </h2>
                <div className="flex gap-3 flex-wrap">
                    {[2, 3, 4, 5, 6].map(n => (
                        <button
                            key={n}
                            onClick={() => handlePorTime(n)}
                            className={`w-14 h-14 rounded-xl text-lg font-bold border-2 transition-all ${porTime === n
                                ? 'bg-blue-600 border-blue-500 text-white scale-110'
                                : 'bg-[#1f2937] border-[#374151] text-gray-300 hover:border-blue-500/50'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
                <p className="text-gray-500 text-xs mt-3">Cada time deve ter ao menos 1 homem e 1 mulher</p>
            </div>

            {/* PASSO 2: Opções de formação */}
            {opcoes.length > 0 && (
                <div className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 mb-6">
                    <h2 className="font-syne font-bold text-white mb-4">
                        <span className="text-blue-400 mr-2">2.</span>Número de times
                    </h2>

                    <div className="space-y-2">
                        {opcoes.map(opcao => (
                            <button
                                key={opcao.numTimes}
                                onClick={() => handleNumTimes(opcao.numTimes)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${numTimes === opcao.numTimes
                                    ? 'bg-blue-600/10 border-blue-500 text-white'
                                    : 'bg-[#1f2937] border-[#374151] text-gray-300 hover:border-blue-500/30'
                                    }`}
                            >
                                <span className="font-medium">
                                    {opcao.numTimes} times de {opcao.porTime}
                                </span>
                                <div className="flex items-center gap-3">
                                    {opcao.listaEspera > 0 && (
                                        <span className="text-xs text-gray-500">
                                            {opcao.listaEspera} na espera
                                        </span>
                                    )}
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${opcao.mistoGarantido
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {opcao.mistoGarantido ? '✅ Misto' : '⚠️ Ajuste manual'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {!validacaoMisto.valido && validacaoMisto.aviso && (
                        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                            ⚠️ {validacaoMisto.aviso}
                        </div>
                    )}
                </div>
            )}

            {opcoes.length === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-400 mb-6">
                    ⚠️ Jogadores inscritos insuficientes para formar times de {porTime}. Mínimo necessário: {porTime * 2} jogadores.
                </div>
            )}

            {/* PASSO 3: Cabeças de Chave */}
            {numTimes && validacaoMisto.valido && (
                <div className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 mb-6">
                    <h2 className="font-syne font-bold text-white mb-1">
                        <span className="text-blue-400 mr-2">3.</span>Cabeças de Chave
                    </h2>
                    <p className="text-gray-500 text-sm mb-4">
                        Selecione 1 jogador por time. Cabeças de chave nunca ficam no mesmo time.
                    </p>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Array.from({ length: numTimes }, (_, i) => {
                            const timeName = TIMES_CONFIG[i]?.nome || `Time ${i + 1}`
                            const selecionadoNesteTime = cabecasDeChave[i]

                            return (
                                <div key={i} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                                        ⭐ {timeName}
                                    </p>
                                    <select
                                        value={selecionadoNesteTime || ''}
                                        onChange={e => handleCabecaDeChave(i, e.target.value)}
                                        className="w-full bg-[#0d1117] border border-[#374151] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Selecionar jogador...</option>
                                        {jogadores
                                            .filter(j => !Object.entries(cabecasDeChave).some(([idx, id]) => id === j.id && Number(idx) !== i))
                                            .map((j: Jogador) => (
                                                <option key={j.id} value={j.id}>
                                                    {j.genero === 'M' || j.genero === 'masculino' ? '👨' : j.genero === 'F' || j.genero === 'feminino' ? '👩' : '👤'} {j.nome}
                                                </option>
                                            ))}
                                    </select>

                                    {selecionadoNesteTime && (() => {
                                        const j = jogadores.find(j => j.id === selecionadoNesteTime)
                                        return j ? (
                                            <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
                                                <span>⭐</span>
                                                <span>{j.nome}</span>
                                            </div>
                                        ) : null
                                    })()}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Botão final */}
            {numTimes && (
                <div className="flex justify-end">
                    <button
                        onClick={acionarIA}
                        disabled={!podeContinuar || salvando}
                        className={`py-3 px-8 font-bold rounded-xl transition-all text-sm flex items-center gap-2 ${podeContinuar && !salvando
                            ? 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {salvando ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Configurando...
                            </>
                        ) : (
                            <>🤖 Salvar e Acionar IA — Dividir Times</>
                        )}
                    </button>
                </div>
            )}

            {numTimes && !cabecasDefinidas && (
                <p className="text-center text-gray-500 text-sm mt-3">
                    Selecione um cabeça de chave para cada time para continuar
                </p>
            )}

            {/* Lista de cabeças selecionados */}
            {cabecasSelecionadas.length > 0 && (
                <div className="mt-4 text-xs text-gray-600 text-center">
                    {cabecasSelecionadas.length}/{numTimes} cabeças de chave definidos
                </div>
            )}
        </Layout>
    )
}
