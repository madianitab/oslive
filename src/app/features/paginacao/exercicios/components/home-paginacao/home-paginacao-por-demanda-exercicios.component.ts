import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { ExercicioPaginacaoService } from 'src/app/features/paginacao/services/exercicio-paginacao.service';
import { LateralExercicioPaginacaoComponent } from '../lateral-exercicio-paginacao/lateral-exercicio-paginacao.component';
import { AreaExercicioPaginacaoComponent } from '../area-exercicio-paginacao/area-exercicio-paginacao.component';
import { AreaExercicioSegundaChanceComponent } from '../area-exercicio-segunda-chance/area-exercicio-segunda-chance.component';
import { ExercicioSegundaChanceService } from 'src/app/features/paginacao/services/exercicio-segunda-chance.service';

@Component({
  selector: 'app-home-paginacao-por-demanda-exercicios',
  templateUrl: './home-paginacao-por-demanda-exercicios.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralExercicioPaginacaoComponent, AreaExercicioPaginacaoComponent, AreaExercicioSegundaChanceComponent],
  // Uma instância por visita à tela: o exercício sempre começa do zero.
  providers: [ExercicioPaginacaoService, ExercicioSegundaChanceService],
})
export class HomePaginacaoPorDemandaExerciciosComponent {
  constructor(public ex: ExercicioPaginacaoService, public sc: ExercicioSegundaChanceService) {}

  corrigirSequencia(): void {
    this.sc.corrigir();
  }
}
