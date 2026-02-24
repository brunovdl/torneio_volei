import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import { useJogadores } from '@/hooks/useJogadores'
import Layout from '@/components/Layout'
import type { Jogador } from '@/types'

export default function Jogadores() {
    const { config } = useTorneio()
    const { jogadores, loading, recarregar } = useJogadores()

    const [removendo, setRemovendo] = useState<string | null>(null)
    const [salvando, setSalvando] = useState<string | null>(null)

    // Status de edição
    const [editandoId, setEditandoId] = useState<string | null>(null)
    const [form, setForm] = useState({ nome: '', genero: 'M', whatsapp: '' })

    const iniciarEdicao = (j: Jogador) => {
        setEditandoId(j.id)
        setForm({
            nome: j.nome,
            genero: j.genero,
            whatsapp: j.whatsapp || ''
        })
    }

    const cancelarEdicao = () => {
        setEditandoId(null)
        setForm({ nome: '', genero: 'M', whatsapp: '' })
    }

    const salvarEdicao = async (id: string) => {
        if (!form.nome.trim()) {
            toast.error('O nome é obrigatório')
            return
        }

        setSalvando(id)
        try {
            const { error } = await supabase
                .from('jogadores')
                .update({
                    nome: form.nome,
                    genero: form.genero,
                    whatsapp: form.whatsapp || null
                })
                .eq('id', id)

            if (error) throw error

            toast.success('Jogador atualizado!')
            cancelarEdicao()
            recarregar()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao atualizar jogador')
        } finally {
            setSalvando(null)
        }
    }

    const remover = async (id: string, nome: string) => {
        if (!confirm(`Tem certeza que deseja remover o jogador "${nome}"?\nCuidado: se o chaveamento já foi gerado e ele estiver em uma equipe, isso pode gerar inconsistências.`)) return

        setRemovendo(id)
        try {
            const { error } = await supabase.from('jogadores').delete().eq('id', id)
            if (error) throw error

            toast.success(`Jogador ${nome} removido`)
            recarregar()
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao remover jogador')
        } finally {
            setRemovendo(null)
        }
    }

    const homens = jogadores.filter(j => j.genero === 'M').length
    const mulheres = jogadores.filter(j => j.genero === 'F').length

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-syne text-2xl font-bold text-white">👥 Jogadores Inscritos</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Gerencie os {jogadores.length} inscritos ({homens} Homens / {mulheres} Mulheres)
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                </div>
            ) : jogadores.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3">📭</p>
                    <p>Nenhum jogador inscrito ainda.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {jogadores.map((j) => (
                        <div
                            key={j.id}
                            className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all"
                        >
                            {/* Visualização Padrão ou Modo Edição */}
                            {editandoId === j.id ? (
                                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="col-span-1 sm:col-span-3 lg:col-span-1">
                                        <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                                        <input
                                            value={form.nome}
                                            onChange={e => setForm({ ...form, nome: e.target.value })}
                                            className="w-full bg-[#1f2937] border border-[#374151] text-white rounded-lg px-3 py-1.5 focus:border-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div className="">
                                        <label className="text-xs text-gray-500 mb-1 block">Gênero</label>
                                        <select
                                            value={form.genero}
                                            onChange={e => setForm({ ...form, genero: e.target.value as 'M' | 'F' })}
                                            className="w-full bg-[#1f2937] border border-[#374151] text-white rounded-lg px-3 py-1.5 focus:border-blue-500 outline-none text-sm"
                                        >
                                            <option value="M">Masculino (M)</option>
                                            <option value="F">Feminino (F)</option>
                                        </select>
                                    </div>
                                    <div className="">
                                        <label className="text-xs text-gray-500 mb-1 block">WhatsApp</label>
                                        <input
                                            value={form.whatsapp}
                                            onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                                            placeholder="(XX) 99999-9999"
                                            className="w-full bg-[#1f2937] border border-[#374151] text-white rounded-lg px-3 py-1.5 focus:border-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Icone de gẽnero */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${j.genero === 'M' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                                        {j.genero === 'M' ? '👨' : '👩'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <p className="font-bold text-white truncate">{j.nome}</p>
                                            {j.cabeca_de_chave && (
                                                <span className="text-[10px] bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/30 px-2 py-0.5 rounded-full font-bold">
                                                    ⭐ Cabeça de Chave
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                            <span>{j.genero === 'M' ? 'Masculino' : 'Feminino'}</span>
                                            {j.whatsapp && <span>📱 {j.whatsapp}</span>}
                                            <span className="text-gray-600 border-l border-gray-700 pl-4">{new Date(j.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        {j.equipe_id && (
                                            <div className="mt-1 text-xs text-green-500/80">
                                                ✓ Associado a uma equipe
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Ações */}
                            <div className="flex items-center gap-2 sm:self-center self-end shrink-0 mt-3 sm:mt-0">
                                {editandoId === j.id ? (
                                    <>
                                        <button
                                            onClick={cancelarEdicao}
                                            disabled={salvando === j.id}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-[#1f2937] hover:bg-gray-700 border border-[#374151] rounded-lg transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => salvarEdicao(j.id)}
                                            disabled={salvando === j.id}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-lg transition-all disabled:opacity-50"
                                        >
                                            {salvando === j.id ? 'Salvando...' : 'Salvar'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => iniciarEdicao(j)}
                                            disabled={removendo === j.id}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-[#1e2d40] rounded-lg transition-all"
                                            title="Editar jogador"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => remover(j.id, j.nome)}
                                            disabled={removendo === j.id}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                            title="Remover jogador"
                                        >
                                            🗑️
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    )
}
