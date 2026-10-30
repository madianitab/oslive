import { Injectable, computed, signal } from '@angular/core';
import { AlgoritmoFit } from '../models/particoes';
import {
  AlocadoEx,
  ExercicioAlocacao,
  ExercicioCompactacao,
  ExercicioLacunas,
  embaralhar,
  gerarAlocacao,
  gerarCompactacao,
  gerarLacunas,
} from '../models/exercicios-particoes';

export type TipoExVar = 'ALOCACAO' | 'LACUNAS' | 'COMPACTACAO';

export const TIPOS_EX_VAR: { valor: TipoExVar; nome: string; descricao: string }[] = [
  { valor: 'ALOCACAO', nome: 'Alocação (first, best, worst, circular)',
    descricao: 'Para cada chegada, informe o endereço inicial do processo ou por que ele não cabe. Nos términos, diga se algum processo da fila entra e onde.' },
  { valor: 'LACUNAS', nome: 'Tabela de lacunas',
    descricao: 'A partir dos processos na memória, preencha a tabela de lacunas (início e tamanho), em ordem de endereço. Lacunas vizinhas formam uma só.' },
  { valor: 'COMPACTACAO', nome: 'Compactação',
    descricao: 'Compacte a memória: informe a nova base de cada processo e a lacuna única que sobra no fim.' },
];

export interface RespostaAlocacao {
  resultado: string;  // 'alocado' | 'fragmentacao' | 'insuficiente'
  base: string;
  entra: string;      // 'ninguem' | nome
  baseEntra: string;
}

export interface RespostaLacuna { inicio: string; tamanho: string; }

export type Correcao = boolean | null;

const num = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : NaN;

/** Estado do exercício de partições variáveis (uma instância por visita à tela). */
@Injectable()
export class ExercicioParticoesVariaveisService {
  readonly tipo = signal<TipoExVar>('ALOCACAO');
  readonly algoritmo = signal<AlgoritmoFit>('FIRST');

  readonly alocacao = signal<ExercicioAlocacao | null>(null);
  readonly lacunas = signal<ExercicioLacunas | null>(null);
  readonly compactacao = signal<ExercicioCompactacao | null>(null);
  /** Ordem em que os processos aparecem na tabela (embaralhada nas lacunas). */
  readonly ordemProcessos = signal<AlocadoEx[]>([]);

  readonly respAlocacao = signal<RespostaAlocacao[]>([]);
  readonly respLacunas = signal<RespostaLacuna[]>([]);
  readonly respBases = signal<Record<string, string>>({});
  readonly respLacunaFinal = signal<RespostaLacuna>({ inicio: '', tamanho: '' });

  readonly corrigido = signal(false);
  readonly mostrarResposta = signal(false);

  readonly gerado = computed(() => {
    switch (this.tipo()) {
      case 'ALOCACAO': return this.alocacao() !== null;
      case 'LACUNAS': return this.lacunas() !== null;
      case 'COMPACTACAO': return this.compactacao() !== null;
    }
  });

  /** Processos que podem entrar da fila (os que chegaram no exercício). */
  readonly chegadas = computed(() => (this.alocacao()?.eventos ?? []).flatMap(e => e.tipo === 'chegada' ? [e.processo.nome] : []));

  readonly placar = computed(() => {
    if (!this.corrigido() || !this.gerado()) return null;
    let acertos = 0;
    let total = 0;
    const conta = (c: Correcao) => { total++; if (c) acertos++; };
    switch (this.tipo()) {
      case 'ALOCACAO':
        this.alocacao()!.eventos.forEach((e, i) => {
          if (e.tipo === 'chegada') {
            conta(this.corretoAloc(i, 'resultado'));
            if (e.resultado === 'alocado') conta(this.corretoAloc(i, 'base'));
          } else {
            conta(this.corretoAloc(i, 'entra'));
            if (e.entra) conta(this.corretoAloc(i, 'baseEntra'));
          }
        });
        break;
      case 'LACUNAS': {
        const n = Math.max(this.lacunas()!.lacunas.length, this.respLacunas().length);
        for (let i = 0; i < n; i++) { conta(this.corretoLacuna(i, 'inicio')); conta(this.corretoLacuna(i, 'tamanho')); }
        break;
      }
      case 'COMPACTACAO':
        this.compactacao()!.alocados.forEach(a => conta(this.corretoBase(a.nome)));
        conta(this.corretoLacunaFinal('inicio'));
        conta(this.corretoLacunaFinal('tamanho'));
        break;
    }
    return { acertos, total, percentual: total ? Math.round((acertos / total) * 100) : 0 };
  });

  // ───────────────────────── configuração ─────────────────────────

