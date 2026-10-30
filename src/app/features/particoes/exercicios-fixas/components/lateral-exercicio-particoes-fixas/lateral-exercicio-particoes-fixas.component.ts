import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { ExercicioParticoesFixasService } from 'src/app/features/particoes/services/exercicio-particoes-fixas.service';
import { POLITICAS_FIXAS } from 'src/app/features/particoes/services/simulador-particoes-fixas.service';
import { AREA_FIXAS, SO_FIXAS } from 'src/app/features/particoes/models/exercicios-particoes';

@Component({
  selector: 'app-lateral-exercicio-particoes-fixas',
  standalone: true,
  imports: [FormsModule, OsPanelComponent, OsButtonComponent],
  styleUrls: ['../../../../../ui/styles/sim-config.css'],
  template: `
    <div class="sim-config">
      <os-panel title="Escolha da partição">
        <select class="form-control" name="politica" [ngModel]="ex.politica()" (ngModelChange)="ex.definirPolitica($event)">
          @for (p of politicas; track p.valor) { <option [ngValue]="p.valor">{{ p.nome }}</option> }
        </select>
        <p class="hint" style="margin-top: 10px">O SO {{ regra }}.</p>
      </os-panel>

      <os-panel title="Exercício">
        <div class="proc-actions">
          <os-button variant="p" size="sm" (click)="ex.gerar()"><i class="fa-solid fa-shuffle"></i> {{ ex.gerado() ? 'Novo exercício' : 'Gerar exercício' }}</os-button>
        </div>
        <p class="hint" style="margin-top: 10px">Partições e processos aleatórios a cada exercício.</p>
      </os-panel>

      <os-panel title="Como funciona">
        <ul class="hint" style="margin: 0; padding-left: 18px">
          <li>Memória de {{ so + area }} KB: {{ so }} KB do SO e {{ area }} KB divididos em partições que não mudam.</li>
          <li>O processo ocupa uma partição livre inteira; a sobra é <b>fragmentação interna</b>.</li>
          <li>Sem partição livre que comporte, o processo vai para a <b>fila</b>.</li>
          <li>Quando um processo termina, o primeiro da fila que couber na partição liberada entra nela.</li>
        </ul>
      </os-panel>
    </div>
  `,
})
export class LateralExercicioParticoesFixasComponent {
  readonly politicas = POLITICAS_FIXAS;
  readonly so = SO_FIXAS;
  readonly area = AREA_FIXAS;
  constructor(public ex: ExercicioParticoesFixasService) {}
  get regra(): string { return this.politicas.find(p => p.valor === this.ex.politica())?.regra ?? ''; }
}
