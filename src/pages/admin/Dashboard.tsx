import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'

export default function Dashboard() {
    const { config, jogos, equipes, recarregar } = useTorneio()
    const [toggling, setToggling] = useState(false)

    const toggleAoVivo = async () => {
        if (!config) return
        setToggling(true)
        const { error } = await supabase
            .from('torneio_config')
            .update({ ao_vivo: !config.ao_vivo })
            .eq('id', 1)
        setToggling(false)
        if (error) {
            toast.error('Erro ao alterar modo ao vivo')
        } else {
            toast.success(config.ao_vivo ? '⏸ Modo ao vivo desativado' : '🔴 Modo ao vivo ativado!')
            recarregar()
        }
    }

    const jogosFinalizados = jogos.filter(j => j.status === 'finalizado').length
    const jogoAtual = jogos.find(j => j.status === 'aguardando' && j.equipe_a_id && j.equipe_b_id)

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-8">
                <h1 className="font-syne text-2xl font-bold text-white">⚙️ Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Painel de controle do torneio</p>
            </div>

            {/* Cards de status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <StatCard label="Equipes" value={`${equipes.length}/5`} icon="🏐" />
                <StatCard label="Jogos realizados" value={`${jogosFinalizados}/9`} icon="✅" />
                <StatCard
                    label="Fase atual"
                    value={config?.fase_atual ? faseLabel(config.fase_atual) : '—'}
                    icon="🎯"
                />
                <StatCard
                    label="Chaveamento"
                    value={config?.chaveamento_gerado ? 'Gerado ✓' : 'Pendente'}
                    icon="📊"
                />
            </div>

            {/* Ao Vivo Toggle */}
            <div className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="font-bold text-white mb-1">🔴 Modo Ao Vivo</h2>
                        <p className="text-gray-500 text-sm">
                            Quando ativo, exibe o badge "AO VIVO" para todos os visitantes do site.
                        </p>
                    </div>
                    <button
                        onClick={toggleAoVivo}
                        disabled={toggling}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${config?.ao_vivo ? 'bg-red-500 border-red-500' : 'bg-gray-700 border-gray-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${config?.ao_vivo ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Jogo atual */}
            {jogoAtual && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-6">
                    <h2 className="font-bold text-blue-400 mb-2">⚡ Próximo Jogo</h2>
                    <p className="text-white font-medium">
                        {jogoAtual.equipe_a?.nome ?? '—'} <span className="text-gray-500">vs</span> {jogoAtual.equipe_b?.nome ?? '—'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">{jogoAtual.label}</p>
                    <Link
                        to="/admin/jogos"
                        className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all"
                    >
                        Registrar Resultado →
                    </Link>
                </div>
            )}

            {/* Links rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { to: '/admin/equipes', icon: '👥', label: 'Gerenciar Equipes', desc: 'Ver dados e remover equipes' },
                    { to: '/admin/sorteio', icon: '🎲', label: 'Sorteio', desc: 'Definir T1–T5 e gerar chaveamento' },
                    { to: '/admin/jogos', icon: '📋', label: 'Jogos', desc: 'Registrar e gerenciar resultados' },
                ].map(link => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="bg-[#111827] border border-[#1e2d40] hover:border-blue-500/40 rounded-2xl p-5 transition-all hover:scale-[1.02] group"
                    >
                        <p className="text-3xl mb-2">{link.icon}</p>
                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{link.label}</h3>
                        <p className="text-gray-500 text-xs mt-1">{link.desc}</p>
                    </Link>
                ))}
            </div>
        </Layout>
    )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="bg-[#111827] border border-[#1e2d40] rounded-xl p-4">
            <p className="text-lg mb-1">{icon}</p>
            <p className="font-syne font-bold text-white text-lg">{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
        </div>
    )
}

function faseLabel(fase: string) {
    const map: Record<string, string> = {
        abertura: 'Abertura',
        segunda: '2ª Rodada',
        terceira: '3ª Rodada',
        semifinal: 'Semifinal',
        grande_final: 'Grande Final',
        desempate: 'Desempate',
        encerrado: 'Encerrado 🏆',
    }
    return map[fase] ?? fase
}
