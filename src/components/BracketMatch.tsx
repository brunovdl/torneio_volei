import type { Jogo } from '@/types'
import { getColocacaoLabel } from '@/services/bracket'

interface BracketMatchProps {
    jogo: Jogo
    isAtual?: boolean
    cor?: 'blue' | 'red' | 'purple' | 'gold' | 'gray'
}

const borderColors = {
    blue: 'border-blue-500',
    red: 'border-red-500',
    purple: 'border-purple-500',
    gold: 'border-[#f5a623]',
    gray: 'border-gray-600',
}

const headerColors = {
    blue: 'bg-blue-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
    gold: 'bg-[#d97706]',
    gray: 'bg-gray-700',
}

const glowClass = {
    blue: 'glow-blue',
    red: '',
    purple: '',
    gold: 'glow-gold',
    gray: '',
}

export default function BracketMatch({ jogo, isAtual = false, cor = 'blue' }: BracketMatchProps) {
    const border = borderColors[cor]
    const header = headerColors[cor]
    const glow = isAtual ? glowClass[cor] : ''

    const aguardando = jogo.status === 'aguardando' && !jogo.equipe_a_id && !jogo.equipe_b_id

    return (
        <div
            className={`relative rounded-xl border-2 ${border} bg-[#111827] overflow-hidden w-52 shrink-0 ${glow} transition-all duration-300`}
        >
            {/* Header */}
            <div className={`${header} px-3 py-1.5`}>
                <p className="text-white text-[10px] font-bold tracking-widest uppercase text-center">
                    {jogo.label}
                </p>
            </div>

            {/* Equipes */}
            <div className="p-3 space-y-2">
                <TeamRow
                    equipe={jogo.equipe_a}
                    isVencedor={jogo.vencedor_id === jogo.equipe_a_id && !!jogo.vencedor_id}
                    isPerdedor={jogo.perdedor_id === jogo.equipe_a_id && !!jogo.perdedor_id}
                    placar={jogo.placar_a}
                />

                <div className="text-center text-xs font-bold text-gray-600">VS</div>

                <TeamRow
                    equipe={jogo.equipe_b}
                    isVencedor={jogo.vencedor_id === jogo.equipe_b_id && !!jogo.vencedor_id}
                    isPerdedor={jogo.perdedor_id === jogo.equipe_b_id && !!jogo.perdedor_id}
                    placar={jogo.placar_b}
                />

                {aguardando && (
                    <p className="text-gray-600 text-[10px] text-center italic pt-1">Aguardando jogos anteriores</p>
                )}
            </div>

            {/* Status do jogo */}
            {isAtual && (
                <div className="absolute top-2 right-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 live-pulse block" />
                </div>
            )}
        </div>
    )
}

interface TeamRowProps {
    equipe?: { id: string; nome: string; logo_url?: string | null; colocacao_final?: string | null } | null
    isVencedor: boolean
    isPerdedor: boolean
    placar?: number | null
}

function TeamRow({ equipe, isVencedor, isPerdedor, placar }: TeamRowProps) {
    const colocacao = getColocacaoLabel(equipe?.colocacao_final ?? null)
    return (
        <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${isVencedor ? 'bg-green-500/10 border border-green-500/30' :
                    isPerdedor ? 'bg-red-500/10 border border-red-500/20 opacity-60' :
                        'bg-[#1f2937]'
                }`}
        >
            {/* Logo ou avatar */}
            {equipe?.logo_url ? (
                <img
                    src={equipe.logo_url}
                    alt={equipe.nome}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                />
            ) : (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                    {equipe ? equipe.nome[0]?.toUpperCase() : '?'}
                </div>
            )}

            <span className={`text-sm font-medium flex-1 truncate ${isPerdedor ? 'line-through text-gray-500' : 'text-white'}`}>
                {equipe ? equipe.nome : <span className="text-gray-600 italic">A definir</span>}
            </span>

            {/* Placar */}
            {placar !== null && placar !== undefined && (
                <span className={`text-sm font-bold shrink-0 ${isVencedor ? 'text-green-400' : 'text-gray-500'}`}>
                    {placar}
                </span>
            )}

            {/* Vencedor / Eliminado badge */}
            {isVencedor && <span className="text-green-400 text-xs shrink-0">✓</span>}
            {isPerdedor && colocacao && (
                <span className="text-xs shrink-0">{colocacao.emoji}</span>
            )}
        </div>
    )
}
