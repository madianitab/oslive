import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { SimuladorSegmentacaoService } from 'src/app/features/segmentacao/services/simulador-segmentacao.service';
import { LateralSimuladorSegmentacaoComponent } from '../lateral-simulador-segmentacao/lateral-simulador-segmentacao.component';
import { AreaSimuladorSegmentacaoComponent } from '../area-simulador-segmentacao/area-simulador-segmentacao.component';

@Component({
  selector: 'app-home-simulador-segmentacao',
  templateUrl: './home-simulador-segmentacao.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralSimuladorSegmentacaoComponent, AreaSimuladorSegmentacaoComponent],
  // Uma instância por visita à tela: a simulação sempre começa vazia.
  providers: [SimuladorSegmentacaoService],
})
export class HomeSimuladorSegmentacaoComponent {
  constructor(public sim: SimuladorSegmentacaoService) {}
}
