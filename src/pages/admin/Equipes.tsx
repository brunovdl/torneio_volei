import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'

export default function Equipes() {
    const { equipes, config, recarregar } = useTorneio()
    const [removendo, setRemovendo] = useState<string | null>(null)

    const remover = async (id: string, nome: string) => {
        if (!confirm(`Tem certeza que deseja remover "${nome}"?`)) return
        setRemovendo(id)
        const { error } = await supabase.from('equipes').delete().eq('id', id)
        setRemovendo(null)
        if (error) {
            toast.error('Erro ao remover equipe')
        } else {
            toast.success(`${nome} removida`)
            recarregar()
        }
    }

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6">
                <h1 className="font-syne text-2xl font-bold text-white">👥 Equipes Cadastradas</h1>
                <p className="text-gray-500 text-sm mt-1">{equipes.length} equipe{equipes.length !== 1 ? 's' : ''} inscrita{equipes.length !== 1 ? 's' : ''}</p>
            </div>

            {equipes.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3">📭</p>
                    <p>Nenhuma equipe inscrita ainda.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {equipes.map((eq) => (
                        <div
                            key={eq.id}
                            className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-5 flex items-center gap-4"
                        >
                            {/* Logo */}
                            {eq.logo_url ? (
                                <img src={eq.logo_url} alt={eq.nome} className="w-12 h-12 rounded-full object-cover shrink-0" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
                                    {eq.nome[0]?.toUpperCase()}
                                </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-white">{eq.nome}</p>
                                    {eq.posicao && (
                                        <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                                            {eq.posicao}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 truncate">
                                    <span className="text-gray-500">Cap:</span> {eq.responsavel}
                                </p>
                                <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                                    <span>📧 {eq.email}</span>
                                    {eq.whatsapp && <span>📱 {eq.whatsapp}</span>}
                                </div>
                            </div>

                            {/* Colocação */}
                            {eq.colocacao_final && (
                                <span className="text-2xl shrink-0">
                                    {{ '1': '🥇', '2': '🥈', '3': '🥉', '4': '4️⃣', '5': '5️⃣' }[eq.colocacao_final] ?? ''}
                                </span>
                            )}

                            {/* Remover */}
                            <button
                                onClick={() => remover(eq.id, eq.nome)}
                                disabled={removendo === eq.id}
                                className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 rounded-lg transition-all disabled:opacity-50 shrink-0"
                            >
                                {removendo === eq.id ? '...' : '🗑 Remover'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    )
}
