import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import { QUANTIDADE_QUADROS, TAMANHO_PAGINA, binario } from '../models/paginacao-simples';
import {
  BITS_DESLOCAMENTO,
  BITS_PAGINA,
  BITS_QUADRO,
  ByteMemoria,
  Correcao,
  NOMES_EXERCICIO_SIMPLES,
  PerguntaTraducao,
  ProcessoExSimples,
  QUANTIDADE_PERGUNTAS_TRADUCAO,
  QUANTIDADE_PROCESSOS_EXERCICIO,
  TIPOS_EXERCICIO_SIMPLES,
  TipoExercicioSimples,
  enderecoFisico,
  enderecoLogico,
  fragmentacaoInterna,
  gerarPaginacaoSimples,
  normalizarBinario,
  paginasNecessarias,
} from '../models/exercicio-paginacao-simples';

export {
  TIPOS_EXERCICIO_SIMPLES,
  NOMES_EXERCICIO_SIMPLES,
  QUANTIDADE_PROCESSOS_EXERCICIO,
  QUANTIDADE_PERGUNTAS_TRADUCAO,
  BITS_PAGINA,
  BITS_QUADRO,
  BITS_DESLOCAMENTO,
  paginasNecessarias,
  fragmentacaoInterna,
  enderecoLogico,
  enderecoFisico,
  normalizarBinario,
} from '../models/exercicio-paginacao-simples';
export type {
  TipoExercicioSimples,
  ProcessoExSimples,
  PerguntaTraducao,
  ByteMemoria,
  Correcao,
} from '../models/exercicio-paginacao-simples';

@Injectable()
export class ExercicioPaginacaoSimplesService {

  readonly tipo = signal<TipoExercicioSimples>('TRADUCAO');
  readonly processos = signal<ProcessoExSimples[]>([]);
  /** Processo cujas lacunas estão na memória física (exercício 2). */
  readonly alvoMemoria = signal<number>(0);
  readonly perguntas = signal<PerguntaTraducao[]>([]);

  // respostas
  readonly respostasTraducao = signal<string[]>([]);
  readonly respostasMemoria = signal<Record<string, string>>({}); // chave "quadro-desloc", texto digitado
  readonly respostasTabela = signal<string[]>([]);                // quadro (binário) por página do 1º processo
  readonly respostasCalculo = signal<Record<string, string>>({});  // "A-paginas", "A-sobra", "livre", "quadros"

  readonly corrigido = signal(false);
  readonly mostrarResposta = signal(false);

  readonly gerado = computed(() => this.processos().length > 0);

  readonly memoria = computed<ByteMemoria[]>(() => {
    const donos: ({ processo: ProcessoExSimples; pagina: number } | null)[] = Array(QUANTIDADE_QUADROS).fill(null);
    this.processos().forEach(p => p.quadros.forEach((q, pagina) => donos[q] = { processo: p, pagina }));
    const bytes: ByteMemoria[] = [];
    donos.forEach((dono, quadro) => {
      for (let d = 0; d < TAMANHO_PAGINA; d++) {
        const indice = dono ? dono.pagina * TAMANHO_PAGINA + d : -1;
        bytes.push({
          quadro,
          deslocamento: d,
          processo: dono?.processo ?? null,
          pagina: dono?.pagina ?? null,
          conteudo: dono && indice < dono.processo.bytes ? `${dono.processo.nome}${indice}` : null,
        });
      }
    });
    return bytes;
  });

  readonly quadrosOcupados = computed(() => this.processos().reduce((t, p) => t + p.quadros.length, 0));
  readonly bytesLivres = computed(() => (QUANTIDADE_QUADROS - this.quadrosOcupados()) * TAMANHO_PAGINA);

  readonly placar = computed(() => this.calcularPlacar());

  // ───────────────────────── configuração ─────────────────────────

  definirTipo(tipo: TipoExercicioSimples): void {
    this.tipo.set(tipo);
    if (this.gerado()) this.gerar();
  }

  /** Três processos com tamanhos aleatórios (regras em models/exercicio-paginacao-simples.ts). */
  gerar(): void {
    const ex = gerarPaginacaoSimples(this.tipo());
    const processos: ProcessoExSimples[] = [];
    ex.processos.forEach(p => processos.push({ ...p, cor: gera_cor(processos) }));
    // as perguntas apontam para os mesmos objetos de processo (agora com cor)
    this.processos.set(processos);
    this.alvoMemoria.set(ex.alvoMemoria);
    this.perguntas.set(ex.perguntas.map(q => ({ ...q, processo: processos[ex.processos.indexOf(q.processo)] })));
    this.limparRespostas();
  }

  limparRespostas(): void {
    this.respostasTraducao.set(Array(this.perguntas().length).fill(''));
    this.respostasMemoria.set({});
    this.respostasTabela.set(Array(this.processos()[0]?.quadros.length ?? 0).fill(''));
    this.respostasCalculo.set({});
    this.corrigido.set(false);
    this.mostrarResposta.set(false);
  }

  // ───────────────────────── respostas ─────────────────────────

