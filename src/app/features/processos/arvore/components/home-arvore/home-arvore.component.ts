import { Component, OnDestroy } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { ArvoreProcessosService } from 'src/app/features/processos/services/arvore-processos.service';
import { LateralArvoreComponent } from '../lateral-arvore/lateral-arvore.component';
import { AreaArvoreComponent } from '../area-arvore/area-arvore.component';

@Component({
  selector: 'app-home-arvore',
  templateUrl: './home-arvore.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralArvoreComponent, AreaArvoreComponent],
  providers: [ArvoreProcessosService],
})
export class HomeArvoreComponent implements OnDestroy {
  constructor(public sim: ArvoreProcessosService) {}
  ngOnDestroy(): void { this.sim.pausar(); }
}
