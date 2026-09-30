import { Component } from '@angular/core';
import { SimuladorPaginacaoDemandaService } from 'src/app/features/paginacao/services/simulador-paginacao-demanda.service';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { LateralSimuladorPaginacaoDemandaComponent } from '../lateral-simulador-paginacao-demanda/lateral-simulador-paginacao-demanda.component';
import { AreaSimuladorPaginacaoDemandaComponent } from '../area-simulador-paginacao-demanda/area-simulador-paginacao-demanda.component';

@Component({
  selector: 'app-home-simulador-paginacao-demanda',
  templateUrl: './home-simulador-paginacao-demanda.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralSimuladorPaginacaoDemandaComponent, AreaSimuladorPaginacaoDemandaComponent],
  // Uma instância por visita à tela: a simulação sempre começa vazia.
  providers: [SimuladorPaginacaoDemandaService],
})
export class HomeSimuladorPaginacaoDemandaComponent {}
