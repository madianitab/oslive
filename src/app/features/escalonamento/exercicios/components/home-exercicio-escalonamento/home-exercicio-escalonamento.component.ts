import { Component, signal } from '@angular/core';
import {
  ConfiguracaoExercicio,
  LateralExercicioEscalonamentoComponent,
} from '../lateral-exercicio-escalonamento/lateral-exercicio-escalonamento.component';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { AreaExercicioEscalonamentoComponent } from '../area-exercicio-escalonamento/area-exercicio-escalonamento.component';

@Component({
  selector: 'app-home-exercicio-escalonamento',
  templateUrl: './home-exercicio-escalonamento.component.html',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralExercicioEscalonamentoComponent, AreaExercicioEscalonamentoComponent],
})
export class HomeExercicioEscalonamentoComponent {
  public configuracao = signal<ConfiguracaoExercicio | null>(null);
}
