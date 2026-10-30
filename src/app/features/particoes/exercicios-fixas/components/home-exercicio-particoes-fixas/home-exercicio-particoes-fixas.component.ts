import { Component } from '@angular/core';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';
import { ExercicioParticoesFixasService } from 'src/app/features/particoes/services/exercicio-particoes-fixas.service';
import { LateralExercicioParticoesFixasComponent } from '../lateral-exercicio-particoes-fixas/lateral-exercicio-particoes-fixas.component';
import { AreaExercicioParticoesFixasComponent } from '../area-exercicio-particoes-fixas/area-exercicio-particoes-fixas.component';

@Component({
  selector: 'app-home-exercicio-particoes-fixas',
  standalone: true,
  imports: [OsSimShellComponent, OsButtonGroupComponent, LateralExercicioParticoesFixasComponent, AreaExercicioParticoesFixasComponent],
  // Uma instância por visita à tela: o exercício sempre começa do zero.
  providers: [ExercicioParticoesFixasService],
  template: `
    <os-sim-shell title="Exercícios de Partições Fixas" subtitle="Indique a partição de cada processo, a fragmentação interna e quem sai da fila.">
      <ng-container slot="actions">
        <os-button-group>
          <button class="osbg-btn primary" type="button" aria-label="Novo exercício" title="Novo exercício" (click)="ex.gerar()"><i class="fa-solid fa-shuffle"></i></button>
          <button class="osbg-btn" type="button" aria-label="Corrigir respostas" title="Corrigir" [disabled]="!ex.gerado()" (click)="ex.corrigir()"><i class="fa-solid fa-check"></i></button>
          <button class="osbg-btn danger" type="button" aria-label="Limpar respostas" title="Limpar respostas" [disabled]="!ex.gerado()" (click)="ex.limpar()"><i class="fa-solid fa-eraser"></i></button>
        </os-button-group>
      </ng-container>
      <app-lateral-exercicio-particoes-fixas slot="config"></app-lateral-exercicio-particoes-fixas>
      <app-area-exercicio-particoes-fixas></app-area-exercicio-particoes-fixas>
    </os-sim-shell>
  `,
})
export class HomeExercicioParticoesFixasComponent {
  constructor(public ex: ExercicioParticoesFixasService) {}
}
