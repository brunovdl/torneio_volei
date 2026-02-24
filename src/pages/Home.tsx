import { Link } from 'react-router-dom'
import { useTorneio } from '@/hooks/useTorneio'
import { useJogadores } from '@/hooks/useJogadores'
import Layout from '@/components/Layout'
import { getColocacaoLabel } from '@/services/bracket'

export default function Home() {
    const { equipes, config, loading: loadingTorneio } = useTorneio()
    const { jogadores, loading: loadingJogadores } = useJogadores()

    const loading = loadingTorneio || loadingJogadores

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
                    Eliminatória dupla · Sorteio equilibrado · 20 vagas titulares
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    {config?.chaveamento_gerado ? (
                        <Link
                            to="/chaveamento"
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 text-sm"
                        >
                            🏆 Ver Chaveamento
                        </Link>
                    ) : (
                        <Link
                            to="/inscricao"
                            className="px-6 py-3 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 border border-[#f5a623]/30 text-[#f5a623] font-bold rounded-xl transition-all hover:scale-105 text-sm"
                        >
                            📋 Inscrever Jogador(a)
                        </Link>
                    )}
                </div>
            </section>

            {/* Status do Torneio */}
            {config && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <StatusCard
                        label="Jogadores Inscritos"
                        value={`${jogadores.length}/20+`}
                        icon="👤"
                        color="blue"
                    />
                    <StatusCard
                        label="Chaveamento"
                        value={config.chaveamento_gerado ? 'Gerado ✓' : 'Aguardando Sorteio'}
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

            {/* Lista Principal: Equipes (se gerado) ou Jogadores (se não gerado) */}
            <section>
                {config?.chaveamento_gerado ? (
                    <>
                        <h2 className="font-syne text-xl font-bold text-white mb-4">
                            Tabela de Equipes
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {equipes.map((eq) => {
                                const colocacao = getColocacaoLabel(eq.colocacao_final)
                                // Mostrar jogadores de cada equipe se os dados permitirem
                                // Por enquanto a query fetchEquipes atualizada será necessária em services/bracket.ts
                                // Ou podemos simplesmente listar as equipes como antes
                                return (
                                    <div
                                        key={eq.id}
                                        className="bg-[#111827] border border-[#1e2d40] hover:border-blue-500/40 rounded-xl p-4 transition-all"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            {eq.logo_url ? (
                                                <img
                                                    src={eq.logo_url}
                                                    alt={eq.nome}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                                                    {eq.nome[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-sm text-white">{eq.nome}</h3>
                                                {eq.posicao && (
                                                    <span className="text-[10px] text-gray-500 bg-[#1e2d40] px-2 py-0.5 rounded-full mt-1 inline-block">
                                                        {eq.posicao}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {colocacao && (
                                            <p className="text-xs mt-1 text-center bg-gray-800 rounded-lg p-2 font-medium">{colocacao.emoji} {colocacao.texto}</p>
                                        )}
                                        {/* Jogadores da equipe (se disponível e não populamos a query ainda) */}
                                        <div className="space-y-1 mt-3">
                                            {jogadores.filter(j => j.equipe_id === eq.id).map(j => (
                                                <div key={j.id} className="text-xs text-gray-400 flex items-center gap-2">
                                                    <span>{j.genero === 'M' ? '👨' : '👩'}</span>
                                                    <span className="truncate">{j.nome}</span>
                                                    {j.cabeca_de_chave && <span className="text-[#f5a623]" title="Cabeça de Chave">⭐</span>}
                                                </div>
                                            ))}
                                            {jogadores.filter(j => j.equipe_id === eq.id).length === 0 && (
                                                <p className="text-xs text-gray-600 italic">Nenhum jogador listado...</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="font-syne text-xl font-bold text-white mb-4">
                            Jogadores Inscritos{' '}
                            <span className="text-gray-500 text-base font-normal">({jogadores.length})</span>
                        </h2>

                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-16 rounded-xl bg-[#111827] animate-pulse" />
                                ))}
                            </div>
                        ) : jogadores.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <p className="text-4xl mb-3">👤</p>
                                <p>Nenhum jogador inscrito ainda.</p>
                                <Link to="/inscricao" className="text-blue-400 hover:underline mt-2 inline-block text-sm">
                                    Seja o primeiro a se inscrever →
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {jogadores.map((j) => (
                                    <div
                                        key={j.id}
                                        className="bg-[#111827] border border-[#1e2d40] rounded-xl p-3 flex items-center gap-3"
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${j.genero === 'M' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                                            {j.genero === 'M' ? '👨' : '👩'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-medium text-sm text-white truncate">{j.nome}</p>
                                            {j.cabeca_de_chave && <p className="text-[10px] text-[#f5a623]">⭐ Cabeça de Chave</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!config?.chaveamento_gerado && (
                            <div className="mt-8 text-center bg-[#1e2d40]/30 rounded-xl p-6 border border-[#1e2d40]">
                                <h3 className="text-white font-bold mb-2">Próximo Passo: Sorteio das Equipes</h3>
                                <p className="text-sm text-gray-400 max-w-lg mx-auto mb-4">
                                    O administrador irá realizar o sorteio garantindo que cada equipe tenha exatos 2 homens e 2 mulheres.
                                </p>
                                <Link
                                    to="/inscricao"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm inline-block"
                                >
                                    📋 Inscrever-se
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Regulamento */}
            <section className="mt-16 bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 sm:p-8">
                <h2 className="font-syne text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    📋 Regulamento Oficial
                </h2>

                <div className="space-y-6 text-gray-300 text-sm sm:text-base">
                    <div>
                        <h3 className="text-[#f5a623] font-bold text-lg mb-2">1. O Propósito do Evento</h3>
                        <p>
                            O objetivo principal deste mini torneio é promover a comunhão, a amizade e a integração da juventude em um ambiente cristão, saudável e divertido. O respeito aos adversários e aos colegas de equipe é inegociável.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-[#f5a623] font-bold text-lg mb-2">2. Formato das Equipes</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong className="text-white">Modalidade:</strong> Quarteto Misto Rigoroso (4 contra 4).</li>
                            <li><strong className="text-white">Composição:</strong> Para garantir a justiça e o equilíbrio, é obrigatória a presença de exatos 2 (dois) homens e 2 (duas) mulheres em quadra durante toda a partida.</li>
                            <li><strong className="text-white">Substituições:</strong> São livres, desde que a proporção de 2 homens e 2 mulheres na areia seja sempre mantida. A troca deve ser comunicada com antecedência.</li>
                            <li><strong className="text-white">Sorteio:</strong> Os times serão definidos por sorteio equilibrado.</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[#f5a623] font-bold text-lg mb-2">3. Sistema de Disputa (Eliminatória Dupla)</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong className="text-white">Garantia de Jogo:</strong> Nenhuma equipe é eliminada após a primeira derrota. Todos têm o direito de jogar no mínimo 2 vezes.</li>
                            <li><strong className="text-white">Chaveamento:</strong> O torneio é dividido em "Chave dos Vencedores" e "Chave da Repescagem". A equipe só é desclassificada da competição ao sofrer a sua segunda derrota.</li>
                            <li><strong className="text-white">Duração da Partida:</strong> Os jogos serão de Set Único de 10 pontos.</li>
                            <li><strong className="text-white">Vantagem e Ponto Limite:</strong> Para vencer, é preciso abrir 2 pontos de diferença (ex: 11x9). Caso o jogo empate em 11x11, a equipe que marcar o 12º ponto primeiro vence a partida (limite máximo de 12 pontos).</li>
                            <li><strong className="text-white">Troca de Lado:</strong> Como os jogos são curtos, as equipes trocam de lado da quadra apenas uma vez, quando a soma dos pontos das duas equipes chegar a 5 (para equilibrar sol e vento).</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[#f5a623] font-bold text-lg mb-2">4. Regras Práticas de Jogo</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong className="text-white">Altura da Rede:</strong> 2,35 metros (altura mista).</li>
                            <li><strong className="text-white">Saque:</strong> Pode ser feito de qualquer lugar atrás da linha de fundo. A equipe deve respeitar o rodízio de quem saca.</li>
                            <li><strong className="text-white">Toques na Bola:</strong> Cada equipe tem direito a, no máximo, 3 toques para passar a bola (o bloqueio não conta como toque).</li>
                            <li><strong className="text-white">Toque na Rede:</strong> É proibido encostar na rede durante a disputa de bola. Qualquer toque resulta em ponto para a equipe adversária.</li>
                            <li><strong className="text-white">Critério de Arbitragem:</strong> Como o foco é a inclusão e a diversão de quem está aprendendo a jogar, a arbitragem será flexível com infrações técnicas de areia (como "carregar" a bola no levantamento de toque), apitando apenas retenções muito claras.</li>
                        </ul>
                    </div>

                    <div className="bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-xl p-4 mt-8">
                        <h3 className="text-[#f5a623] font-bold text-lg mb-2 flex items-center gap-2">
                            🤝 5. Conduta e Fair Play
                        </h3>
                        <p className="mb-2">
                            Palavrões, atitudes antidesportivas ou discussões não combinam com o nosso propósito e não serão tolerados.
                        </p>
                        <p className="font-semibold text-white">
                            Lembre-se: estamos aqui para celebrar, fazer amigos e nos divertir juntos. O placar é apenas um detalhe!
                        </p>
                    </div>
                </div>
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
