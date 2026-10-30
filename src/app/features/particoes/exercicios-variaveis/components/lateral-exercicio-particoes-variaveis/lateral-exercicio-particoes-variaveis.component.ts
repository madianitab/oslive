import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { ALGORITMOS_FIT } from 'src/app/features/particoes/models/particoes';
import { SO_VAR, TOTAL_VAR } from 'src/app/features/particoes/models/exercicios-particoes';
import { ExercicioParticoesVariaveisService, TIPOS_EX_VAR } from 'src/app/features/particoes/services/exercicio-particoes-variaveis.service';

@Component({
  selector: 'app-lateral-exercicio-particoes-variaveis',
  standalone: true,
  imports: [FormsModule, OsPanelComponent, OsButtonComponent],
  styleUrls: ['../../../../../ui/styles/sim-config.css'],
  template: `
    <div class="sim-config">
      <os-panel title="Tipo de exercício">
        <select class="form-control" name="tipo" [ngModel]="ex.tipo()" (ngModelChange)="ex.definirTipo($event)">
          @for (t of tipos; track t.valor) { <option [ngValue]="t.valor">{{ t.nome }}</option> }
        </select>
        <p class="hint" style="margin-top: 10px">{{ descricao }}</p>
      </os-panel>

      @if (ex.tipo() === 'ALOCACAO') {
        <os-panel title="Algoritmo de alocação">
          <select class="form-control" name="algoritmo" [ngModel]="ex.algoritmo()" (ngModelChange)="ex.definirAlgoritmo($event)">
            @for (a of algoritmos; track a.valor) { <option [ngValue]="a.valor">{{ a.nome }}</option> }
          </select>
          <p class="hint" style="margin-top: 10px">Escolhe {{ regra }}. Desempate pelo menor endereço.</p>
        </os-panel>
      }

      <os-panel title="Exercício">
        <div class="proc-actions">
          <os-button variant="p" size="sm" (click)="ex.gerar()"><i class="fa-solid fa-shuffle"></i> {{ ex.gerado() ? 'Novo exercício' : 'Gerar exercício' }}</os-button>
        </div>
        <p class="hint" style="margin-top: 10px">Memória de {{ total }} KB; o SO ocupa de 0 a {{ so - 1 }}. Valores aleatórios a cada exercício.</p>
      </os-panel>

      <os-panel title="Como funciona">
        <ul class="hint" style="margin: 0; padding-left: 18px">
          <li>O processo recebe exatamente o que precisa; a sobra vira lacuna.</li>
          <li>Sem lacuna que comporte: <b>fragmentação externa</b> se o total livre bastaria; senão, <b>memória insuficiente</b>. O processo espera na fila.</li>
          <li>Quando um processo termina, lacunas vizinhas se unem e a fila é tentada em ordem de chegada.</li>
          <li><b>Compactação:</b> os processos vão para o início, na ordem de endereço, e as bases mudam.</li>
        </ul>
      </os-panel>
    </div>
  `,
})
export class LateralExercicioParticoesVariaveisComponent {
  readonly tipos = TIPOS_EX_VAR;
  readonly algoritmos = ALGORITMOS_FIT;
  readonly so = SO_VAR;
  readonly total = TOTAL_VAR;
  constructor(public ex: ExercicioParticoesVariaveisService) {}
  get descricao(): string { return this.tipos.find(t => t.valor === this.ex.tipo())?.descricao ?? ''; }
  get regra(): string { return this.algoritmos.find(a => a.valor === this.ex.algoritmo())?.regra ?? ''; }
}
