import { Component, Input } from '@angular/core';
import { NgStyle, NgClass } from '@angular/common';

export type TipoBloco = 'so' | 'processo' | 'livre' | 'interna';

export interface BlocoBarra {
  inicio: number;
  tamanho: number;
  tipo: TipoBloco;
  rotulo: string;
  detalhe?: string;
  cor?: string;
  /** Primeiro bloco de uma partição fixa: desenha a divisória da partição. */
  inicioParticao?: boolean;
  /** Realce: lacuna escolhida, lacuna que não comporta, ponteiro do circular-fit... */
  destaque?: 'escolhida' | 'insuficiente' | 'aviso' | null;
  marcador?: string;
}

/** Mapa da memória física em barra vertical, com alturas proporcionais aos tamanhos. */
@Component({
  selector: 'app-barra-memoria',
  standalone: true,
  imports: [NgStyle, NgClass],
  template: `
    <div class="barra">
      @for (b of blocos; track b.inicio + '-' + b.tipo) {
        <div class="linha" [ngStyle]="{ 'flex-grow': b.tamanho }">
          <span class="endereco">{{ b.inicio }}</span>
          <div class="bloco" [ngClass]="['t-' + b.tipo, b.destaque ? 'd-' + b.destaque : '', b.inicioParticao ? 'inicio-particao' : '']"
            [ngStyle]="b.tipo === 'processo' ? { 'background-color': b.cor } : {}" [title]="b.rotulo + (b.detalhe ? ' — ' + b.detalhe : '')">
            <span class="rotulo">{{ b.rotulo }}</span>
            @if (b.detalhe) { <span class="detalhe">{{ b.detalhe }}</span> }
            @if (b.marcador) { <span class="marcador">{{ b.marcador }}</span> }
          </div>
        </div>
      }
      <div class="fim"><span class="endereco">{{ total }} {{ unidade }}</span></div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .barra { display: flex; flex-direction: column; height: var(--altura, 560px); min-width: 230px; max-width: 360px; }
    .linha { display: flex; align-items: stretch; min-height: 26px; flex-basis: 0; }
    .endereco {
      width: 52px; flex-shrink: 0; padding-right: 8px; text-align: right;
      font-family: var(--f-mono); font-size: 10px; color: var(--text-3); transform: translateY(-6px);
    }
    .bloco {
      position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
      border: 1px solid var(--line); border-top-width: 0; padding: 2px 8px; overflow: hidden;
      font-family: var(--f-mono); font-size: 11px; text-align: center; line-height: 1.25;
    }
    .linha:first-child .bloco { border-top-width: 1px; border-radius: var(--r-sm) var(--r-sm) 0 0; }
    .linha:nth-last-child(2) .bloco { border-radius: 0 0 var(--r-sm) var(--r-sm); }
    .inicio-particao { border-top: 3px solid var(--text) !important; }
    .rotulo { font-weight: 700; }
    .detalhe { font-size: 10px; opacity: .9; }
    .t-so { background: var(--text-2); color: var(--surface); }
    .t-processo { color: #fff; }
    .t-livre { background: var(--surface-2); color: var(--text-3); border-style: dashed; }
    .t-interna {
      color: var(--err-deep);
      background: repeating-linear-gradient(45deg, var(--err-soft), var(--err-soft) 6px, var(--surface) 6px, var(--surface) 12px);
    }
    .d-escolhida { box-shadow: inset 0 0 0 3px var(--ok); color: var(--ok-deep); }
    .d-insuficiente { box-shadow: inset 0 0 0 3px var(--err); }
    .d-aviso { box-shadow: inset 0 0 0 3px var(--warn); }
    .marcador {
      position: absolute; right: 4px; top: 2px; font-size: 9px; font-weight: 700;
      background: var(--a); color: #fff; padding: 1px 5px; border-radius: 8px;
    }
    .fim { height: 0; display: flex; }
  `],
})
export class BarraMemoriaComponent {
  @Input() blocos: BlocoBarra[] = [];
  @Input() total = 0;
  @Input() unidade = 'KB';
}
