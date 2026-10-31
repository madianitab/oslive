import { Injectable, inject } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ItemModelo, QuestaoPublica, RespostasProva } from '../questoes/tipos';

/** Avaliação como a professora vê (sem a senha). */
export interface Avaliacao {
  id: number;
  turma_id: number;
  turma: string;
  titulo: string;
  inicio: string;
  fim: string;
  duracao_min: number;
  valor_total: number;
  modelo: ItemModelo[];
  liberada: boolean;
  iniciadas: number;
  enviadas: number;
}

export type SituacaoAluno = 'em_breve' | 'aberta' | 'em_andamento' | 'tempo_esgotado' | 'enviada' | 'encerrada';

export interface AvaliacaoAluno {
  id: number;
  titulo: string;
  turma: string;
  inicio: string;
  fim: string;
  duracao_min: number;
  questoes: number;
  situacao: SituacaoAluno;
  prazo: string | null;
}

export interface NovaAvaliacao {
  id: number | null;
  turma_id: number;
  titulo: string;
  inicio: string;
  fim: string;
  duracao_min: number;
  valor_total: number;
  modelo: ItemModelo[];
  /** null ao editar = mantém a senha atual */
  senha: string | null;
  liberada: boolean;
}

export type SituacaoTentativa = 'nao_iniciou' | 'em_andamento' | 'tempo_esgotado' | 'enviada';

/** Uma linha do painel de resultados (um aluno da turma). */
export interface ResultadoAluno {
  tentativa: number | null;
  email: string;
  nome: string | null;
  situacao: SituacaoTentativa;
  iniciada_em: string | null;
  prazo: string | null;
  enviada_em: string | null;
  envio: 'aluno' | 'tempo' | null;
  nota: number | null;
  ip_inicio: string | null;
  ip_envio: string | null;
  navegador: string | null;
  notas_questoes: number[] | null;
}

/** Prova de um aluno para revisão (só professor e admin). */
export interface DetalheTentativa {
  id: number;
  email: string;
  semente: string;
  modelo: ItemModelo[];
  valor_total: number;
  respostas: RespostasProva;
  correcao: { questoes: { nota: number; valor: number; acertos: number; total: number; campos: Record<string, boolean> }[] } | null;
  nota: number | null;
  iniciada_em: string;
  prazo: string;
  enviada_em: string | null;
  envio: 'aluno' | 'tempo' | null;
}

export interface ProvaAberta {
  tentativa: number;
  titulo: string;
  prazo: string;
  /** Hora do servidor no início (para o relógio não depender do relógio do computador). */
  agora: string;
  valor_total: number;
  questoes: QuestaoPublica[];
  respostas: RespostasProva;
}

/**
 * Avaliações: a professora cria pelas funções do banco (RLS);
 * o aluno faz a prova pela função "avaliacao" do Supabase, que gera e corrige no servidor.
 */
@Injectable()
export class AvaliacoesService {
  private readonly auth = inject(AuthService);

  // ───────── professora ─────────

  listar(): Promise<Avaliacao[]> {
    return this.rpc<Avaliacao[]>('listar_avaliacoes');
  }

  salvar(a: NovaAvaliacao): Promise<number> {
    return this.rpc<number>('salvar_avaliacao', {
      p_id: a.id, p_turma: a.turma_id, p_titulo: a.titulo.trim(), p_inicio: a.inicio, p_fim: a.fim,
      p_duracao: a.duracao_min, p_valor: a.valor_total, p_modelo: a.modelo, p_senha: a.senha, p_liberada: a.liberada,
    });
  }

  excluir(id: number): Promise<void> {
    return this.rpc<void>('excluir_avaliacao', { p_id: id });
  }

  resultados(avaliacao: number): Promise<ResultadoAluno[]> {
    return this.rpc<ResultadoAluno[]>('resultados_avaliacao', { p_avaliacao: avaliacao });
  }

  detalhe(tentativa: number): Promise<DetalheTentativa> {
    return this.rpc<DetalheTentativa>('tentativa_detalhe', { p_tentativa: tentativa });
  }

  /** Encerra com as respostas salvas uma prova cujo tempo acabou sem envio. */
  encerrarPorTempo(tentativa: number, nota: number, correcao: unknown): Promise<void> {
    return this.rpc<void>('encerrar_por_tempo', { p_tentativa: tentativa, p_nota: nota, p_correcao: correcao });
  }

  /** Apaga a tentativa do aluno para ele poder fazer de novo (ex.: problema técnico). */
  liberarNovaTentativa(tentativa: number): Promise<void> {
    return this.rpc<void>('liberar_nova_tentativa', { p_tentativa: tentativa });
  }

  // ───────── aluno ─────────

  minhas(): Promise<AvaliacaoAluno[]> {
    return this.rpc<AvaliacaoAluno[]>('minhas_avaliacoes');
  }

  iniciar(avaliacao: number, senha: string): Promise<ProvaAberta> {
    return this.funcao<ProvaAberta>({ acao: 'iniciar', avaliacao, senha });
  }

  salvarRespostas(tentativa: number, respostas: RespostasProva): Promise<{ salva_em: string }> {
    return this.funcao({ acao: 'salvar', tentativa, respostas });
  }

  enviar(tentativa: number, respostas: RespostasProva): Promise<void> {
    return this.funcao({ acao: 'enviar', tentativa, respostas });
  }

  // ───────── internos ─────────

  private async rpc<T>(funcao: string, args?: Record<string, unknown>): Promise<T> {
    const sb = await this.auth.db();
    const { data, error } = await sb.rpc(funcao, args);
    if (error) throw new Error(error.message);
    return (data ?? []) as T;
  }

  private async funcao<T>(corpo: Record<string, unknown>): Promise<T> {
    const sb = await this.auth.db();
    const { data, error } = await sb.functions.invoke('avaliacao', { body: corpo });
    if (error) {
      // a função devolve { erro: "mensagem" } nos erros previstos
      const ctx = (error as { context?: Response }).context;
      const corpoErro = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
      throw new Error(corpoErro?.erro ?? 'Não foi possível falar com o servidor da prova. Tente de novo.');
    }
    return data as T;
  }
}
