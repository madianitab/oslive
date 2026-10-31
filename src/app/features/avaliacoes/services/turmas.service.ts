import { Injectable, inject } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';

export interface Turma {
  id: number;
  nome: string;
  professor_email: string | null;
  alunos: number;
  criado_em: string;
}

export interface AlunoTurma {
  email: string;
  nome: string | null;
  /** O e-mail já entrou no OSLive pelo menos uma vez. */
  entrou: boolean;
  incluido_em: string;
}

/**
 * Turmas e matrícula por e-mail (tabelas turmas e turma_alunos).
 * Toda alteração passa por funções do banco, que conferem o papel de quem chama.
 */
@Injectable()
export class TurmasService {
  private readonly auth = inject(AuthService);

  /** Turmas que a pessoa gerencia (admin: todas; professor: as dele). */
  async listar(): Promise<Turma[]> {
    return this.rpc<Turma[]>('listar_turmas');
  }

  /** Turmas em que o e-mail de quem está logado foi incluído. */
  async minhas(): Promise<{ id: number; nome: string }[]> {
    const sb = await this.auth.db();
    const email = (this.auth.usuario()?.email ?? '').toLowerCase();
    const { data, error } = await sb
      .from('turma_alunos')
      .select('turmas(id, nome)')
      .eq('email', email);
    if (error) throw error;
    return (data ?? [])
      .map(l => l.turmas as unknown as { id: number; nome: string } | null)
      .filter((t): t is { id: number; nome: string } => !!t);
  }

  criar(nome: string): Promise<number> {
    return this.rpc<number>('criar_turma', { nome_turma: nome.trim() });
  }

  renomear(id: number, nome: string): Promise<void> {
    return this.rpc<void>('renomear_turma', { t: id, nome_turma: nome.trim() });
  }

  excluir(id: number): Promise<void> {
    return this.rpc<void>('excluir_turma', { t: id });
  }

  alunos(id: number): Promise<AlunoTurma[]> {
    return this.rpc<AlunoTurma[]>('alunos_da_turma', { t: id });
  }

  /** Devolve quantos e-mails novos entraram (os repetidos são ignorados). */
  matricular(id: number, emails: string[]): Promise<number> {
    return this.rpc<number>('matricular', { t: id, emails });
  }

  desmatricular(id: number, email: string): Promise<void> {
    return this.rpc<void>('desmatricular', { t: id, email_aluno: email });
  }

  private async rpc<T>(funcao: string, args?: Record<string, unknown>): Promise<T> {
    const sb = await this.auth.db();
    const { data, error } = await sb.rpc(funcao, args);
    if (error) throw new Error(error.message);
    return (data ?? []) as T;
  }
}
