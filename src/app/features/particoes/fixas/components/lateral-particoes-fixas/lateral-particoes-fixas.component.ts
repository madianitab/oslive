import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import {
  AREA_USUARIO_FIX, PARTICOES_PADRAO, POLITICAS_FIXAS, SimuladorParticoesFixasService, TAM_SO_FIX,
} from 'src/app/features/particoes/services/simulador-particoes-fixas.service';

@Component({
  selector: 'app-lateral-particoes-fixas',
  templateUrl: './lateral-particoes-fixas.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css'],
  standalone: true,
  imports: [FormsModule, OsPanelComponent, OsButtonComponent],
})
export class LateralParticoesFixasComponent {
  readonly politicas = POLITICAS_FIXAS;
  readonly so = TAM_SO_FIX;
  readonly usuario = AREA_USUARIO_FIX;
  config = PARTICOES_PADRAO.join(', ');
  tamanho: number | null = null;

  constructor(public sim: SimuladorParticoesFixasService, private notifi: MatSnackBar) {}

  get regra(): string {
    return this.politicas.find(p => p.valor === this.sim.politica())?.regra ?? '';
  }

  aplicar(): void {
    const erro = this.sim.configurar(this.config);
    this.notifi.open(erro ?? 'Partições redefinidas.', 'Fechar', { duration: 3500 });
  }

  criar(): void {
    const erro = this.sim.criar(Number(this.tamanho));
    if (erro) this.notifi.open(erro, 'Fechar', { duration: 4500 });
    else this.tamanho = null;
  }
}
