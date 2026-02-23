import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'
import BracketMatch from '@/components/BracketMatch'
import type { Jogo } from '@/types'

// Mapa de cores para cada jogo
const jogoConfig: Record<number, { cor: 'blue' | 'red' | 'purple' | 'gold' | 'gray'; label: string }> = {
    1: { cor: 'blue', label: 'Jogo 1 · Abertura' },
    2: { cor: 'blue', label: 'Jogo 2 · Abertura' },
    3: { cor: 'blue', label: 'Jogo 3 · Chave Vencedores' },
    4: { cor: 'red', label: 'Jogo 4 · Repescagem' },
    5: { cor: 'blue', label: 'Jogo 5 · Final Vencedores' },
    6: { cor: 'red', label: 'Jogo 6 · Repescagem' },
    7: { cor: 'purple', label: 'Jogo 7 · Semifinal' },
    8: { cor: 'gold', label: 'Jogo 8 · Grande Final' },
    9: { cor: 'gold', label: 'Jogo 9 · Desempate' },
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

    if (!config?.chaveamento_gerado) {
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

    const jogosMap = Object.fromEntries(jogos.map((j) => [j.id, j]))

    // Determinar jogo atual (primeiro "aguardando" com equipes preenchidas)
    const jogoAtualId = jogos.find(
        (j) => j.status === 'aguardando' && j.equipe_a_id && j.equipe_b_id,
    )?.id

    const getJogo = (id: number): Jogo | null => jogosMap[id] ?? null

    const renderJogo = (id: number) => {
        const j = getJogo(id)
        if (!j) return null
        const cfg = jogoConfig[id]
        // Override label com o guardado do banco, ou usar o padrão
        const jogoComLabel = { ...j, label: j.label || cfg.label }
        return (
            <BracketMatch
                key={id}
                jogo={jogoComLabel}
                cor={cfg.cor}
                isAtual={jogoAtualId === id}
            />
        )
    }

    return (
        <Layout config={config}>
            <div className="mb-8 text-center">
                <h1 className="font-syne text-3xl sm:text-4xl font-extrabold text-white mb-2">
                    🏆 Chaveamento
                </h1>
                <p className="text-gray-500 text-sm">Eliminatória Dupla · 5 Times · Nenhum time sai na 1ª derrota</p>
            </div>

            {/* Campeão banner */}
            {config.campeao_id && config.campeao && (
                <div className="mb-8 p-6 rounded-2xl border-2 border-[#f5a623]/50 bg-[#f5a623]/5 text-center glow-gold">
                    <p className="text-gray-400 text-xs tracking-widest mb-1">🏆 CAMPEÃO</p>
                    <h2 className="font-syne text-3xl font-bold text-[#f5a623]">
                        {(config.campeao as any).nome}
                    </h2>
                </div>
            )}

            {/* Fluxograma scrollável */}
            <div className="overflow-x-auto pb-6">
                <div className="min-w-[900px] space-y-8">

                    {/* Legenda */}
                    <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-500">
                        {[
                            { cor: 'bg-blue-500', label: 'Chave Vencedores' },
                            { cor: 'bg-red-500', label: 'Repescagem' },
                            { cor: 'bg-purple-500', label: 'Semifinal' },
                            { cor: 'bg-[#f5a623]', label: 'Grande Final' },
                        ].map(({ cor, label }) => (
                            <span key={label} className="flex items-center gap-1.5">
                                <span className={`w-3 h-3 rounded-sm ${cor}`} />
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* RODADA DE ABERTURA */}
                    <RoundSection label="Rodada de Abertura" sublabel="Jogos 1 e 2 — Time 5 aguarda como chapéu">
                        <div className="flex items-start gap-6 flex-wrap justify-center">
                            {renderJogo(1)}
                            {/* T5 - Chapéu */}
                            <ByeCard time5={jogos.find(j => j.id === 3)?.equipe_b} />
                            {renderJogo(2)}
                        </div>
                    </RoundSection>

                    {/* 2ª RODADA */}
                    <RoundSection label="2ª Rodada" sublabel="Jogo 3 (Chave Vencedores) + Jogo 4 (Repescagem)">
                        <div className="flex items-start gap-6 flex-wrap justify-center">
                            {renderJogo(3)}
                            {renderJogo(4)}
                        </div>
                    </RoundSection>

                    {/* 3ª RODADA */}
                    <RoundSection label="3ª Rodada" sublabel="Jogo 5 (Final Vencedores) + Jogo 6 (Repescagem)">
                        <div className="flex items-start gap-6 flex-wrap justify-center">
                            {renderJogo(5)}
                            {renderJogo(6)}
                        </div>
                    </RoundSection>

                    {/* SEMIFINAL */}
                    <RoundSection label="Semifinal" sublabel="Jogo 7 — Perdedor J5 vs Vencedor J6">
                        <div className="flex items-start gap-6 justify-center">
                            {renderJogo(7)}
                        </div>
                    </RoundSection>

                    {/* GRANDE FINAL */}
                    <RoundSection label="Grande Final" sublabel="Jogo 8 — Invicto vs Vencedor J7">
                        <div className="flex items-start gap-6 flex-wrap justify-center">
                            {renderJogo(8)}
                            {/* Jogo 9 só aparece se necessário */}
                            {getJogo(9)?.equipe_a_id && renderJogo(9)}
                        </div>
                    </RoundSection>

                    {/* Ranking final */}
                    <RankingFinal jogos={jogos} />
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-[#f5a623]/5 border border-[#f5a623]/20 rounded-xl p-4 text-center text-sm text-[#fcd34d]">
                <strong>📌 Regra de ouro:</strong> Nenhum time é eliminado na <em>primeira</em> derrota — apenas na segunda.
                O Jogo 9 só acontece se o time da repescagem vencer o Jogo 8.
            </div>
        </Layout>
    )
}

function RoundSection({
    label, sublabel, children,
}: { label: string; sublabel: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-[#1e2d40] bg-[#0d1117]/50 p-5">
            <div className="mb-4">
                <h2 className="font-syne font-bold text-white text-lg">{label}</h2>
                <p className="text-gray-500 text-xs">{sublabel}</p>
            </div>
            {children}
        </div>
    )
}

function ByeCard({ time5 }: { time5?: { nome: string; logo_url?: string | null } | null }) {
    return (
        <div className="rounded-xl border-2 border-dashed border-green-500/30 bg-green-500/5 w-52 shrink-0 p-4 text-center">
            <div className="text-[10px] text-green-500/70 tracking-widest uppercase mb-3">Chapéu — Aguarda</div>
            {time5?.logo_url ? (
                <img src={time5.logo_url} alt={time5.nome} className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" />
            ) : (
                <div className="w-12 h-12 rounded-full bg-[#1e2d40] mx-auto mb-2 flex items-center justify-center text-lg font-bold text-green-400">
                    {time5 ? time5.nome[0]?.toUpperCase() : 'T5'}
                </div>
            )}
            <p className="text-white text-sm font-medium">{time5?.nome ?? 'Time 5'}</p>
            <p className="text-gray-600 text-[10px] mt-1">Entra no Jogo 3</p>
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
        <div className="rounded-2xl border border-[#f5a623]/20 bg-[#f5a623]/5 p-5">
            <h2 className="font-syne font-bold text-[#f5a623] text-lg mb-4">🏆 Classificação Final</h2>
            <div className="space-y-2">
                {times.map((t) => (
                    <div key={t.nome} className="flex items-center gap-3 p-2 rounded-lg bg-[#111827]">
                        <span className="text-xl w-7 text-center">{emojis[t.colocacao]}</span>
                        {t.logo_url ? (
                            <img src={t.logo_url} alt={t.nome} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1e2d40] flex items-center justify-center text-sm font-bold text-gray-400">
                                {t.nome[0]}
                            </div>
                        )}
                        <span className="text-white font-medium">{t.nome}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
