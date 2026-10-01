import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { ExercicioSegmentacaoService } from 'src/app/features/segmentacao/services/exercicio-segmentacao.service';
import { LateralExercicioSegmentacaoComponent } from '../lateral-exercicio-segmentacao/lateral-exercicio-segmentacao.component';
import { AreaExercicioSegmentacaoComponent } from '../area-exercicio-segmentacao/area-exercicio-segmentacao.component';

@Component({
  selector: 'app-home-exercicio-segmentacao',
  templateUrl: './home-exercicio-segmentacao.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralExercicioSegmentacaoComponent, AreaExercicioSegmentacaoComponent],
  providers: [ExercicioSegmentacaoService],
})
export class HomeExercicioSegmentacaoComponent {
  constructor(public ex: ExercicioSegmentacaoService) {}
}
