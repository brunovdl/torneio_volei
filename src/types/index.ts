// Tipos globais da aplicação

export type Posicao = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | null

export type ColocacaoFinal = '1' | '2' | '3' | '4' | '5' | null

export interface Equipe {
    id: string
    nome: string
    responsavel: string
    email: string
    whatsapp: string | null
    logo_url: string | null
    posicao: Posicao
    colocacao_final: ColocacaoFinal
    created_at: string
}

export type StatusJogo = 'aguardando' | 'em_andamento' | 'finalizado'
export type TipoJogo = 'vencedores' | 'repescagem' | 'semifinal' | 'final' | 'desempate'
export type RodadaJogo = 'abertura' | 'segunda' | 'terceira' | 'semifinal' | 'final'

export interface Jogo {
    id: number // 1 a 9
    rodada: RodadaJogo
    tipo: TipoJogo
    equipe_a_id: string | null
    equipe_b_id: string | null
    vencedor_id: string | null
    perdedor_id: string | null
    placar_a: number | null
    placar_b: number | null
    status: StatusJogo
    label: string // ex: "Jogo 1", "Jogo 3 · Chave Vencedores"
    updated_at: string
    equipe_a?: Equipe | null
    equipe_b?: Equipe | null
    vencedor?: Equipe | null
    perdedor?: Equipe | null
}

export interface TorneioConfig {
    id: number
    chaveamento_gerado: boolean
    ao_vivo: boolean
    fase_atual: string | null
    campeao_id: string | null
    campeao?: Equipe | null
}
