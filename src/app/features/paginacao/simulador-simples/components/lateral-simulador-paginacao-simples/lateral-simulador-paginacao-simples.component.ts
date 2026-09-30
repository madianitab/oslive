import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAX_BYTES_PROCESSO,
  SimuladorPaginacaoSimplesService,
} from 'src/app/features/paginacao/services/simulador-paginacao-simples.service';

@Component({
  selector: 'app-lateral-simulador-paginacao-simples',
  templateUrl: './lateral-simulador-paginacao-simples.component.html',
  styleUrls: [
    '../../../../../ui/styles/sim-config.css',
    './lateral-simulador-paginacao-simples.component.css',
  ],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralSimuladorPaginacaoSimplesComponent {

  public readonly maxBytes = MAX_BYTES_PROCESSO;
  public aleatorio = signal<boolean>(false);
  public nome = '';
  public bytes: number | null = null;

  constructor(
    public sim: SimuladorPaginacaoSimplesService,
    private notifi: MatSnackBar,
  ) {}

  criar(): void {
    const erro = this.sim.criarProcesso(this.nome, Number(this.bytes));
    if (erro) {
      this.notifi.open(erro, 'Fechar', { duration: 3000 });
      return;
    }
    this.limparForm();
  }

  gerarAleatorio(): void {
    this.sim.gerarAleatorio();
    this.limparForm();
  }

  limparForm(): void {
    this.nome = '';
    this.bytes = null;
  }

  reiniciar(): void {
    this.aleatorio.set(false);
    this.limparForm();
    this.sim.reiniciar();
  }
}