  definirTipo(t: TipoExVar): void { this.tipo.set(t); this.limpar(); }

  definirAlgoritmo(a: AlgoritmoFit): void {
    this.algoritmo.set(a);
    this.alocacao.set(null);
    this.limpar();
  }

  gerar(): void {
    switch (this.tipo()) {
      case 'ALOCACAO':
        this.alocacao.set(gerarAlocacao(this.algoritmo()));
        break;
      case 'LACUNAS': {
        const ex = gerarLacunas();
        this.lacunas.set(ex);
        this.ordemProcessos.set(embaralhar(ex.alocados));
        break;
      }
      case 'COMPACTACAO': {
        const ex = gerarCompactacao();
        this.compactacao.set(ex);
        this.ordemProcessos.set([...ex.alocados].sort((a, b) => a.base - b.base));
        break;
      }
    }
    this.limpar();
  }

  limpar(): void {
    const n = this.alocacao()?.eventos.length ?? 0;
    this.respAlocacao.set(Array.from({ length: n }, () => ({ resultado: '', base: '', entra: '', baseEntra: '' })));
    this.respLacunas.set([{ inicio: '', tamanho: '' }]);
    this.respBases.set({});
    this.respLacunaFinal.set({ inicio: '', tamanho: '' });
    this.corrigido.set(false);
    this.mostrarResposta.set(false);
  }

  corrigir(): void { this.corrigido.set(true); }
  alternarResposta(): void { this.mostrarResposta.update(v => !v); }

  // ───────────────────────── respostas ─────────────────────────

  responderAloc(i: number, campo: keyof RespostaAlocacao, v: string): void {
    this.respAlocacao.update(l => l.map((r, k) => k === i ? { ...r, [campo]: String(v ?? '').trim() } : r));
    this.corrigido.set(false);
  }

  responderLacuna(i: number, campo: keyof RespostaLacuna, v: string): void {
    this.respLacunas.update(l => l.map((r, k) => k === i ? { ...r, [campo]: String(v ?? '').trim() } : r));
    this.corrigido.set(false);
  }

  adicionarLacuna(): void {
    if (this.respLacunas().length >= 8) return;
    this.respLacunas.update(l => [...l, { inicio: '', tamanho: '' }]);
    this.corrigido.set(false);
  }

  removerLacuna(i: number): void {
    this.respLacunas.update(l => l.length > 1 ? l.filter((_, k) => k !== i) : l);
    this.corrigido.set(false);
  }

  responderBase(nome: string, v: string): void {
    this.respBases.update(b => ({ ...b, [nome]: String(v ?? '').trim() }));
    this.corrigido.set(false);
  }

  responderLacunaFinal(campo: keyof RespostaLacuna, v: string): void {
    this.respLacunaFinal.update(r => ({ ...r, [campo]: String(v ?? '').trim() }));
    this.corrigido.set(false);
  }

  // ───────────────────────── correção ─────────────────────────

  esperadoAloc(i: number, campo: keyof RespostaAlocacao): string {
    const e = this.alocacao()!.eventos[i];
    if (e.tipo === 'chegada') {
      if (campo === 'resultado') return e.resultado;
      if (campo === 'base') return e.base === null ? '—' : String(e.base);
      return '';
    }
    if (campo === 'entra') return e.entra ? e.entra.nome : 'ninguem';
    if (campo === 'baseEntra') return e.baseEntra === null ? '—' : String(e.baseEntra);
    return '';
  }

  corretoAloc(i: number, campo: keyof RespostaAlocacao): Correcao {
    if (!this.corrigido() || !this.alocacao()) return null;
    const r = this.respAlocacao()[i][campo];
    const esp = this.esperadoAloc(i, campo);
    if (campo === 'base' || campo === 'baseEntra') return num(r) === Number(esp);
    return r === esp;
  }

  corretoLacuna(i: number, campo: keyof RespostaLacuna): Correcao {
    if (!this.corrigido() || !this.lacunas()) return null;
    const esp = this.lacunas()!.lacunas[i];
    const r = this.respLacunas()[i];
    if (!esp || !r) return false;
    return num(r[campo]) === esp[campo];
  }

  corretoBase(nome: string): Correcao {
    if (!this.corrigido() || !this.compactacao()) return null;
    return num(this.respBases()[nome] ?? '') === this.compactacao()!.novasBases[nome];
  }

  corretoLacunaFinal(campo: keyof RespostaLacuna): Correcao {
    if (!this.corrigido() || !this.compactacao()) return null;
    return num(this.respLacunaFinal()[campo]) === this.compactacao()!.lacunaFinal[campo];
  }
}
