import { Component, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { SimuladorSegmentacaoService } from 'src/app/features/segmentacao/services/simulador-segmentacao.service';
import {
  BITS_DESLOCAMENTO,
  BITS_FISICO,
  BITS_SEGMENTO,
  ByteFisico,
  Lacuna,
  PassoAlocacao,
  ProcessoSegmentado,
  Segmento,
  binario,
  corSegmento,
  nomeByte,
} from 'src/app/features/segmentacao/models/segmentacao';

@Component({
  selector: 'app-area-simulador-segmentacao',
  templateUrl: './area-simulador-segmentacao.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-simulador-segmentacao.component.css'],
  standalone: true,
  imports: [NgStyle, FormsModule, OsStatComponent, OsButtonComponent],
})
export class AreaSimuladorSegmentacaoComponent {
  public readonly bin = binario;
  public readonly bF = BITS_FISICO;
  public readonly bS = BITS_SEGMENTO;
  public readonly bD = BITS_DESLOCAMENTO;
  public readonly nomeByte = nomeByte;
  public readonly opcoesSegmento = [0, 1, 2, 3];
  public segTeste = 0;
  public deslTeste: number | null = 0;

  readonly metades = computed(() => {
    const m = this.sim.memoria();
    return [m.slice(0, 16), m.slice(16)];
  });

  constructor(public sim: SimuladorSegmentacaoService) {}

  cor(p: ProcessoSegmentado, s: Segmento): string {
    return corSegmento(p.cor, s.tipo);
  }

  corByte(b: ByteFisico): string | null {
    return b.processo && b.segmento ? corSegmento(b.processo.cor, b.segmento.tipo) : null;
  }

  deslocamentos(s: Segmento): number[] {
    return Array.from({ length: s.tamanho }, (_, i) => i);
  }

  traduzirByte(p: ProcessoSegmentado, s: Segmento, d: number): void {
    this.segTeste = s.numero;
    this.deslTeste = d;
    this.sim.traduzir(p.nome, s.numero, d);
  }

  testar(p: ProcessoSegmentado): void {
    this.sim.traduzir(p.nome, Number(this.segTeste), Number(this.deslTeste ?? 0));
  }

  logicoSelecionado(p: ProcessoSegmentado, s: Segmento, d: number): boolean {
    const t = this.sim.traducao();
    return !!t && t.processo === p.nome && t.segmento === s.numero && t.deslocamento === d;
  }

  fisicoSelecionado(b: ByteFisico): boolean {
    const t = this.sim.traducao();
    return !!t && t.resultado.ok && t.resultado.fisico === b.endereco;
  }

  lacunaEscolhida(passo: PassoAlocacao, l: Lacuna): boolean {
    return !!passo.escolhida && passo.escolhida.inicio === l.inicio;
  }

  segmentoTraduzido(p: ProcessoSegmentado): Segmento | undefined {
    return p.segmentos.find(s => s.numero === this.sim.traducao()?.segmento);
  }
}
