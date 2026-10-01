import { Component, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { ALGORITMOS_FIT, AlgoritmoFit, Lacuna } from 'src/app/features/particoes/models/particoes';
import { SimuladorParticoesVariaveisService, TAM_SO_VAR, TAM_TOTAL_VAR } from 'src/app/features/particoes/services/simulador-particoes-variaveis.service';

const PX_POR_KB = 1.2;

@Component({
  selector: 'app-area-particoes-variaveis',
  templateUrl: './area-particoes-variaveis.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', '../../../particoes.css'],
  standalone: true,
  imports: [NgStyle, FormsModule, OsStatComponent, OsButtonComponent],
})
export class AreaParticoesVariaveisComponent {
  readonly altura = TAM_TOTAL_VAR * PX_POR_KB;
  readonly so = TAM_SO_VAR;
  readonly marcas = [0, 100, 200, 300, 400, 500];
  procTeste = '';
  logicoTeste: number | null = 0;

  readonly nomeAlg = computed(() => ALGORITMOS_FIT.find(a => a.valor === this.sim.algoritmo())!.nome);

  constructor(public sim: SimuladorParticoesVariaveisService) {}

  y(kb: number): number { return kb * PX_POR_KB; }

  nome(a: AlgoritmoFit): string { return ALGORITMOS_FIT.find(x => x.valor === a)!.nome; }

  /** Lacuna "pequena": não comporta nenhum processo que está esperando. */
  pequena(l: Lacuna): boolean {
    return this.sim.fila().length > 0 && this.sim.fila().every(p => p.tamanho > l.tamanho);
  }

  escolhida(l: Lacuna): boolean {
    return this.sim.decisao()?.escolhida?.inicio === l.inicio;
  }

  testar(): void {
    const nome = this.procTeste || this.sim.alocados()[0]?.processo.nome;
    if (nome) {
      this.procTeste = nome;
      this.sim.testarProtecao(nome, Number(this.logicoTeste ?? 0));
    }
  }
}
