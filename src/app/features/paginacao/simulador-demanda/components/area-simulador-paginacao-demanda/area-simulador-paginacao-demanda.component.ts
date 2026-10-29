import { Component, computed } from '@angular/core';
import { NgStyle, NgClass } from '@angular/common';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsSimLogComponent } from 'src/app/ui/sim-log/sim-log.component';
import { OsBadgeComponent } from 'src/app/ui/badge/badge.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { bitsT1aT4 } from 'src/app/features/paginacao/models/historico-bits';
import {
  ALGORITMOS_SUBSTITUICAO,
  BITS_HISTORICO_DEMANDA,
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
  imports: [NgStyle, NgClass, OsStatComponent, OsSimLogComponent, OsBadgeComponent, OsButtonComponent],
})
export class AreaSimuladorPaginacaoDemandaComponent {

  public readonly nomePagina = nomePagina;
  public readonly bitsT1aT4 = bitsT1aT4;
  /** Colunas como no material: T1 … T4, sendo T4 o instante mais recente. */
  public readonly colunasHistorico = Array.from({ length: BITS_HISTORICO_DEMANDA }, (_, i) => `T${i + 1}`);

  constructor(public sim: SimuladorPaginacaoDemandaService) {}


  /** Diário do os-sim-log: mais recente primeiro, destacado. */
  readonly nomeAlgoritmo = computed(() => {
    if (this.sim.algoritmo() === 'HISTORICO') return 'Histórico de bits';
    return ALGORITMOS_SUBSTITUICAO.find(a => a.valor === this.sim.algoritmo())?.nome.split(' (')[0] ?? '';
  });

  readonly diario = computed(() => this.sim.eventos().map(e => ({ rotulo: e.mensagem })));

}
