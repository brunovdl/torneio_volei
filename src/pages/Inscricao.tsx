import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'

const schema = z.object({
    nome: z.string().min(2, 'Nome da equipe é obrigatório (mín. 2 caracteres)'),
    responsavel: z.string().min(2, 'Nome do responsável é obrigatório'),
    email: z.string().email('E-mail inválido'),
    whatsapp: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function Inscricao() {
    const { equipes, config, recarregar } = useTorneio()
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) })

    const vagas = 5 - equipes.length
    const inscricoesEncerradas = equipes.length >= 5

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const onSubmit = async (data: FormData) => {
        if (inscricoesEncerradas) return
        setLoading(true)

        try {
            let logo_url: string | null = null

            // Upload da logo
            if (logoFile) {
                const ext = logoFile.name.split('.').pop()
                const filename = `equipes/${Date.now()}.${ext}`
                const { error: upErr } = await supabase.storage
                    .from('logos')
                    .upload(filename, logoFile, { upsert: true })

                if (upErr) {
                    console.warn('Erro no upload da logo:', upErr.message)
                } else {
                    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filename)
                    logo_url = urlData.publicUrl
                }
            }

            const { error } = await supabase.from('equipes').insert({
                nome: data.nome,
                responsavel: data.responsavel,
                email: data.email,
                whatsapp: data.whatsapp || null,
                logo_url,
            })

            if (error) throw error

            setSucesso(true)
            reset()
            setLogoFile(null)
            setLogoPreview(null)
            recarregar()
            toast.success(`🏐 ${data.nome} inscrita com sucesso!`)
        } catch (err: any) {
            toast.error(err.message ?? 'Erro ao inscrever equipe')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Layout config={config}>
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <h1 className="font-syne text-3xl font-bold text-white mb-2">📋 Inscrição de Equipe</h1>
                    <p className="text-gray-400 text-sm">
                        {inscricoesEncerradas
                            ? 'Inscrições encerradas — todas as vagas foram preenchidas.'
                            : `${vagas} vaga${vagas !== 1 ? 's' : ''} disponível${vagas !== 1 ? 'is' : ''}`}
                    </p>
                </div>

                {inscricoesEncerradas ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                        <p className="text-4xl mb-3">🚫</p>
                        <h2 className="font-bold text-red-400 text-lg mb-2">Inscrições Encerradas</h2>
                        <p className="text-gray-400 text-sm">Todas as 5 vagas foram preenchidas.<br />O chaveamento está sendo preparado!</p>
                    </div>
                ) : sucesso ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
                        <p className="text-5xl mb-3">🎉</p>
                        <h2 className="font-bold text-green-400 text-xl mb-2">Inscrita com sucesso!</h2>
                        <p className="text-gray-400 text-sm mb-5">Sua equipe foi registrada. Boa sorte no torneio!</p>
                        <button
                            onClick={() => setSucesso(false)}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all"
                        >
                            Inscrever outra equipe
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Logo Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <label htmlFor="logo" className="cursor-pointer">
                                {logoPreview ? (
                                    <img
                                        src={logoPreview}
                                        alt="Preview"
                                        className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 hover:border-blue-400 transition-all"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-[#1e2d40] border-2 border-dashed border-gray-600 hover:border-blue-500 flex flex-col items-center justify-center gap-1 transition-all">
                                        <span className="text-2xl">📷</span>
                                        <span className="text-[10px] text-gray-500">Logo (opt.)</span>
                                    </div>
                                )}
                            </label>
                            <input
                                id="logo"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoChange}
                            />
                        </div>

                        {/* Campos */}
                        <Field label="Nome da Equipe *" error={errors.nome?.message}>
                            <input
                                {...register('nome')}
                                placeholder="Ex: Os Invictos"
                                className={inputCls(!!errors.nome)}
                            />
                        </Field>

                        <Field label="Responsável / Capitão *" error={errors.responsavel?.message}>
                            <input
                                {...register('responsavel')}
                                placeholder="Nome completo"
                                className={inputCls(!!errors.responsavel)}
                            />
                        </Field>

                        <Field label="E-mail de Contato *" error={errors.email?.message}>
                            <input
                                {...register('email')}
                                type="email"
                                placeholder="email@exemplo.com"
                                className={inputCls(!!errors.email)}
                            />
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
                                '✅ Inscrever Equipe'
                            )}
                        </button>
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
