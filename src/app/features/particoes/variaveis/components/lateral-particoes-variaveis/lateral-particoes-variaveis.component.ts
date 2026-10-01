import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { ALGORITMOS_FIT } from 'src/app/features/particoes/models/particoes';
import { AREA_USUARIO_VAR, SimuladorParticoesVariaveisService, TAM_SO_VAR, TAM_TOTAL_VAR } from 'src/app/features/particoes/services/simulador-particoes-variaveis.service';

@Component({
  selector: 'app-lateral-particoes-variaveis',
  templateUrl: './lateral-particoes-variaveis.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css'],
  standalone: true,
  imports: [FormsModule, OsPanelComponent, OsButtonComponent],
})
export class LateralParticoesVariaveisComponent {
  readonly algoritmos = ALGORITMOS_FIT;
  readonly so = TAM_SO_VAR;
  readonly total = TAM_TOTAL_VAR;
  readonly usuario = AREA_USUARIO_VAR;
  tamanho: number | null = null;

  constructor(public sim: SimuladorParticoesVariaveisService, private notifi: MatSnackBar) {}

  get regra(): string {
    return this.algoritmos.find(a => a.valor === this.sim.algoritmo())?.regra ?? '';
  }

  criar(): void {
    const erro = this.sim.criar(Number(this.tamanho));
    if (erro) this.notifi.open(erro, 'Fechar', { duration: 4000 });
    else this.tamanho = null;
  }
}
