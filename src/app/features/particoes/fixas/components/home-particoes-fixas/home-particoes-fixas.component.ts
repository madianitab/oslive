import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { SimuladorParticoesFixasService } from 'src/app/features/particoes/services/simulador-particoes-fixas.service';
import { LateralParticoesFixasComponent } from '../lateral-particoes-fixas/lateral-particoes-fixas.component';
import { AreaParticoesFixasComponent } from '../area-particoes-fixas/area-particoes-fixas.component';

@Component({
  selector: 'app-home-particoes-fixas',
  templateUrl: './home-particoes-fixas.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralParticoesFixasComponent, AreaParticoesFixasComponent],
  providers: [SimuladorParticoesFixasService],
})
export class HomeParticoesFixasComponent {
  constructor(public sim: SimuladorParticoesFixasService) {}
}
