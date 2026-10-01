import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { SimuladorParticoesVariaveisService } from 'src/app/features/particoes/services/simulador-particoes-variaveis.service';
import { LateralParticoesVariaveisComponent } from '../lateral-particoes-variaveis/lateral-particoes-variaveis.component';
import { AreaParticoesVariaveisComponent } from '../area-particoes-variaveis/area-particoes-variaveis.component';

@Component({
  selector: 'app-home-particoes-variaveis',
  templateUrl: './home-particoes-variaveis.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralParticoesVariaveisComponent, AreaParticoesVariaveisComponent],
  providers: [SimuladorParticoesVariaveisService],
})
export class HomeParticoesVariaveisComponent {
  constructor(public sim: SimuladorParticoesVariaveisService) {}
}