  responderTraducao(i: number, valor: string): void {
    this.respostasTraducao.update(r => r.map((v, k) => k === i ? valor : v));
    this.corrigido.set(false);
  }

  responderMemoria(b: ByteMemoria, valor: string): void {
    this.respostasMemoria.update(r => ({ ...r, [`${b.quadro}-${b.deslocamento}`]: valor }));
    this.corrigido.set(false);
  }

  responderTabela(pagina: number, valor: string): void {
    this.respostasTabela.update(r => r.map((v, k) => k === pagina ? valor : v));
    this.corrigido.set(false);
  }

  responderCalculo(chave: string, valor: string): void {
    this.respostasCalculo.update(r => ({ ...r, [chave]: valor }));
    this.corrigido.set(false);
  }

  corrigir(): void { this.corrigido.set(true); }
  alternarResposta(): void { this.mostrarResposta.update(v => !v); }

  // ───────────────────────── gabarito e correção ─────────────────────────

  /** Byte que pertence ao processo do exercício 2 (onde o aluno deve escrever algo). */
  ehLacuna(b: ByteMemoria): boolean {
    return this.tipo() === 'MEMORIA_FISICA' && b.processo === this.processos()[this.alvoMemoria()];
  }

  /**
   * Exercício 2: os quadros dos outros processos aparecem ocupados; todos os demais
   * (os do processo a alocar e os realmente livres) ficam em branco e editáveis,
   * para o aluno decidir onde escrever cada byte.
   */
  ehEditavel(b: ByteMemoria): boolean {
    return this.tipo() === 'MEMORIA_FISICA' && (b.processo === null || this.ehLacuna(b));
  }

  /** Resposta esperada em cada endereço: o byte (ou "sobra") do processo-alvo; vazio nos demais. */
  respostaEsperadaMemoria(b: ByteMemoria): string {
    if (!this.ehLacuna(b)) return '';
    return b.conteudo ?? 'sobra';
  }

  private normalizarByte(valor: string | null | undefined): string {
    const v = (valor ?? '').trim().toUpperCase();
    return v === 'SOBRA' ? 'sobra' : v;
  }

  gabaritoTraducao(p: PerguntaTraducao): string {
    return enderecoFisico(p.processo.quadros[p.pagina], p.deslocamento);
  }

  corretoTraducao(i: number): Correcao {
    if (!this.corrigido()) return null;
    return normalizarBinario(this.respostasTraducao()[i]) === this.gabaritoTraducao(this.perguntas()[i]);
  }

  corretoMemoria(b: ByteMemoria): Correcao {
    if (!this.corrigido()) return null;
    const resposta = this.normalizarByte(this.respostasMemoria()[`${b.quadro}-${b.deslocamento}`]);
    const esperado = this.respostaEsperadaMemoria(b);
    // endereço que deve ficar livre: só é marcado se o aluno escreveu algo nele
    if (esperado === '') return resposta === '' ? null : false;
    return resposta === this.normalizarByte(esperado);
  }

  corretoTabela(pagina: number): Correcao {
    if (!this.corrigido()) return null;
    const p = this.processos()[0];
    return normalizarBinario(this.respostasTabela()[pagina]) === binario(p.quadros[pagina], BITS_QUADRO);
  }

  gabaritoCalculo(chave: string): number {
    if (chave === 'livre') return this.bytesLivres();
    if (chave === 'quadros') return this.quadrosOcupados();
    const [nome, campo] = chave.split('-');
    const p = this.processos().find(x => x.nome === nome)!;
    return campo === 'paginas' ? paginasNecessarias(p.bytes) : fragmentacaoInterna(p.bytes);
  }

  corretoCalculo(chave: string): Correcao {
    if (!this.corrigido()) return null;
    const r = (this.respostasCalculo()[chave] ?? '').trim();
    return r !== '' && Number(r) === this.gabaritoCalculo(chave);
  }

  chavesCalculo(): string[] {
    return [
      ...this.processos().flatMap(p => [`${p.nome}-paginas`, `${p.nome}-sobra`]),
      'quadros',
      'livre',
    ];
  }

  private calcularPlacar(): { acertos: number; total: number } | null {
    if (!this.corrigido() || !this.gerado()) return null;
    let resultados: Correcao[] = [];
    switch (this.tipo()) {
      case 'TRADUCAO':
        resultados = this.perguntas().map((_, i) => this.corretoTraducao(i));
        break;
      case 'MEMORIA_FISICA':
        // conta os bytes do processo e, como erro, o que foi escrito em endereços que deveriam ficar livres
        resultados = this.memoria()
          .map(b => this.corretoMemoria(b))
          .filter((c, i) => this.ehLacuna(this.memoria()[i]) || c === false);
        break;
      case 'TABELA':
        resultados = this.processos()[0].quadros.map((_, i) => this.corretoTabela(i));
        break;
      case 'CALCULOS':
        resultados = this.chavesCalculo().map(c => this.corretoCalculo(c));
        break;
    }
    return { acertos: resultados.filter(r => r === true).length, total: resultados.length };
  }
}
