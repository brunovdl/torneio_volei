import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error: err } = await signIn(email, password)
        setLoading(false)
        if (err) {
            setError('E-mail ou senha incorretos. Tente novamente.')
        } else {
            navigate('/admin/dashboard')
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <p className="text-4xl mb-3">🏐</p>
                    <h1 className="font-syne text-2xl font-bold text-white">Área do Administrador</h1>
                    <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@exemplo.com"
                            required
                            className="w-full bg-[#1f2937] border border-[#374151] text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full bg-[#1f2937] border border-[#374151] text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Entrando...
                            </span>
                        ) : (
                            'Entrar'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
