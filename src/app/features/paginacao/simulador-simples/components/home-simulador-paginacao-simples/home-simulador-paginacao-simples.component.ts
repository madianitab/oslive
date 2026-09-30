import { Component } from '@angular/core';
import { SimuladorPaginacaoSimplesService } from 'src/app/features/paginacao/services/simulador-paginacao-simples.service';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { LateralSimuladorPaginacaoSimplesComponent } from '../lateral-simulador-paginacao-simples/lateral-simulador-paginacao-simples.component';
import { AreaSimuladorPaginacaoSimplesComponent } from '../area-simulador-paginacao-simples/area-simulador-paginacao-simples.component';

@Component({
  selector: 'app-home-simulador-paginacao-simples',
  templateUrl: './home-simulador-paginacao-simples.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralSimuladorPaginacaoSimplesComponent, AreaSimuladorPaginacaoSimplesComponent],
  // Uma instância por visita à tela: a simulação sempre começa vazia.
  providers: [SimuladorPaginacaoSimplesService],
})
export class HomeSimuladorPaginacaoSimplesComponent {}
