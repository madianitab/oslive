import { Component, computed } from '@angular/core';
import { NgStyle, NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { binario } from 'src/app/features/paginacao/services/simulador-paginacao-simples.service';
import {
  BITS_DESLOCAMENTO,
  BITS_PAGINA,
  BITS_QUADRO,
  ByteMemoria,
  Correcao,
  ExercicioPaginacaoSimplesService,
  PerguntaTraducao,
  ProcessoExSimples,
  TIPOS_EXERCICIO_SIMPLES,
  enderecoFisico,
  enderecoLogico,
  fragmentacaoInterna,
  paginasNecessarias,
} from 'src/app/features/paginacao/services/exercicio-paginacao-simples.service';

@Component({
  selector: 'app-area-exercicio-paginacao-simples',
  templateUrl: './area-exercicio-paginacao-simples.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-exercicio-paginacao-simples.component.css'],
  standalone: true,
  imports: [NgStyle, NgClass, NgTemplateOutlet, FormsModule, OsStatComponent, OsButtonComponent],
})
export class AreaExercicioPaginacaoSimplesComponent {
  public readonly bin = binario;
  public readonly bitsPagina = BITS_PAGINA;
  public readonly bitsQuadro = BITS_QUADRO;
  public readonly bitsDesloc = BITS_DESLOCAMENTO;
  public readonly endLogico = enderecoLogico;
  public readonly endFisico = enderecoFisico;
  public readonly nPaginas = paginasNecessarias;
  public readonly sobra = fragmentacaoInterna;
  public readonly opcoesQuadro = [0, 1, 2, 3, 4, 5, 6, 7].map(q => binario(q, BITS_QUADRO));

  readonly nomeTipo = computed(() => {
    const curtos: Record<string, string> = {
      TRADUCAO: 'Tradução', MEMORIA_FISICA: 'Memória física', TABELA: 'Tabela de páginas', CALCULOS: 'Cálculos',
    };
    return curtos[this.ex.tipo()];
  });
  readonly descricao = computed(() => TIPOS_EXERCICIO_SIMPLES.find(t => t.valor === this.ex.tipo())?.descricao ?? '');
  readonly percentual = computed(() => {
    const p = this.ex.placar();
    return p && p.total ? Math.round((p.acertos / p.total) * 100) : 0;
  });

  /** Memória física em duas colunas de 16 bytes. */
  readonly metades = computed(() => {
    const m = this.ex.memoria();
    return [m.slice(0, m.length / 2), m.slice(m.length / 2)];
  });

  readonly alvo = computed(() => this.ex.processos()[this.ex.alvoMemoria()] ?? null);
  readonly primeiro = computed(() => this.ex.processos()[0] ?? null);
  readonly outros = computed(() => this.ex.processos().slice(1));

  constructor(public ex: ExercicioPaginacaoSimplesService) {}

  classe(c: Correcao): Record<string, boolean> {
    return { acerto: c === true, erro: c === false };
  }

  corPagina(p: ProcessoExSimples, pagina: number): string {
    return pagina % 2 === 0 ? p.cor : p.cor + 'B3';
  }

  corByte(b: ByteMemoria): string | null {
    return b.processo && b.pagina !== null ? this.corPagina(b.processo, b.pagina) : null;
  }

  paginasDo(p: ProcessoExSimples): number[] {
    return p.quadros.map((_, i) => i);
  }

  /** Entradas da tabela (2 bits = 4 páginas) fora do espaço lógico do processo: bit I. */
  invalidas(p: ProcessoExSimples): number[] {
    return [0, 1, 2, 3].filter(i => i >= p.quadros.length);
  }

  bytesLogicos(p: ProcessoExSimples): { pagina: number; desloc: number; conteudo: string | null }[] {
    const out = [];
    for (let i = 0; i < p.quadros.length * 4; i++) {
      out.push({ pagina: Math.floor(i / 4), desloc: i % 4, conteudo: i < p.bytes ? `${p.nome}${i}` : null });
    }
    return out;
  }


  byteDaPergunta(q: PerguntaTraducao): string {
    return `${q.processo.nome}${q.pagina * 4 + q.deslocamento}`;
  }

  respostaMemoria(b: ByteMemoria): string {
    return this.ex.respostasMemoria()[`${b.quadro}-${b.deslocamento}`] ?? '';
  }

  respostaCalculo(chave: string): string {
    return this.ex.respostasCalculo()[chave] ?? '';
  }
}
