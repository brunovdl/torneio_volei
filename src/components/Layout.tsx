import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useJogadores } from '@/hooks/useJogadores'
import LiveBadge from './LiveBadge'
import type { TorneioConfig } from '@/types'

interface LayoutProps {
    children: React.ReactNode
    config?: TorneioConfig | null
    showAdminNav?: boolean
}

export default function Layout({ children, config, showAdminNav = false }: LayoutProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, signOut } = useAuth()
    const { jogadores } = useJogadores()

    const handleLogout = async () => {
        await signOut()
        navigate('/')
    }

    const navLinks = showAdminNav
        ? [
            { to: '/admin/dashboard', label: 'Dashboard' },
            { to: '/admin/jogadores', label: 'Jogadores' },
            { to: '/admin/equipes', label: 'Equipes' },
            { to: '/admin/sorteio', label: 'Sorteio' },
            { to: '/admin/jogos', label: 'Jogos' },
        ]
        : [
            { to: '/', label: 'Início' },
            { to: '/inscricao', label: 'Inscrição' },
            { to: '/chaveamento', label: 'Chaveamento' },
        ]

    return (
        <div className="min-h-screen bg-[#0a0e1a] text-[#e2e8f0]">
            {/* Header */}
            <header className="border-b border-[#1e2d40] bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 shrink-0">
                        <span className="text-2xl">🏐</span>
                        <span className="font-syne font-bold text-white hidden sm:block text-lg leading-tight">
                            1º Mini Torneio de Vôlei
                        </span>
                    </Link>

                    {/* Live Badge */}
                    {config?.ao_vivo && <LiveBadge />}

                    {/* Nav */}
                    <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${location.pathname === link.to
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-[#1e2d40]'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {user && (
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap"
                            >
                                Sair
                            </button>
                        )}
                        {!showAdminNav && user && location.pathname !== '/admin/dashboard' && (
                            <Link
                                to="/admin/dashboard"
                                className="px-3 py-1.5 rounded-md text-sm font-medium text-blue-400 hover:text-white hover:bg-blue-600 transition-colors"
                            >
                                Painel Admin
                            </Link>
                        )}
                        {!user && location.pathname !== '/admin/login' && (
                            <Link
                                to="/admin/login"
                                className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-white hover:bg-[#1e2d40] transition-colors"
                            >
                                Admin Login
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            {/* Ticker Animado */}
            <div className="bg-blue-600/10 border-b border-blue-500/20 py-2 overflow-hidden h-10 flex items-center">
                <div className="animate-marquee whitespace-nowrap text-xs sm:text-sm font-bold tracking-wide flex items-center gap-12">
                    <span className="inline-block">
                        <span className="text-blue-400">🎯 FASE ATUAL:</span>{' '}
                        <span className="text-white">
                            {jogadores.length >= 30 && config?.fase_atual === 'inscricoes'
                                ? 'Vagas Esgotadas'
                                : (config?.fase_atual ? faseLabel(config.fase_atual) : 'Inscrições')}
                        </span>
                    </span>
                    <span className="inline-block">
                        <span className="text-blue-400">📅 DATA DO TORNEIO:</span>{' '}
                        <span className="text-white">27/02/2026</span>
                    </span>
                    <span className="inline-block">
                        <span className="text-blue-400">🕒 SORTEIO DOS TIMES:</span>{' '}
                        <span className="text-white">13:00h</span>
                    </span>
                    <span className="inline-block">
                        <span className="text-blue-400">🏐 PRIMEIRO JOGO:</span>{' '}
                        <span className="text-white">20:20h (Chave Principal)</span>
                    </span>
                    {/* Repetição para loop infinito suave */}
                    <span className="inline-block">
                        <span className="text-blue-400">🎯 FASE ATUAL:</span>{' '}
                        <span className="text-white">
                            {jogadores.length >= 30 && config?.fase_atual === 'inscricoes'
                                ? 'Vagas Esgotadas'
                                : (config?.fase_atual ? faseLabel(config.fase_atual) : 'Inscrições')}
                        </span>
                    </span>
                    <span className="inline-block">
                        <span className="text-blue-400">📅 DATA DO TORNEIO:</span>{' '}
                        <span className="text-white">27/02/2026</span>
                    </span>
                </div>
            </div>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-[#1e2d40] py-6 text-center text-sm text-gray-600 mt-8">
                🏐 1º Torneio de Vôlei de Areia — IEQ JD Portugal &nbsp;·&nbsp;
                <span>Eliminatória Dupla · 5 Times</span>
            </footer>
        </div>
    )
}

function faseLabel(fase: string): string {
    const labels: Record<string, string> = {
        inscricoes: 'Inscrições',
        vagas_esgotadas: 'Vagas Esgotadas',
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
