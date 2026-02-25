import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'
import type { Jogo } from '@/types'
import React from 'react'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorMessage: string }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, errorMessage: error.message };
    }
    render() {
        if (this.state.hasError) {
            return <div className="p-8 bg-red-900/50 text-white rounded-xl mx-auto max-w-2xl border border-red-500 overflow-auto">
                <h2 className="text-xl font-bold mb-2">Erro ao renderizar o Chaveamento:</h2>
                <pre className="text-sm text-red-200 whitespace-pre-wrap">{this.state.errorMessage}</pre>
            </div>;
        }
        return this.props.children;
    }
}

export default function Chaveamento() {
    const { jogos, config, loading } = useTorneio()

    if (loading) {
        return (
            <Layout config={config}>
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        )
    }

    if (!config?.chaveamento_gerado || jogos.length === 0) {
        return (
            <Layout config={config}>
                <div className="text-center py-20">
                    <p className="text-6xl mb-4">📊</p>
                    <h2 className="font-syne text-2xl font-bold text-white mb-2">Chaveamento em breve</h2>
                    <p className="text-gray-500 text-sm">O sorteio ainda não foi realizado. Volte em breve!</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout config={config}>
            <div className="mb-8 text-center max-w-2xl mx-auto px-4">
                <h1 className="font-syne text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-tight">
                    🏆 Chaveamento do Campeonato
                </h1>
                <p className="text-gray-500 text-sm">Eliminatória Dupla · Avançam Vencedores & Repescagem</p>
            </div>

            {/* Campeão banner */}
            {config.campeao_id && config.campeao && (
                <div className="mb-10 max-w-md mx-auto p-6 rounded-2xl border-2 border-[#f5a623]/50 bg-[#f5a623]/10 text-center shadow-[0_0_50px_rgba(245,166,35,0.2)] animate-pulse-slow">
                    <p className="text-[#f5a623]/80 text-xs font-bold tracking-[0.3em] mb-2">🏆 CAMPEÃO INVICTO</p>
                    <h2 className="font-syne text-3xl font-black text-[#f5a623] drop-shadow-[0_0_15px_rgba(245,166,35,0.8)]">
                        {(config.campeao as any).nome}
                    </h2>
                </div>
            )}

            {/* Fluxograma Vertical Landing Page */}
            <div className="w-full">
                {jogos.length > 0 ? (
                    <ErrorBoundary>
                        <TournamentViewer jogos={jogos} />
                    </ErrorBoundary>
                ) : null}
            </div>

            {/* Ranking final */}
            <div className="mt-12 max-w-2xl mx-auto px-4">
                <RankingFinal jogos={jogos} />
            </div>
        </Layout>
    )
}

function MatchCard({ jogo }: { jogo: Jogo }) {
    const isPlaying = jogo.status === 'em_andamento'
    const isDone = jogo.status === 'finalizado'

    let statusStyle = 'border-white/10 bg-white/5'
    let badgeStyle = 'bg-gray-800 text-gray-400'
    let badgeText = 'PROGRAMADO'

    if (isPlaying) {
        statusStyle = 'border-[#3b82f6] shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-gradient-to-b from-[#1e3a8a]/40 to-[#0f172a]/90'
        badgeStyle = 'bg-[#3b82f6] text-white animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]'
        badgeText = 'AO VIVO'
    } else if (isDone) {
        statusStyle = 'border-[#10b981]/50 bg-gradient-to-b from-[#064e3b]/20 to-[#0f172a]/90'
        badgeStyle = 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/50'
        badgeText = 'FINALIZADO'
    }

    const topWon = isDone && jogo.vencedor_id === jogo.equipe_a_id
    const bottomWon = isDone && jogo.vencedor_id === jogo.equipe_b_id

    return (
        <div className={`relative flex flex-col w-full sm:w-[340px] rounded-2xl border ${statusStyle} overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl group cursor-default`}>
            {/* Header / Game Info */}
            <div className="px-4 py-3 flex justify-between items-center border-b border-white/5 bg-black/40">
                <span className="text-[11px] font-bold tracking-widest text-[#f5a623] uppercase font-syne truncate max-w-[150px]">
                    {jogo.label}
                </span>
                <span className={`px-3 py-1 text-[9px] font-black rounded-full tracking-widest uppercase transition-all ${badgeStyle}`}>
                    {badgeText}
                </span>
            </div>

            {/* Teams Area */}
            <div className="flex flex-col p-2 gap-2 relative bg-[#0f172a]/40">
                {/* VS overlay central */}
                <div className="absolute top-1/2 left-[50%] -translate-y-1/2 -translate-x-1/2 z-20 w-7 h-7 rounded-full bg-black border border-white/10 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity backdrop-blur-md shadow-2xl">
                    <span className="text-[9px] font-black italic text-[#f5a623]/80">VS</span>
                </div>

                {/* Team A */}
                <div className={`relative p-3 rounded-xl flex items-center justify-between transition-colors ${topWon ? 'bg-[#10b981]/15 border border-[#10b981]/30 shadow-inner' : 'bg-white/5 border border-transparent'} overflow-hidden`}>
                    {topWon && <div className="absolute inset-y-0 left-0 w-1.5 bg-[#10b981] shadow-[0_0_15px_rgba(16,185,129,1)]"></div>}
                    <div className="flex items-center gap-3 z-10 ml-1">
                        {jogo.equipe_a?.logo_url ? (
                            <img src={jogo.equipe_a.logo_url} alt="" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.15)] transition-transform group-hover:scale-110" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-gray-400 shadow-inner border border-white/5">
                                {jogo.equipe_a?.nome?.charAt(0) || '?'}
                            </div>
                        )}
                        <span className={`font-semibold text-[14px] ${topWon ? 'text-white' : 'text-gray-400'} truncate w-[140px]`}>
                            {jogo.equipe_a?.nome || 'Aguardando...'}
                        </span>
                    </div>
                    <div className={`font-syne text-2xl font-black z-10 transition-colors ${topWon ? 'text-[#34d399] drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'text-gray-600'}`}>
                        {jogo.placar_a ?? '-'}
                    </div>
                </div>

                {/* Team B */}
                <div className={`relative p-3 rounded-xl flex items-center justify-between transition-colors ${bottomWon ? 'bg-[#10b981]/15 border border-[#10b981]/30 shadow-inner' : 'bg-white/5 border border-transparent'} overflow-hidden`}>
                    {bottomWon && <div className="absolute inset-y-0 left-0 w-1.5 bg-[#10b981] shadow-[0_0_15px_rgba(16,185,129,1)]"></div>}
                    <div className="flex items-center gap-3 z-10 ml-1">
                        {jogo.equipe_b?.logo_url ? (
                            <img src={jogo.equipe_b.logo_url} alt="" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.15)] transition-transform group-hover:scale-110" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-gray-400 shadow-inner border border-white/5">
                                {jogo.equipe_b?.nome?.charAt(0) || '?'}
                            </div>
                        )}
                        <span className={`font-semibold text-[14px] ${bottomWon ? 'text-white' : 'text-gray-400'} truncate w-[140px]`}>
                            {jogo.equipe_b?.nome || 'Aguardando...'}
                        </span>
                    </div>
                    <div className={`font-syne text-2xl font-black z-10 transition-colors ${bottomWon ? 'text-[#34d399] drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'text-gray-600'}`}>
                        {jogo.placar_b ?? '-'}
                    </div>
                </div>
            </div>

            {/* Linha Fina de Destaque Inferior */}
            <div className="h-1 w-full flex opacity-50">
                <div className="h-full flex-1 bg-gradient-to-r from-transparent to-[#f5a623]"></div>
                <div className="h-full flex-1 bg-gradient-to-l from-transparent to-[#f5a623]"></div>
            </div>
        </div>
    )
}

