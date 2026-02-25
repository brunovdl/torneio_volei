import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTorneio } from '@/hooks/useTorneio'
import Layout from '@/components/Layout'
import type { IALog } from '@/types'

export default function LogsIA() {
    const { config } = useTorneio()
    const [logs, setLogs] = useState<IALog[]>([])
    const [loading, setLoading] = useState(true)
    const [detalhe, setDetalhe] = useState<IALog | null>(null)

    useEffect(() => {
        const carregar = async () => {
            const { data, error } = await supabase
                .from('ia_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)
            if (!error) setLogs((data || []) as IALog[])
            setLoading(false)
        }
        carregar()
    }, [])

    const tipoLabel: Record<string, string> = {
        divisao_times: '👥 Divisão',
        geracao_torneio: '🏆 Bracket',
        retry: '🔄 Retry',
    }

    return (
        <Layout config={config} showAdminNav>
            <div className="mb-6">
                <h1 className="font-syne text-2xl font-bold text-white">🤖 Logs da IA</h1>
                <p className="text-gray-500 text-sm mt-1">Histórico de chamadas à IA (últimas 50)</p>
            </div>

            {loading && (
                <div className="text-center py-16 text-gray-500">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p>Carregando logs...</p>
                </div>
            )}

            {!loading && logs.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-3">📭</p>
                    <p>Nenhuma chamada à IA registrada ainda.</p>
                </div>
            )}

            {!loading && logs.length > 0 && (
                <div className="space-y-3">
                    {logs.map((log, i) => (
                        <div
                            key={log.id || i}
                            className={`bg-[#111827] border rounded-xl p-4 cursor-pointer transition-all hover:border-blue-500/30 ${log.sucesso ? 'border-[#1e2d40]' : 'border-red-500/30'
                                }`}
                            onClick={() => setDetalhe(detalhe?.id === log.id ? null : log)}
                        >
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${log.sucesso
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {log.sucesso ? '✅ Sucesso' : '❌ Falha'}
                                </span>

                                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
                                    {tipoLabel[log.tipo_chamada as string] || log.tipo_chamada}
                                </span>

                                {log.tentativa && log.tentativa > 1 && (
                                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full">
                                        Tentativa {log.tentativa}
                                    </span>
                                )}

                                <span className="text-gray-500 text-xs ml-auto">
                                    {log.duracao_ms ? `${(log.duracao_ms / 1000).toFixed(1)}s` : '—'}
                                </span>

                                <span className="text-gray-600 text-xs">
                                    {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—'}
                                </span>
                            </div>

                            {log.erro_validacao && (
                                <p className="mt-2 text-xs text-red-400 bg-red-500/5 rounded-lg px-3 py-2">
                                    {log.erro_validacao}
                                </p>
                            )}

                            {detalhe?.id === log.id && (
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Modelo</p>
                                        <p className="text-sm text-gray-300">{log.modelo_usado || '—'}</p>
                                    </div>
                                    {log.tokens_entrada && (
                                        <div className="flex gap-4">
                                            <span className="text-xs text-gray-500">Tokens entrada: <span className="text-white">{log.tokens_entrada}</span></span>
                                            <span className="text-xs text-gray-500">Tokens saída: <span className="text-white">{log.tokens_saida}</span></span>
                                        </div>
                                    )}
                                    {log.resposta && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Resposta (truncada)</p>
                                            <pre className="text-xs text-gray-300 bg-[#0d1117] rounded-xl p-3 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                {log.resposta.slice(0, 1000)}
                                                {log.resposta.length > 1000 && '...'}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    )
}
