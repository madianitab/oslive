import { Component, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import {
  ByteFisico,
  ByteLogico,
  ProcessoSimples,
  QUANTIDADE_QUADROS,
  SimuladorPaginacaoSimplesService,
  TAMANHO_PAGINA,
  binario,
} from 'src/app/features/paginacao/services/simulador-paginacao-simples.service';

@Component({
  selector: 'app-area-simulador-paginacao-simples',
  templateUrl: './area-simulador-paginacao-simples.component.html',
  styleUrls: [
    '../../../../../ui/styles/sim-viz.css',
    './area-simulador-paginacao-simples.component.css',
  ],
  standalone: true,
  imports: [NgStyle, OsStatComponent],
})
export class AreaSimuladorPaginacaoSimplesComponent {

  public readonly tamanhoPagina = TAMANHO_PAGINA;
  public readonly quadros = QUANTIDADE_QUADROS;
  public readonly bin = binario;

  /** Memória física dividida em duas colunas de 16 bytes. */
  public readonly metades = computed(() => {
    const mf = this.sim.memoriaFisica();
    const meio = mf.length / 2;
    return [mf.slice(0, meio), mf.slice(meio)];
  });

  constructor(public sim: SimuladorPaginacaoSimplesService) {}

  /** Páginas pares com a cor cheia e ímpares mais claras, para distinguir as páginas. */
  corPagina(p: ProcessoSimples, pagina: number): string {
    return pagina % 2 === 0 ? p.cor : p.cor + 'B3';
  }

  corByteFisico(b: ByteFisico): string | null {
    if (!b.processo || b.pagina === null) return null;
    return this.corPagina(b.processo, b.pagina);
  }

  enderecoLogico(b: ByteLogico): string {
    return this.bin(b.pagina, this.sim.bitsPagina) + this.bin(b.deslocamento, this.sim.bitsDeslocamento);
  }

  enderecoFisico(quadro: number, deslocamento: number): string {
    return this.bin(quadro, this.sim.bitsQuadro) + this.bin(deslocamento, this.sim.bitsDeslocamento);
  }

  /** Entradas da tabela de páginas (2 bits = 4 páginas) fora do espaço lógico do processo: bit I. */
  invalidas(p: ProcessoSimples): number[] {
    return [0, 1, 2, 3].filter(i => i >= p.quadros.length);
  }

  /** Byte da última página que o processo não usa: fragmentação interna. */
  ehSobra(t: { processo: string; pagina: number; deslocamento: number }): boolean {
    const p = this.sim.processos().find(x => x.nome === t.processo);
    return !!p && t.pagina * this.tamanhoPagina + t.deslocamento >= p.bytes;
  }

  logicoSelecionado(p: ProcessoSimples, b: ByteLogico): boolean {
    const t = this.sim.traducao();
    return !!t && t.processo === p.nome && t.pagina === b.pagina && t.deslocamento === b.deslocamento;
  }

  fisicoSelecionado(b: ByteFisico): boolean {
    const t = this.sim.traducao();
    return !!t && t.quadro === b.quadro && t.deslocamento === b.deslocamento;
  }
}
