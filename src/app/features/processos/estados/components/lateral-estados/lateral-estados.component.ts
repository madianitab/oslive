import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { SimuladorEstadosService, VELOCIDADES } from 'src/app/features/processos/services/simulador-estados.service';
import { NOMES_ESTADO, Passo, ProcessoEstados } from 'src/app/features/processos/models/estados';

@Component({
  selector: 'app-lateral-estados',
  templateUrl: './lateral-estados.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css', './lateral-estados.component.css'],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralEstadosComponent {
  readonly velocidades = VELOCIDADES;
  readonly nomes = NOMES_ESTADO;
  constructor(public sim: SimuladorEstadosService) {}

  rotuloPasso(p: Passo): string {
    return p.tipo === 'CPU' ? `CPU ${p.duracao}` : `E/S ${p.dispositivo!.nome} ${p.duracao}`;
  }

  estadoAtual(p: ProcessoEstados): string {
    const e = this.sim.foto().estados[p.nome];
    return e ? this.nomes[e] : '—';
  }
}
