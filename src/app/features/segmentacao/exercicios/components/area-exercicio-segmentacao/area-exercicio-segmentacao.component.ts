import { Component, computed } from '@angular/core';
import { NgStyle, NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import {
  Correcao,
  ExercicioSegmentacaoService,
  PerguntaTraducaoSeg,
  TIPOS_EXERCICIO_SEG,
} from 'src/app/features/segmentacao/services/exercicio-segmentacao.service';
import {
  BITS_DESLOCAMENTO,
  BITS_FISICO,
  BITS_SEGMENTO,
  ByteFisico,
  Lacuna,
  PassoAlocacao,
  ProcessoSegmentado,
  SEGMENTOS,
  Segmento,
  TipoSegmento,
  binario,
  corSegmento,
  nomeByte,
  traduzir,
} from 'src/app/features/segmentacao/models/segmentacao';

@Component({
  selector: 'app-area-exercicio-segmentacao',
  templateUrl: './area-exercicio-segmentacao.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-exercicio-segmentacao.component.css'],
  standalone: true,
  imports: [NgStyle, NgClass, NgTemplateOutlet, FormsModule, OsStatComponent, OsButtonComponent],
})
export class AreaExercicioSegmentacaoComponent {
  public readonly bin = binario;
  public readonly bF = BITS_FISICO;
  public readonly bS = BITS_SEGMENTO;
  public readonly bD = BITS_DESLOCAMENTO;
  public readonly nomeByte = nomeByte;
  public readonly segmentos = SEGMENTOS;

  readonly nomeTipo = computed(() => ({
    TRADUCAO: 'Tradução', TABELA: 'Tabela de segmentos', MEMORIA_FISICA: 'Memória física', ALOCACAO: 'Alocação best-fit',
  } as Record<string, string>)[this.ex.tipo()]);
  readonly descricao = computed(() => TIPOS_EXERCICIO_SEG.find(t => t.valor === this.ex.tipo())?.descricao ?? '');
  readonly percentual = computed(() => {
    const p = this.ex.placar();
    return p && p.total ? Math.round((p.acertos / p.total) * 100) : 0;
  });
  readonly metades = computed(() => {
    const m = this.ex.memoria();
    return [m.slice(0, 16), m.slice(16)];
  });
  readonly outros = computed(() => this.ex.processos().slice(1));

  constructor(public ex: ExercicioSegmentacaoService) {}

  classe(c: Correcao): Record<string, boolean> {
    return { acerto: c === true, erro: c === false };
  }

  cor(p: { cor: string }, s: { tipo: TipoSegmento }): string {
    return corSegmento(p.cor, s.tipo);
  }

  corByte(b: ByteFisico): string | null {
    return b.processo && b.segmento ? corSegmento(b.processo.cor, b.segmento.tipo) : null;
  }

  deslocamentos(s: Segmento): number[] {
    return Array.from({ length: s.tamanho }, (_, i) => i);
  }

  explicacao(q: PerguntaTraducaoSeg): string {
    const r = traduzir(q.processo, q.segmento, q.deslocamento);
    if (!r.ok) return r.erro ?? '';
    const s = q.processo.segmentos.find(x => x.numero === q.segmento)!;
    return `${q.deslocamento} < ${s.tamanho} → ${s.base} + ${q.deslocamento} = ${r.fisico}`;
  }

  resposta(endereco: number): string {
    return this.ex.respostasMemoria()[endereco] ?? '';
  }

  respBase(t: TipoSegmento): string {
    return this.ex.respostasBase()[t] ?? '';
  }

  respTabela(chave: string): string {
    return this.ex.respostasTabela()[chave] ?? '';
  }

  lacunaEscolhida(passo: PassoAlocacao, l: Lacuna): boolean {
    return !!passo.escolhida && passo.escolhida.inicio === l.inicio;
  }

  segDe(p: ProcessoSegmentado, t: TipoSegmento): Segmento {
    return p.segmentos.find(s => s.tipo === t)!;
  }
}