function ByeCard({ jogo }: { jogo: Jogo }) {
    return (
        <div className="relative flex flex-col w-full sm:w-[340px] rounded-2xl border border-gray-700/50 bg-gray-800/20 overflow-hidden backdrop-blur-xl opacity-70">
            <div className="px-4 py-3 flex justify-between items-center border-b border-white/5 bg-black/40">
                <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase font-syne truncate max-w-[150px]">
                    {jogo.descricao || jogo.label || `Jogo ${jogo.id}`}
                </span>
                <span className="px-3 py-1 text-[9px] font-black rounded-full tracking-widest uppercase bg-gray-700 text-gray-400">
                    BYE
                </span>
            </div>
            <div className="flex flex-col p-4 items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-300">
                    {jogo.equipe_a?.nome?.charAt(0) || '?'}
                </div>
                <span className="text-gray-300 font-medium text-sm">{jogo.equipe_a?.nome || 'Aguardando...'}</span>
                <span className="text-gray-600 text-xs italic">Avança automaticamente →</span>
            </div>
        </div>
    )
}

function TournamentViewer({ jogos }: { jogos: Jogo[] }) {
    const getChave = (j: Jogo) => j.chave || j.tipo || ''
    const wBracket = jogos.filter(j => getChave(j) === 'vencedores')
    const lBracket = jogos.filter(j => getChave(j) === 'repescagem')

    // Lógica para detectar se a Grande Final primária foi ganha pelo Campeão Invicto (Equipe A)
    const gf1 = jogos.find(j => getChave(j) === 'final')
    const gf1ResolvedByInvincible = gf1?.status === 'finalizado' && gf1.vencedor_id === gf1.equipe_a_id

    const finals = jogos.filter(j => {
        const ch = getChave(j)
        if (ch === 'final') return true
        if (ch === 'desempate' || ch === 'decisivo') {
            if (gf1ResolvedByInvincible) return false
            return true
        }
        return false
    })

    const groupByRound = (games: Jogo[]) => {
        const rounds: Record<string, Jogo[]> = {}
        games.forEach(g => {
            const rd = String(g.rodada).trim()
            if (!rounds[rd]) rounds[rd] = []
            rounds[rd].push(g)
        })
        return rounds
    }

    const wRounds = groupByRound(wBracket)
    const lRounds = groupByRound(lBracket)
    const fRounds = groupByRound(finals)

    return (
        <div className="flex flex-col gap-12 w-full mx-auto max-w-[1200px] px-2 md:px-6">
            {/* WINNERS BRACKET */}
            <div className="bg-[#1e2d40]/10 rounded-[2.5rem] p-4 md:p-8 border border-[#f5a623]/20 relative shadow-2xl backdrop-blur-xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0d1117] border border-[#f5a623]/50 px-8 py-1.5 rounded-full text-[#f5a623] font-syne font-bold tracking-[0.2em] text-[10px] md:text-sm shadow-[0_0_15px_rgba(245,166,35,0.2)] whitespace-nowrap">
                    CHAVE PRINCIPAL (VENCEDORES)
                </div>

                <div className="flex flex-col gap-12 mt-8">
                    {Object.entries(wRounds).map(([roundName, roundJogos]) => (
                        <div key={roundName} className="flex flex-col gap-5">
                            <h3 className="text-center text-gray-500 font-bold text-xs tracking-[0.3em] uppercase">Rodada {roundName}</h3>
                            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                                {roundJogos.map(j => j.is_bye ? <ByeCard key={j.id} jogo={j} /> : <MatchCard key={j.id} jogo={j} />)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* LOSERS BRACKET */}
            {lBracket.length > 0 && (
                <div className="bg-[#1e2d40]/20 rounded-[2.5rem] p-4 md:p-8 border border-blue-500/20 relative shadow-2xl backdrop-blur-xl">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0d1117] border border-blue-500/50 px-8 py-1.5 rounded-full text-blue-400 font-syne font-bold tracking-[0.2em] text-[10px] md:text-sm shadow-[0_0_15px_rgba(59,130,246,0.2)] whitespace-nowrap">
                        REPESCAGEM (PERDEDORES)
                    </div>

                    <div className="flex flex-col gap-12 mt-8">
                        {Object.entries(lRounds).map(([roundName, roundJogos]) => (
                            <div key={roundName} className="flex flex-col gap-5">
                                <h3 className="text-center text-gray-500 font-bold text-xs tracking-[0.3em] uppercase">Rodada {roundName}</h3>
                                <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                                    {roundJogos.map(j => <MatchCard key={j.id} jogo={j} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FINALS */}
            {finals.length > 0 && (
                <div className="bg-gradient-to-b from-[#f5a623]/10 to-transparent rounded-[2.5rem] p-4 md:p-10 border border-[#f5a623]/40 relative mt-4 shadow-[0_0_50px_rgba(245,166,35,0.15)] backdrop-blur-xl">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#f5a623] to-[#d97706] px-10 py-2 rounded-full text-black font-syne font-black tracking-[0.2em] text-xs md:text-sm shadow-[0_0_25px_rgba(245,166,35,0.6)] whitespace-nowrap">
                        👑 GRANDE FINAL
                    </div>

                    <div className="flex flex-col gap-12 mt-8">
                        {Object.entries(fRounds).map(([roundName, roundJogos]) => (
                            <div key={roundName} className="flex flex-col gap-5">
                                <h3 className="text-center text-[#f5a623] font-bold text-xs tracking-[0.3em] uppercase opacity-80">
                                    {roundName === 'GF' ? 'PRIMEIRO SET' : 'MATA-MATA (DESEMPATE)'}
                                </h3>
                                <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                                    {roundJogos.map(j => <MatchCard key={j.id} jogo={j} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function RankingFinal({ jogos }: { jogos: Jogo[] }) {
    // Coleta todos os times eliminados com colocação
    const times: { nome: string; colocacao: string; logo_url?: string | null }[] = []
    const seen = new Set<string>()

    jogos.forEach((j) => {
        const checkTime = (eq: typeof j.equipe_a) => {
            if (eq?.colocacao_final && !seen.has(eq.id)) {
                times.push({ nome: eq.nome, colocacao: eq.colocacao_final, logo_url: eq.logo_url })
                seen.add(eq.id)
            }
        }
        checkTime(j.equipe_a)
        checkTime(j.equipe_b)
        checkTime(j.vencedor)
        checkTime(j.perdedor)
    })

    if (times.length === 0) return null
    times.sort((a, b) => Number(a.colocacao) - Number(b.colocacao))

    const emojis: Record<string, string> = { '1': '🥇', '2': '🥈', '3': '🥉', '4': '4️⃣', '5': '5️⃣' }

    return (
        <div className="rounded-3xl border border-[#f5a623]/20 bg-[#f5a623]/5 p-6 md:p-8 shadow-2xl backdrop-blur-md">
            <h2 className="font-syne font-bold text-[#f5a623] text-xl mb-6 text-center tracking-widest uppercase">🏆 Classificação Final</h2>
            <div className="space-y-3">
                {times.map((t) => (
                    <div key={t.nome} className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 transition-colors">
                        <span className="text-2xl w-8 text-center">{emojis[t.colocacao] || '🌟'}</span>
                        {t.logo_url ? (
                            <img src={t.logo_url} alt={t.nome} className="w-12 h-12 object-contain drop-shadow-md mix-blend-plus-lighter" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[#1e2d40] flex items-center justify-center text-sm font-bold text-gray-400">
                                {t.nome[0]}
                            </div>
                        )}
                        <span className="text-white font-bold tracking-wide text-lg">{t.nome}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
