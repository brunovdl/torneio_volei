import { Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Inscricao from '@/pages/Inscricao'
import Chaveamento from '@/pages/Chaveamento'
import Login from '@/pages/admin/Login'
import Dashboard from '@/pages/admin/Dashboard'
import Equipes from '@/pages/admin/Equipes'
import Jogadores from '@/pages/admin/Jogadores'
import Sorteio from '@/pages/admin/Sorteio'
import Jogos from '@/pages/admin/Jogos'
import Configurar from '@/pages/admin/Configurar'
import DivisaoIA from '@/pages/admin/DivisaoIA'
import LogsIA from '@/pages/admin/LogsIA'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function App() {
    return (
        <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/inscricao" element={<Inscricao />} />
            <Route path="/chaveamento" element={<Chaveamento />} />

            {/* Admin login */}
            <Route path="/admin/login" element={<Login />} />

            {/* Rotas admin protegidas */}
            <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/jogadores" element={<ProtectedRoute><Jogadores /></ProtectedRoute>} />
            <Route path="/admin/equipes" element={<ProtectedRoute><Equipes /></ProtectedRoute>} />
            <Route path="/admin/configurar" element={<ProtectedRoute><Configurar /></ProtectedRoute>} />
            <Route path="/admin/divisao-ia" element={<ProtectedRoute><DivisaoIA /></ProtectedRoute>} />
            <Route path="/admin/sorteio" element={<ProtectedRoute><Sorteio /></ProtectedRoute>} />
            <Route path="/admin/jogos" element={<ProtectedRoute><Jogos /></ProtectedRoute>} />
            <Route path="/admin/ia-logs" element={<ProtectedRoute><LogsIA /></ProtectedRoute>} />
        </Routes>
    )
}
