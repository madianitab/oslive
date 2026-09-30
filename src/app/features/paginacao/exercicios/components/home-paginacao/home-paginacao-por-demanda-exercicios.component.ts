import { Component, inject, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsSimPlayerComponent } from 'src/app/ui/sim-player/sim-player.component';
import { OsSimLogComponent } from 'src/app/ui/sim-log/sim-log.component';
import { PalcoPaginacaoComponent } from '../palco-paginacao/palco-paginacao.component';
import { TrilhaPaginacaoService } from '../../services/trilha-paginacao.service';
import { PassoPaginacao } from '../../models/passo-paginacao';
import { Pagina } from '../../models/pagina';
import { Processo } from '../../models/processo';
import { Utils } from 'src/app/core/utils';

@Component({
  selector: 'app-home-paginacao-por-demanda-exercicios',
  standalone: true,
  imports: [NgIf, OsSimShellComponent, OsSimPlayerComponent, OsSimLogComponent, PalcoPaginacaoComponent],
  templateUrl: './home-paginacao-por-demanda-exercicios.component.html',
  styleUrls: ['./home-paginacao-por-demanda-exercicios.component.css'],
})
export class HomePaginacaoPorDemandaExerciciosComponent implements OnDestroy {
  private readonly trilhaSvc = inject(TrilhaPaginacaoService);

  trilha: PassoPaginacao[] = [];
  indice = 0;
  tocando = false;
  velocidade = 1;
  private timer?: ReturnType<typeof setInterval>;

  get passoAtual(): PassoPaginacao | undefined { return this.trilha[this.indice]; }
  get itensLog(): { rotulo: string }[] {
    return this.trilha.map(p => ({ rotulo: `${p.indice + 1}. ${p.narrativa}` }));
  }

  ngOnDestroy(): void { this.pausar(); }

  gerarCenario(): void {
    const fila = this.montarFilaDeReferencias(); // usa geração existente → Pagina[]
    this.trilha = this.trilhaSvc.construir(fila);
    this.indice = 0;
    this.pausar();
  }

  irPara(i: number): void {
    this.indice = Math.max(0, Math.min(this.trilha.length - 1, i));
  }
  avancar(d: 1 | -1): void { this.irPara(this.indice + d); }

  tocar(): void {
    if (this.tocando || !this.trilha.length) return;
    this.tocando = true;
    this.timer = setInterval(() => {
      if (this.indice >= this.trilha.length - 1) { this.pausar(); return; }
      this.avancar(1);
    }, 1000 / this.velocidade);
  }
  pausar(): void {
    this.tocando = false;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
  }
  mudarVelocidade(v: number): void {
    this.velocidade = v;
    if (this.tocando) { this.pausar(); this.tocar(); }
  }

  /** monta a fila de páginas na ordem de acesso reusando a geração existente */
  private montarFilaDeReferencias(): Pagina[] {
    const nProcessos = 4;
    const sequencia = Utils.embaralhamentoFisherYates(Utils.listaNum(nProcessos));
    const paginasPorProc = Utils.listaNumAleatoriosComQuantMinimaFinal(nProcessos, false);
    const nomes = ['A', 'B', 'C', 'D'];
    const processos: Processo[] = [];
    for (let i = 0; i < nProcessos; i++) {
      processos.push(new Processo(nomes[sequencia[i]], paginasPorProc[i], Utils.gera_cor(processos)));
    }
    const todas: Pagina[] = processos.flatMap(p => p.pagina);
    const ordem = Utils.embaralhamentoFisherYates(Utils.listaNum(todas.length));
    return ordem.map(idx => todas[idx]);
  }
}
