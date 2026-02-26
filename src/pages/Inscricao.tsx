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
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    apelido: z.string().optional(),
    genero: z.enum(['M', 'F', 'N'], { required_error: 'Selecione o gênero' }),
    whatsapp: z.string().optional(),
    posicao: z.enum(['libero', 'levantador', 'ponteiro', 'central', 'oposto', '']).optional(),
})

type FormData = z.infer<typeof schema>

export default function Inscricao() {
    const { config } = useTorneio()
    const { jogadores, recarregar } = useJogadores()
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [emailDuplicado, setEmailDuplicado] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) })

    const LIMITE_JOGADORES = 30
    const inscricoesEncerradas =
        config?.inscricoes_abertas === false ||
        config?.chaveamento_gerado ||
        jogadores.length >= LIMITE_JOGADORES ||
        false

    const homens = useMemo(() => jogadores.filter(j => j.genero === 'M' || j.genero === 'masculino').length, [jogadores])
    const mulheres = useMemo(() => jogadores.filter(j => j.genero === 'F' || j.genero === 'feminino').length, [jogadores])

    const onSubmit = async (data: FormData) => {
        if (inscricoesEncerradas) return
        setLoading(true)
        setEmailDuplicado(false)

        try {
            const generoMap: Record<string, string> = { M: 'masculino', F: 'feminino', N: 'nao_informado' }

            const { error } = await supabase.from('jogadores').insert({
                nome: data.nome,
                apelido: data.apelido || null,
                email: data.email || null,
                genero: generoMap[data.genero] || data.genero,
                whatsapp: data.whatsapp || null,
                posicao: data.posicao || null,
                lista_espera: false,
                cabeca_de_chave: false,
            })

            if (error) {
                if (error.message.includes('unique') || error.message.includes('duplicate') || error.message.includes('jogadores_email_unique')) {
                    setEmailDuplicado(true)
                    toast.error('Este e-mail já está cadastrado.')
                    return
                }
                throw error
            }

            setSucesso(true)
            reset()
            recarregar()
            toast.success(`🏐 Inscrição de ${data.nome} realizada com sucesso!`)
        } catch (err: unknown) {
            const error = err as Error
            toast.error(error.message ?? 'Erro ao realizar inscrição')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Layout config={config}>
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <h1 className="font-syne text-3xl font-bold text-white mb-2">📋 Inscrição</h1>
                    <p className="text-gray-400 text-sm">
                        {inscricoesEncerradas
                            ? 'As inscrições estão encerradas.'
                            : `${jogadores.length} jogador(es) inscrito(s) até agora.`}
                    </p>

                    {!inscricoesEncerradas && (
                        <div className="flex gap-4 justify-center mt-4 flex-wrap">
                            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full">
                                ♂ {homens} Homens
                            </span>
                            <span className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-3 py-1 rounded-full">
                                ♀ {mulheres} Mulheres
                            </span>
                            <span className="text-xs bg-gray-500/10 text-gray-400 border border-gray-500/20 px-3 py-1 rounded-full">
                                👥 {jogadores.length} Total
                            </span>
                        </div>
                    )}
                </div>

                {inscricoesEncerradas ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                        <p className="text-4xl mb-3">🚫</p>
                        <h2 className="font-bold text-red-400 text-lg mb-2">Inscrições Encerradas</h2>
                        <p className="text-gray-400 text-sm">
                            {config?.chaveamento_gerado
                                ? 'O sorteio das equipes já foi realizado.'
                                : jogadores.length >= 30
                                    ? 'O limite máximo de 30 jogadores inscritos foi atingido.'
                                    : 'O administrador fechou as inscrições.'}
                        </p>
                    </div>
                ) : sucesso ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
                        <p className="text-5xl mb-3">🎉</p>
                        <h2 className="font-bold text-green-400 text-xl mb-2">Inscrição Confirmada!</h2>
                        <p className="text-gray-400 text-sm mb-5">
                            Seu registro foi concluído. Aguarde o sorteio das equipes!
                        </p>
                        <button
                            onClick={() => setSucesso(false)}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all"
                        >
                            Fazer nova inscrição
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Nome */}
                        <Field label="Nome Completo *" error={errors.nome?.message}>
                            <input
                                {...register('nome')}
                                placeholder="Digite seu nome completo"
                                className={inputCls(!!errors.nome)}
                            />
                        </Field>

                        {/* Apelido */}
                        <Field label="Apelido / Nome de quadra (opcional)" error={errors.apelido?.message}>
                            <input
                                {...register('apelido')}
                                placeholder="Ex: Carioca, Chico, etc."
                                className={inputCls(false)}
                            />
                        </Field>

                        {/* E-mail */}
                        <Field
                            label="E-mail (opcional)"
                            error={emailDuplicado ? 'Este e-mail já está cadastrado' : errors.email?.message}
                        >
                            <input
                                {...register('email')}
                                type="email"
                                placeholder="seu@email.com"
                                className={inputCls(!!errors.email || emailDuplicado)}
                            />
                        </Field>

                        {/* Gênero */}
                        <Field label="Gênero *" error={errors.genero?.message}>
                            <div className="flex gap-3 flex-wrap">
                                {[
                                    { value: 'M', label: '👨 Masculino', color: 'blue' },
                                    { value: 'F', label: '👩 Feminino', color: 'pink' },
                                    { value: 'N', label: '👤 Prefiro não informar', color: 'gray' },
                                ].map(opt => (
                                    <label
                                        key={opt.value}
                                        className="flex items-center gap-2 cursor-pointer bg-[#1f2937] p-3 rounded-xl border border-[#374151] hover:border-blue-500 flex-1 transition-colors min-w-[120px]"
                                    >
                                        <input type="radio" value={opt.value} {...register('genero')} className="accent-blue-500" />
                                        <span className="text-white text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </Field>

                        {/* WhatsApp */}
                        <Field label="WhatsApp (opcional)" error={errors.whatsapp?.message}>
                            <input
                                {...register('whatsapp')}
                                type="tel"
                                placeholder="(XX) 99999-9999"
                                className={inputCls(false)}
                            />
                        </Field>

                        {/* Posição */}
                        <Field label="Posição (opcional)" error={errors.posicao?.message}>
                            <select {...register('posicao')} className={inputCls(false)}>
                                <option value="">Sem preferência</option>
                                <option value="libero">Líbero</option>
                                <option value="levantador">Levantador(a)</option>
                                <option value="ponteiro">Ponteiro(a)</option>
                                <option value="central">Central</option>
                                <option value="oposto">Oposto(a)</option>
                            </select>
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
                            ) : '✅ Confirmar Inscrição'}
                        </button>

                        <p className="text-xs text-center text-gray-600">
                            As equipes serão sorteadas pelo administrador garantindo times mistos.
                        </p>
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
