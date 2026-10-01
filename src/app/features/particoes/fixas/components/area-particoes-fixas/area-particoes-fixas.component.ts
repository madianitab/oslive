import { Component, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { POLITICAS_FIXAS, SimuladorParticoesFixasService, TAM_SO_FIX } from 'src/app/features/particoes/services/simulador-particoes-fixas.service';

const PX_POR_KB = 1.2;

@Component({
  selector: 'app-area-particoes-fixas',
  templateUrl: './area-particoes-fixas.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', '../../../particoes.css'],
  standalone: true,
  imports: [NgStyle, FormsModule, OsStatComponent, OsButtonComponent],
})
export class AreaParticoesFixasComponent {
  readonly so = TAM_SO_FIX;
  readonly marcas = [0, 100, 200, 300, 400, 500];
  procTeste = '';
  logicoTeste: number | null = 0;

  readonly fim = computed(() => {
    const ps = this.sim.particoes();
    const u = ps[ps.length - 1];
    return Math.max(500, u ? u.inicio + u.tamanho : TAM_SO_FIX);
  });
  readonly altura = computed(() => this.fim() * PX_POR_KB);
  readonly nomePolitica = computed(() => this.sim.politica() === 'BEST' ? 'Menor que comporta' : 'Primeira que comporta');
  readonly ocupadas = computed(() => this.sim.particoes().filter(p => p.processo));
  readonly naoParticionado = computed(() => {
    const ps = this.sim.particoes();
    const u = ps[ps.length - 1];
    const fimParts = u ? u.inicio + u.tamanho : TAM_SO_FIX;
    return { inicio: fimParts, tamanho: 500 - fimParts };
  });

  constructor(public sim: SimuladorParticoesFixasService) {}

  y(kb: number): number { return kb * PX_POR_KB; }

  testar(): void {
    const nome = this.procTeste || this.ocupadas()[0]?.processo?.nome;
    if (nome) {
      this.procTeste = nome;
      this.sim.testarProtecao(nome, Number(this.logicoTeste ?? 0));
    }
  }

  readonly politicas = POLITICAS_FIXAS;
}
