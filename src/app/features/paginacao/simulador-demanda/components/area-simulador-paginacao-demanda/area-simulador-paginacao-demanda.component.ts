import { Component, computed } from '@angular/core';
import { NgStyle, NgClass } from '@angular/common';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsSimLogComponent } from 'src/app/ui/sim-log/sim-log.component';
import { OsBadgeComponent } from 'src/app/ui/badge/badge.component';
import {
  SimuladorPaginacaoDemandaService,
  nomePagina,
} from 'src/app/features/paginacao/services/simulador-paginacao-demanda.service';

@Component({
  selector: 'app-area-simulador-paginacao-demanda',
  templateUrl: './area-simulador-paginacao-demanda.component.html',
  styleUrls: [
    '../../../../../ui/styles/sim-viz.css',
    './area-simulador-paginacao-demanda.component.css',
  ],
  standalone: true,
  imports: [NgStyle, NgClass, OsStatComponent, OsSimLogComponent, OsBadgeComponent],
})
export class AreaSimuladorPaginacaoDemandaComponent {

  public readonly nomePagina = nomePagina;

  constructor(public sim: SimuladorPaginacaoDemandaService) {}


  /** Diário do os-sim-log: mais recente primeiro, destacado. */
  readonly diario = computed(() => this.sim.eventos().map(e => ({ rotulo: e.mensagem })));

}
