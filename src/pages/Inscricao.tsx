import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import { useJogadores } from '@/hooks/useJogadores'
import Layout from '@/components/Layout'

const schema = z.object({
    nome: z.string().min(2, 'Nome completo é obrigatório'),
    genero: z.enum(['M', 'F'], { required_error: 'Selecione o gênero' }),
    whatsapp: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function Inscricao() {
    const { config } = useTorneio()
    const { jogadores, recarregar } = useJogadores()
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) })

    // Se já foram gerados os times, não deve aceitar mais inscrição
    const inscricoesEncerradas = config?.chaveamento_gerado || false

    // Contagem atual
    const homens = useMemo(() => jogadores.filter(j => j.genero === 'M').length, [jogadores])
    const mulheres = useMemo(() => jogadores.filter(j => j.genero === 'F').length, [jogadores])
    const total = jogadores.length

    const onSubmit = async (data: FormData) => {
        if (inscricoesEncerradas) return
        setLoading(true)

        try {
            const { error } = await supabase.from('jogadores').insert({
                nome: data.nome,
                genero: data.genero,
                whatsapp: data.whatsapp || null,
            })

            if (error) throw error

            setSucesso(true)
            reset()
            recarregar()
            toast.success(`🏐 Inscrição de ${data.nome} realizada com sucesso!`)
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao realizar inscrição')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Layout config={config}>
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <h1 className="font-syne text-3xl font-bold text-white mb-2">📋 Inscrição de Jogadores</h1>
                    <p className="text-gray-400 text-sm">
                        {inscricoesEncerradas
                            ? 'As inscrições estão encerradas e as equipes já foram sorteadas.'
                            : `Torneio de Vôlei: ${total} jogador(es) inscrito(s) até agora.`}
                    </p>

                    {!inscricoesEncerradas && (
                        <div className="flex gap-4 justify-center mt-4">
                            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full">
                                👨 Homens: {homens}
                            </span>
                            <span className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-3 py-1 rounded-full">
                                👩 Mulheres: {mulheres}
                            </span>
                        </div>
                    )}
                </div>

                {inscricoesEncerradas ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                        <p className="text-4xl mb-3">🚫</p>
                        <h2 className="font-bold text-red-400 text-lg mb-2">Inscrições Encerradas</h2>
                        <p className="text-gray-400 text-sm">O sorteio das equipes já foi realizado.</p>
                    </div>
                ) : sucesso ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
                        <p className="text-5xl mb-3">🎉</p>
                        <h2 className="font-bold text-green-400 text-xl mb-2">Inscrição Confirmada!</h2>
                        <p className="text-gray-400 text-sm mb-5">Seu registro foi concluído. Fique atento ao sorteio das equipes!</p>
                        <button
                            onClick={() => setSucesso(false)}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all"
                        >
                            Fazer uma nova inscrição
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <Field label="Nome Completo *" error={errors.nome?.message}>
                            <input
                                {...register('nome')}
                                placeholder="Digite seu nome completo"
                                className={inputCls(!!errors.nome)}
                            />
                        </Field>

                        <Field label="Gênero *" error={errors.genero?.message}>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-[#1f2937] p-3 rounded-xl border border-[#374151] hover:border-blue-500 flex-1 transition-colors">
                                    <input
                                        type="radio"
                                        value="M"
                                        {...register('genero')}
                                        className="text-blue-500"
                                    />
                                    <span className="text-white text-sm">Masculino</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-[#1f2937] p-3 rounded-xl border border-[#374151] hover:border-pink-500 flex-1 transition-colors">
                                    <input
                                        type="radio"
                                        value="F"
                                        {...register('genero')}
                                        className="text-pink-500"
                                    />
                                    <span className="text-white text-sm">Feminino</span>
                                </label>
                            </div>
                        </Field>

                        <Field label="WhatsApp (opcional)" error={errors.whatsapp?.message}>
                            <input
                                {...register('whatsapp')}
                                type="tel"
                                placeholder="(XX) 99999-9999"
                                className={inputCls(!!errors.whatsapp)}
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Inscrevendo...
                                </span>
                            ) : (
                                '✅ Confirmar Inscrição'
                            )}
                        </button>

                        <div className="text-xs text-center text-gray-500 mt-4">
                            Lembre-se: As equipes serão sorteadas pelo administrador, mantendo a regra de 2 homens e 2 mulheres por time em quadra.
                        </div>
                    </form>
                )}
            </div>
        </Layout>
    )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
            {children}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    )
}

function inputCls(hasError: boolean) {
    return `w-full bg-[#1f2937] border ${hasError ? 'border-red-500' : 'border-[#374151]'} text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors`
}
