import { Component, OnDestroy } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { ChamadasSistemaService } from 'src/app/features/introducao/services/chamadas-sistema.service';
import { LateralOQueESoComponent } from '../lateral-o-que-e-so/lateral-o-que-e-so.component';
import { AreaOQueESoComponent } from '../area-o-que-e-so/area-o-que-e-so.component';

@Component({
  selector: 'app-home-o-que-e-so',
  templateUrl: './home-o-que-e-so.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralOQueESoComponent, AreaOQueESoComponent],
  providers: [ChamadasSistemaService],
})
export class HomeOQueESoComponent implements OnDestroy {
  constructor(public sim: ChamadasSistemaService) {}
  ngOnDestroy(): void { this.sim.pausar(); }
}
