import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';

export const TAMANHO_PAGINA = 4;          // bytes por página/quadro
export const QUANTIDADE_QUADROS = 8;      // memória física de 32 bytes
export const MAX_BYTES_PROCESSO = 16;     // até 4 páginas por processo
export const NOMES_PROCESSOS_SIMPLES = ['A', 'B', 'C', 'D', 'E', 'F'];

const BITS_PAGINA = 2;       // 4 páginas lógicas
const BITS_QUADRO = 3;       // 8 quadros
const BITS_DESLOCAMENTO = 2; // 4 bytes por página

export interface ProcessoSimples {
  nome: string;
  bytes: number;
  cor: string;
  /** quadros[i] = quadro físico onde está a página lógica i */
  quadros: number[];
}

export interface ByteLogico {
  pagina: number;
  deslocamento: number;
  conteudo: string | null; // null = fragmentação interna
}

export interface ByteFisico {
  quadro: number;
  deslocamento: number;
  processo: ProcessoSimples | null;
  pagina: number | null;
  conteudo: string | null;
}

export interface Traducao {
  processo: string;
  pagina: number;
  deslocamento: number;
  quadro: number;
}

export function binario(valor: number, bits: number): string {
  return valor.toString(2).padStart(bits, '0');
}

@Injectable()
export class SimuladorPaginacaoSimplesService {

  readonly processos = signal<ProcessoSimples[]>([]);
  readonly selecionado = signal<string | null>(null);
  readonly traducao = signal<Traducao | null>(null);

  readonly bitsPagina = BITS_PAGINA;
  readonly bitsQuadro = BITS_QUADRO;
  readonly bitsDeslocamento = BITS_DESLOCAMENTO;

  /** Dono de cada quadro físico (null = livre). */
  readonly ocupacao = computed(() => {
    const ocupacao: ({ processo: ProcessoSimples; pagina: number } | null)[] = Array(QUANTIDADE_QUADROS).fill(null);
    this.processos().forEach(p => p.quadros.forEach((q, pagina) => ocupacao[q] = { processo: p, pagina }));
    return ocupacao;
  });

  readonly quadrosLivres = computed(() => this.ocupacao().filter(o => o === null).length);

  readonly bytesLivres = computed(() => this.quadrosLivres() * TAMANHO_PAGINA);

  readonly fragmentacaoInterna = computed(() =>
    this.processos().reduce((total, p) => total + p.quadros.length * TAMANHO_PAGINA - p.bytes, 0));

  readonly nomesDisponiveis = computed(() =>
    NOMES_PROCESSOS_SIMPLES.filter(n => !this.processos().some(p => p.nome === n)));

  readonly processoSelecionado = computed(() =>
    this.processos().find(p => p.nome === this.selecionado()) ?? null);

  readonly memoriaFisica = computed<ByteFisico[]>(() => {
    const bytes: ByteFisico[] = [];
    this.ocupacao().forEach((dono, quadro) => {
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

  paginasNecessarias(bytes: number): number {
    return Math.ceil(bytes / TAMANHO_PAGINA);
  }

  memoriaLogica(p: ProcessoSimples): ByteLogico[] {
    const bytes: ByteLogico[] = [];
    for (let i = 0; i < p.quadros.length * TAMANHO_PAGINA; i++) {
      bytes.push({
        pagina: Math.floor(i / TAMANHO_PAGINA),
        deslocamento: i % TAMANHO_PAGINA,
        conteudo: i < p.bytes ? `${p.nome}${i}` : null,
      });
    }
    return bytes;
  }

  criarProcesso(nome: string, bytes: number): string | null {
    if (!nome) return 'Selecione o nome do processo.';
    if (this.processos().some(p => p.nome === nome)) return 'Processo já existe!';
    if (!Number.isInteger(bytes) || bytes < 1 || bytes > MAX_BYTES_PROCESSO) {
      return `O tamanho do processo deve ser de 1 a ${MAX_BYTES_PROCESSO} bytes (até 4 páginas).`;
    }
    const paginas = this.paginasNecessarias(bytes);
    if (paginas > this.quadrosLivres()) {
      return `Memória insuficiente: o processo precisa de ${paginas} quadro(s) e há ${this.quadrosLivres()} livre(s) (${this.bytesLivres()} bytes).`;
    }

    const livres = this.ocupacao().map((o, i) => o === null ? i : -1).filter(i => i >= 0);
    const processo: ProcessoSimples = {
      nome,
      bytes,
      cor: gera_cor(this.processos()),
      quadros: livres.slice(0, paginas),
    };
    this.processos.update(lista => [...lista, processo].sort((a, b) => a.nome.localeCompare(b.nome)));
    this.selecionado.set(nome);
    this.traducao.set(null);
    return null;
  }

  removerProcesso(nome: string): void {
    this.processos.update(lista => lista.filter(p => p.nome !== nome));
    if (this.selecionado() === nome) {
      this.selecionado.set(this.processos()[0]?.nome ?? null);
    }
    if (this.traducao()?.processo === nome) this.traducao.set(null);
  }

  gerarAleatorio(): void {
    this.reiniciar();
    for (const nome of NOMES_PROCESSOS_SIMPLES) {
      if (this.quadrosLivres() === 0) break;
      const maxBytes = Math.min(MAX_BYTES_PROCESSO, this.bytesLivres());
      const bytes = Math.floor(Math.random() * maxBytes) + 1;
      this.criarProcesso(nome, bytes);
    }
    this.selecionado.set(this.processos()[0]?.nome ?? null);
  }

  selecionar(nome: string): void {
    this.selecionado.set(nome);
    this.traducao.set(null);
  }

  traduzir(p: ProcessoSimples, b: ByteLogico): void {
    this.traducao.set({ processo: p.nome, pagina: b.pagina, deslocamento: b.deslocamento, quadro: p.quadros[b.pagina] });
  }

  reiniciar(): void {
    this.processos.set([]);
    this.selecionado.set(null);
    this.traducao.set(null);
  }
}
