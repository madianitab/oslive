import { Component, OnDestroy } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { SimuladorEstadosService } from 'src/app/features/processos/services/simulador-estados.service';
import { LateralEstadosComponent } from '../lateral-estados/lateral-estados.component';
import { AreaEstadosComponent } from '../area-estados/area-estados.component';

@Component({
  selector: 'app-home-estados',
  templateUrl: './home-estados.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralEstadosComponent, AreaEstadosComponent],
  providers: [SimuladorEstadosService],
})
export class HomeEstadosComponent implements OnDestroy {
  constructor(public sim: SimuladorEstadosService) {}
  ngOnDestroy(): void { this.sim.pausar(); }
}
