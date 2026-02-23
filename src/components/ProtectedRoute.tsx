import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
    children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/admin/login" replace />
    }

    return <>{children}</>
}
