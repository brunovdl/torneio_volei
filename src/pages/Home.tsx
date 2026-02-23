import { Link } from 'react-router-dom'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'
import { getColocacaoLabel } from '@/services/bracket'

export default function Home() {
    const { equipes, config, loading } = useTorneio()

    return (
        <Layout config={config}>
            {/* Hero */}
            <section className="text-center py-10 sm:py-16">
                <p className="text-gray-500 text-xs tracking-widest uppercase mb-3">IEQ JD Portugal</p>
                <h1 className="font-syne text-4xl sm:text-6xl font-extrabold text-white mb-4 leading-tight">
                    1º Torneio de<br />
                    <span className="text-[#f5a623]">Vôlei de Areia</span>
                </h1>
                <p className="text-gray-400 max-w-md mx-auto mb-8 text-sm sm:text-base">
                    Eliminatória dupla · 5 times · Nenhum time é eliminado na primeira derrota
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <Link
                        to="/chaveamento"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 text-sm"
                    >
                        🏆 Ver Chaveamento
                    </Link>
                    {equipes.length < 5 && (
                        <Link
                            to="/inscricao"
                            className="px-6 py-3 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 border border-[#f5a623]/30 text-[#f5a623] font-bold rounded-xl transition-all hover:scale-105 text-sm"
                        >
                            📋 Inscrever Equipe
                        </Link>
                    )}
                </div>
            </section>

            {/* Status do Torneio */}
            {config && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <StatusCard
                        label="Equipes Inscritas"
                        value={`${equipes.length}/5`}
                        icon="🏐"
                        color="blue"
                    />
                    <StatusCard
                        label="Chaveamento"
                        value={config.chaveamento_gerado ? 'Gerado ✓' : 'Aguardando'}
                        icon="📊"
                        color={config.chaveamento_gerado ? 'green' : 'gray'}
                    />
                    <StatusCard
                        label="Fase Atual"
                        value={config.fase_atual ? faseLabel(config.fase_atual) : '—'}
                        icon="🎯"
                        color="purple"
                    />
                </div>
            )}

            {/* Campeão */}
            {config?.campeao_id && config.campeao && (
                <div className="mb-10 p-6 rounded-2xl border-2 border-[#f5a623]/40 bg-[#f5a623]/5 text-center glow-gold">
                    <p className="text-gray-400 text-xs tracking-widest mb-2">CAMPEÃO DO TORNEIO</p>
                    <p className="text-5xl mb-2">🏆</p>
                    {(config.campeao as any).logo_url && (
                        <img src={(config.campeao as any).logo_url} alt="" className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />
                    )}
                    <h2 className="font-syne text-2xl font-bold text-[#f5a623]">{(config.campeao as any).nome}</h2>
                </div>
            )}

            {/* Lista de Equipes */}
            <section>
                <h2 className="font-syne text-xl font-bold text-white mb-4">
                    Equipes{' '}
                    <span className="text-gray-500 text-base font-normal">({equipes.length}/5)</span>
                </h2>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-28 rounded-xl bg-[#111827] animate-pulse" />
                        ))}
                    </div>
                ) : equipes.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-4xl mb-3">🏐</p>
                        <p>Nenhuma equipe inscrita ainda.</p>
                        <Link to="/inscricao" className="text-blue-400 hover:underline mt-2 inline-block text-sm">
                            Seja o primeiro a se inscrever →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {equipes.map((eq) => {
                            const colocacao = getColocacaoLabel(eq.colocacao_final)
                            return (
                                <div
                                    key={eq.id}
                                    className="bg-[#111827] border border-[#1e2d40] hover:border-blue-500/40 rounded-xl p-4 text-center transition-all hover:scale-105"
                                >
                                    {eq.logo_url ? (
                                        <img
                                            src={eq.logo_url}
                                            alt={eq.nome}
                                            className="w-14 h-14 rounded-full object-cover mx-auto mb-2"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2">
                                            {eq.nome[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <p className="font-semibold text-sm text-white truncate">{eq.nome}</p>
                                    {eq.posicao && (
                                        <span className="text-[10px] text-gray-500 bg-[#1e2d40] px-2 py-0.5 rounded-full">
                                            {eq.posicao}
                                        </span>
                                    )}
                                    {colocacao && (
                                        <p className="text-xs mt-1">{colocacao.emoji} {colocacao.texto}</p>
                                    )}
                                </div>
                            )
                        })}
                        {/* Slots vazios */}
                        {[...Array(5 - equipes.length)].map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="bg-[#0d1117] border border-dashed border-[#1e2d40] rounded-xl p-4 text-center"
                            >
                                <div className="w-14 h-14 rounded-full bg-[#1e2d40] mx-auto mb-2 flex items-center justify-center text-gray-600 text-2xl">
                                    ?
                                </div>
                                <p className="text-gray-600 text-xs">Vaga disponível</p>
                            </div>
                        ))}
                    </div>
                )}

                {equipes.length < 5 && (
                    <div className="mt-6 text-center">
                        <Link
                            to="/inscricao"
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm"
                        >
                            📋 Inscrever Equipe
                        </Link>
                    </div>
                )}
                {equipes.length === 5 && (
                    <p className="mt-4 text-center text-sm text-gray-500">
                        ✅ Todas as vagas preenchidas. Inscrições encerradas.
                    </p>
                )}
            </section>
        </Layout>
    )
}

function StatusCard({
    label, value, icon, color,
}: { label: string; value: string; icon: string; color: 'blue' | 'green' | 'gray' | 'purple' }) {
    const colors = {
        blue: 'border-blue-500/20 bg-blue-500/5',
        green: 'border-green-500/20 bg-green-500/5',
        gray: 'border-gray-700 bg-[#111827]',
        purple: 'border-purple-500/20 bg-purple-500/5',
    }
    const textColors = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        gray: 'text-gray-400',
        purple: 'text-purple-400',
    }
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest">{label}</span>
            </div>
            <p className={`font-syne font-bold text-lg ${textColors[color]}`}>{value}</p>
        </div>
    )
}

function faseLabel(fase: string): string {
    const labels: Record<string, string> = {
        abertura: 'Rodada de Abertura',
        segunda: '2ª Rodada',
        terceira: '3ª Rodada',
        semifinal: 'Semifinal',
        grande_final: 'Grande Final',
        desempate: 'Desempate',
        encerrado: 'Encerrado 🏆',
    }
    return labels[fase] ?? fase
}
