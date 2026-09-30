import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ALGORITMOS_SUBSTITUICAO,
  AlgoritmoSubstituicao,
  MAX_PAGINAS_POR_PROCESSO,
  ProcessoDemanda,
  SimuladorPaginacaoDemandaService,
} from 'src/app/features/paginacao/services/simulador-paginacao-demanda.service';

@Component({
  selector: 'app-lateral-simulador-paginacao-demanda',
  templateUrl: './lateral-simulador-paginacao-demanda.component.html',
  styleUrls: [
    '../../../../../ui/styles/sim-config.css',
    './lateral-simulador-paginacao-demanda.component.css',
  ],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralSimuladorPaginacaoDemandaComponent {

  public readonly algoritmos = ALGORITMOS_SUBSTITUICAO;
  public readonly maxPaginas = MAX_PAGINAS_POR_PROCESSO;
  public aleatorio = signal<boolean>(false);
  public nome = '';
  public quantidadePaginas: number | null = null;

  constructor(
    public sim: SimuladorPaginacaoDemandaService,
    private notifi: MatSnackBar,
  ) {}

  alterarAlgoritmo(valor: AlgoritmoSubstituicao): void {
    this.sim.definirAlgoritmo(valor);
  }

  criar(): void {
    const erro = this.sim.criarProcesso(this.nome, Number(this.quantidadePaginas));
    if (erro) {
      this.notifi.open(erro, 'Fechar', { duration: 2500 });
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
    this.quantidadePaginas = null;
  }

  naMemoria(p: ProcessoDemanda): number {
    return p.paginas.filter(pg => pg.quadro !== null).length;
  }

  reiniciar(): void {
    this.aleatorio.set(false);
    this.limparForm();
    this.sim.reiniciar();
  }
}
