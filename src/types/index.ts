// =====================================================
// Tipos globais — Sistema de Torneio de Vôlei v5
// =====================================================

// ----- Jogador -----

export type Genero = 'masculino' | 'feminino' | 'nao_informado'
// Aliases para compatibilidade com banco antigo (M/F)
export type GeneroDB = 'M' | 'F' | 'masculino' | 'feminino' | 'nao_informado'

export type Posicao = 'libero' | 'levantador' | 'ponteiro' | 'central' | 'oposto' | null

export interface Jogador {
    id: string
    nome: string
    apelido?: string | null
    email?: string | null
    whatsapp?: string | null
    genero: GeneroDB
    posicao?: Posicao
    foto_url?: string | null
    equipe_id?: string | null
    cabeca_de_chave: boolean
    is_cabeca_de_chave?: boolean
    lista_espera?: boolean
    created_at: string
}

// ----- Equipe (Time) -----

// ColocacaoFinal aceita qualquer número como string (N times dinâmico)
export type ColocacaoFinal = string | null

export interface Equipe {
    id: string
    nome: string
    logo_url?: string | null
    posicao?: string | null
    seed?: number | null
    num_derrotas?: number
    eliminado?: boolean
    colocacao_final?: ColocacaoFinal | string | null
    misto_valido?: boolean
    total_masculino?: number
    total_feminino?: number
    total_nao_informado?: number
    jogadores?: Jogador[]
    created_at: string
}

// ----- Jogo -----

export type StatusJogo = 'aguardando' | 'em_andamento' | 'finalizado'
export type ChaveJogo = 'vencedores' | 'repescagem' | 'semifinal' | 'final' | 'decisivo' | 'desempate'

export interface Jogo {
    id: number
    numero_jogo?: number | null
    rodada: string
    tipo?: string
    chave?: ChaveJogo | string
    is_bye?: boolean
    label?: string
    descricao?: string | null
    ordem_exibicao?: number | null
    equipe_a_id: string | null
    equipe_b_id: string | null
    vencedor_id: string | null
    perdedor_id: string | null
    placar_a: number | null
    placar_b: number | null
    status: StatusJogo
    proximo_jogo_vencedor_id?: number | null
    proximo_jogo_perdedor_id?: number | null
    slot_vencedor?: 'equipe_a_id' | 'equipe_b_id' | null
    slot_perdedor?: 'equipe_a_id' | 'equipe_b_id' | null
    updated_at: string
    equipe_a?: Equipe | null
    equipe_b?: Equipe | null
    vencedor?: Equipe | null
    perdedor?: Equipe | null
}

// ----- TorneioConfig -----

export type FaseAtual =
    | 'inscricoes'
    | 'configuracao'
    | 'divisao_ia'
    | 'sorteio'
    | 'geracao_ia'
    | 'em_andamento'
    | 'grande_final'
    | 'encerrado'
    | string  // aceita valorés livres do banco

export interface TorneioConfig {
    id: number
    nome?: string
    data_evento?: string | null
    inscricoes_abertas?: boolean
    jogadores_por_time?: number | null
    num_times_definido?: number | null
    times_formados?: boolean
    chaveamento_gerado: boolean
    ao_vivo: boolean
    fase_atual: FaseAtual | string | null
    campeao_id?: string | null
    bracket_resumo_ia?: string | null
    updated_at?: string
    campeao?: Equipe | null
}

// =====================================================
// Tipos de IA
// =====================================================

// --- Divisão de Times ---

export interface JogadorIA {
    id: string
    nome: string
    genero: string
    posicao?: string | null
    cabeca_de_chave?: boolean
}

export interface TimeComCabeca {
    id: string
    nome: string
    cabeca_de_chave: JogadorIA
}

export interface TimeDistribuido {
    id: string
    jogadores: (JogadorIA & { cabeca_de_chave: boolean })[]
    resumo_genero: { masculino: number; feminino: number; nao_informado: number }
    misto_valido: boolean
}

export interface DistribuicaoTimes {
    times: TimeDistribuido[]
    lista_espera: JogadorIA[]
    justificativa: string
    avisos: string[]
}

// --- Geração de Bracket ---

export interface ProximoJogo {
    numero_jogo: number
    slot: 'a' | 'b'
}

export interface JogoIA {
    numero_jogo: number
    rodada: number
    chave: ChaveJogo | string
    is_bye: boolean
    time_a_id: string | null
    time_b_id: string | null
    proximo_jogo_vencedor: ProximoJogo | null
    proximo_jogo_perdedor: ProximoJogo | null
    descricao: string
}

export interface ColocacaoIA {
    posicao: number
    descricao: string
}

export interface ValidacoesIA {
    todos_times_jogam_minimo_2: boolean
    nenhum_confronto_repetido_precocemente: boolean
    grande_final_correta: boolean
    jogo_decisivo_necessario: boolean
}

export interface BracketCompleto {
    total_times: number
    total_jogos: number
    tem_jogo_decisivo: boolean
    resumo: string
    jogos: JogoIA[]
    colocacoes: ColocacaoIA[]
    ordem_sugerida_jogos: number[]
    validacoes: ValidacoesIA
}

// --- Log de IA ---

export type TipoChamadaIA = 'divisao_times' | 'geracao_torneio' | 'retry'

export interface IALog {
    id?: string
    tipo_chamada: TipoChamadaIA
    modelo_usado: string
    prompt_sistema: string
    prompt_usuario: string
    resposta?: string
    tokens_entrada?: number
    tokens_saida?: number
    tentativa: number
    sucesso: boolean
    erro_validacao?: string | null
    duracao_ms?: number
    created_at?: string
}

// --- Configuração ---

export interface OpcaoFormacao {
    numTimes: number
    porTime: number
    listaEspera: number
    mistoGarantido: boolean
}

export interface ResultadoValidacao {
    valido: boolean
    erros: string[]
}

export interface ConfigTorneio {
    numTimes: number
    porTime: number
}
