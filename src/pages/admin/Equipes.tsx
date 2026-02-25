import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'

export default function Equipes() {
    const { equipes, config, recarregar } = useTorneio()
    const [removendo, setRemovendo] = useState<string | null>(null)
    const [editando, setEditando] = useState<string | null>(null)
    const [novoNome, setNovoNome] = useState('')

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

    const iniciarEdicao = (eq: any) => {
        setEditando(eq.id)
        setNovoNome(eq.nome)
    }

    const salvarEdicao = async (id: string) => {
        if (!novoNome.trim()) return

        const { error } = await supabase.from('equipes').update({ nome: novoNome.trim() }).eq('id', id)
        if (error) {
            toast.error('Erro ao atualizar nome')
        } else {
            toast.success('Nome atualizado!')
            setEditando(null)
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
                                    {editando === eq.id ? (
                                        <div className="flex gap-2 w-full max-w-sm">
                                            <input
                                                autoFocus
                                                value={novoNome}
                                                onChange={e => setNovoNome(e.target.value)}
                                                className="bg-[#1f2937] border border-[#374151] text-white px-3 py-1 rounded focus:outline-none focus:border-blue-500 w-full"
                                            />
                                            <button
                                                onClick={() => salvarEdicao(eq.id)}
                                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm font-bold shrink-0"
                                            >
                                                Salvar
                                            </button>
                                            <button
                                                onClick={() => setEditando(null)}
                                                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm shrink-0"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-bold text-white">{eq.nome}</p>
                                            <button onClick={() => iniciarEdicao(eq)} className="text-gray-500 hover:text-blue-400 text-xs shrink-0 px-2">✏️ Editar</button>
                                            {eq.posicao && (
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold ml-2">
                                                    {eq.posicao}
                                                </span>
                                            )}
                                        </>
                                    )}
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
