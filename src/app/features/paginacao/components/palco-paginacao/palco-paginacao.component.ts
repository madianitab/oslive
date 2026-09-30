import { Component, Input } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { OsSimCalloutComponent } from 'src/app/ui/sim-callout/sim-callout.component';
import { PassoPaginacao } from '../../models/passo-paginacao';

@Component({
  selector: 'app-palco-paginacao',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, OsSimCalloutComponent],
  styleUrls: ['./palco-paginacao.component.css'],
  template: `
    <div class="palco" *ngIf="passo as p">
      <h4 class="palco-h">Memória física · {{ p.memoriaFisica.length }} quadros</h4>
      <div class="quadros">
        <div class="quadro" *ngFor="let q of p.memoriaFisica; let i = index"
             [ngClass]="{ entra: i === p.quadroDestino, sai: i === p.quadroVitima }"
             [style.borderColor]="q.nome.trim() ? q.cor : null">
          <span class="quadro-idx">{{ i }}</span>
          <span class="quadro-nome">{{ q.nome.trim() || '—' }}</span>
        </div>
      </div>
      <os-sim-callout class="palco-balao" [texto]="p.narrativa" [visivel]="p.tipo === 'fault'"></os-sim-callout>
    </div>
  `,
})
export class PalcoPaginacaoComponent {
  @Input() passo?: PassoPaginacao;
}
