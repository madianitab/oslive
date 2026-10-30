import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { ExercicioParticoesVariaveisService } from 'src/app/features/particoes/services/exercicio-particoes-variaveis.service';
import { LateralExercicioParticoesVariaveisComponent } from '../lateral-exercicio-particoes-variaveis/lateral-exercicio-particoes-variaveis.component';
import { AreaExercicioParticoesVariaveisComponent } from '../area-exercicio-particoes-variaveis/area-exercicio-particoes-variaveis.component';

@Component({
  selector: 'app-home-exercicio-particoes-variaveis',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralExercicioParticoesVariaveisComponent, AreaExercicioParticoesVariaveisComponent],
  // Uma instância por visita à tela: o exercício sempre começa do zero.
  providers: [ExercicioParticoesVariaveisService],
  template: `
    <os-sim-shell title="Exercícios de Partições Variáveis" subtitle="Alocação com first, best, worst e circular-fit, tabela de lacunas e compactação.">
      <ng-container slot="actions">
        <os-button-group>
          <button class="osbg-btn primary" type="button" aria-label="Novo exercício" title="Novo exercício" (click)="ex.gerar()"><i class="fa-solid fa-shuffle"></i></button>
          <button class="osbg-btn" type="button" aria-label="Corrigir respostas" title="Corrigir" [disabled]="!ex.gerado()" (click)="ex.corrigir()"><i class="fa-solid fa-check"></i></button>
          <button class="osbg-btn danger" type="button" aria-label="Limpar respostas" title="Limpar respostas" [disabled]="!ex.gerado()" (click)="ex.limpar()"><i class="fa-solid fa-eraser"></i></button>
        </os-button-group>
      </ng-container>
      <app-lateral-exercicio-particoes-variaveis slot="config"></app-lateral-exercicio-particoes-variaveis>
      <app-area-exercicio-particoes-variaveis></app-area-exercicio-particoes-variaveis>
    </os-sim-shell>
  `,
})
export class HomeExercicioParticoesVariaveisComponent {
  constructor(public ex: ExercicioParticoesVariaveisService) {}
}
