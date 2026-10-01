import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { ExercicioPaginacaoSimplesService } from 'src/app/features/paginacao/services/exercicio-paginacao-simples.service';
import { LateralExercicioPaginacaoSimplesComponent } from '../lateral-exercicio-paginacao-simples/lateral-exercicio-paginacao-simples.component';
import { AreaExercicioPaginacaoSimplesComponent } from '../area-exercicio-paginacao-simples/area-exercicio-paginacao-simples.component';

@Component({
  selector: 'app-home-exercicio-paginacao-simples',
  templateUrl: './home-exercicio-paginacao-simples.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralExercicioPaginacaoSimplesComponent, AreaExercicioPaginacaoSimplesComponent],
  // Uma instância por visita à tela: o exercício sempre começa do zero.
  providers: [ExercicioPaginacaoSimplesService],
})
export class HomeExercicioPaginacaoSimplesComponent {
  constructor(public ex: ExercicioPaginacaoSimplesService) {}
}
