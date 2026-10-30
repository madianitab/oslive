import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { Acesso, NOMES_CASOS, PassoSC, PaginaFila } from 'src/app/features/paginacao/models/segunda-chance-sequencia';
import {
  ALGORITMOS_SC,
  ExercicioSegundaChanceService,
  MAX_SITUACOES,
  RespostaFila,
} from 'src/app/features/paginacao/services/exercicio-segunda-chance.service';

/** Área do exercício de Segunda Chance (e Melhorada) em situações encadeadas. */
@Component({
  selector: 'app-area-exercicio-segunda-chance',
  templateUrl: './area-exercicio-segunda-chance.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-exercicio-segunda-chance.component.css'],
  standalone: true,
  imports: [FormsModule, NgClass, OsStatComponent, OsButtonComponent],
})
export class AreaExercicioSegundaChanceComponent {
  readonly sc = inject(ExercicioSegundaChanceService);
  private readonly notifi = inject(MatSnackBar);

  readonly max = MAX_SITUACOES;
  readonly nomesCasos = NOMES_CASOS;

  readonly nomeAlgoritmo = computed(() => this.sc.algoritmo() === 'SC' ? 'Segunda Chance' : 'SC Melhorada');
  readonly melhorada = computed(() => this.sc.algoritmo() === 'SCM');

  /** Páginas acessadas na situação atual (para destacar na fila). */
  readonly acessadas = computed(() => new Set(this.sc.atual()?.acessos.map((a: Acesso) => a.pagina) ?? []));

  readonly acertouSituacao = computed(() => {
    const r = this.sc.ultimoRegistro();
    if (!r || !this.sc.respondida()) return null;
    return r.acertoVitima && r.acertoFila !== false;
  });

  readonly nomesAlgoritmos = ALGORITMOS_SC;

  corrigir(): void {
    const msg = this.sc.corrigir();
    if (msg) this.notifi.open(msg, 'Fechar', { duration: 3000 });
  }

  /** Momentos em que a página foi acessada nesta situação (para o title). */
  tituloAcesso(p: PaginaFila): string {
    const acessos = this.sc.atual()?.acessos.filter((a: Acesso) => a.pagina === p.nome) ?? [];
    return acessos.map(a => `${a.escrita ? 'escrita' : 'leitura'} no momento ${a.momento}`).join('; ');
  }

  classeVitima(nome: string): Record<string, boolean> {
    const s = this.sc.atual();
    const respondida = this.sc.respondida();
    const escolhida = this.sc.respostaVitima() === nome;
    const correta = s?.resultado.vitima.nome === nome;
    return {
      escolhida: escolhida && !respondida,
      acerto: respondida && escolhida && correta,
      erro: respondida && escolhida && !correta,
      gabarito: respondida && correta && !escolhida,
    };
  }

  classeCampo(i: number, campo: keyof RespostaFila): Record<string, boolean> {
    const c = this.sc.campoCorreto(i, campo);
    return { acerto: c === true, erro: c === false };
  }

  textoPasso(p: PassoSC): string {
    const bits = this.melhorada() ? `(R,M) = (${p.r},${p.m})` : `(R = ${p.r})`;
    switch (p.acao) {
      case 'segunda-chance':
        return `${p.pagina} ${bits}: ganha segunda chance → R = 0, momento ${p.novoMomento}, vai para o fim da fila.`;
      case 'pulada':
        return `${p.pagina} ${bits}: não é (0,0), segue sem alterar.`;
      case 'vitima':
        return `${p.pagina} ${bits}: é a vítima.`;
    }
  }

  /** Passos agrupados por volta (a melhorada pode dar mais de uma volta). */
  voltas(): { volta: number; titulo: string; passos: PassoSC[] }[] {
    const s = this.sc.atual();
    if (!s) return [];
    const grupos = new Map<number, PassoSC[]>();
    s.resultado.passos.forEach(p => grupos.set(p.volta, [...(grupos.get(p.volta) ?? []), p]));
    return [...grupos.entries()].map(([volta, passos]) => ({
      volta,
      titulo: this.melhorada()
        ? `${volta}ª volta: procura ${volta % 2 === 1 ? '(0,0), sem alterar bits' : '(0,1), zerando R de quem passa'}`
        : 'Percorrendo a fila a partir do início',
      passos,
    }));
  }

  resumo(): string {
    const s = this.sc.atual();
    if (!s) return '';
    const r = s.resultado;
    const chances = r.passos.filter(p => p.acao === 'segunda-chance').length;
    const base = `${r.vitima.nome} sai e ${s.nova} entra no fim da fila no momento ${r.momentoNova}`;
    return chances ? `${base} (o relógio avançou um a cada segunda chance).` : `${base}.`;
  }
}
