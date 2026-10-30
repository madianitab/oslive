import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { gera_cor } from 'src/app/core/utils';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { BarraMemoriaComponent, BlocoBarra } from 'src/app/features/particoes/components/barra-memoria/barra-memoria.component';
import { AREA_FIXAS, EventoFixa, ProcessoEx, SO_FIXAS } from 'src/app/features/particoes/models/exercicios-particoes';
import { Correcao, ExercicioParticoesFixasService, RespostaFixa } from 'src/app/features/particoes/services/exercicio-particoes-fixas.service';

@Component({
  selector: 'app-area-exercicio-particoes-fixas',
  templateUrl: './area-exercicio-particoes-fixas.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', '../../../exercicios.css'],
  standalone: true,
  imports: [FormsModule, NgClass, OsStatComponent, OsButtonComponent, BarraMemoriaComponent],
})
export class AreaExercicioParticoesFixasComponent {
  readonly total = SO_FIXAS + AREA_FIXAS;

  constructor(public ex: ExercicioParticoesFixasService) {}

  readonly nomePolitica = computed(() => this.ex.politica() === 'FIRST' ? 'Primeira que comporta' : 'Menor que comporta');

  /** Cor fixa por processo (sorteada uma vez por exercício). */
  readonly cores = computed(() => {
    const usadas: { cor: string }[] = [];
    const mapa: Record<string, string> = {};
    this.ex.processos().forEach(n => { const cor = gera_cor(usadas); usadas.push({ cor }); mapa[n] = cor; });
    return mapa;
  });

  readonly mostrarGabarito = computed(() => this.ex.corrigido() || this.ex.mostrarResposta());

  /** Memória com as partições vazias (situação inicial). */
  readonly blocosIniciais = computed(() => this.blocos(this.ex.ex()?.particoes.map(() => null) ?? []));

  /** Memória ao final da sequência (gabarito). */
  readonly blocosFinais = computed(() => {
    const ex = this.ex.ex();
    if (!ex) return [];
    const ocup: (ProcessoEx | null)[] = ex.particoes.map(() => null);
    for (const e of ex.eventos) {
      if (e.tipo === 'chegada' && e.particao !== null) ocup[e.particao - 1] = e.processo;
      if (e.tipo === 'termino') ocup[e.particaoLiberada - 1] = e.entra;
    }
    return this.blocos(ocup);
  });

  private blocos(ocup: (ProcessoEx | null)[]): BlocoBarra[] {
    const ex = this.ex.ex();
    if (!ex) return [];
    const out: BlocoBarra[] = [{ inicio: 0, tamanho: SO_FIXAS, tipo: 'so', rotulo: 'SO', detalhe: `${SO_FIXAS} KB` }];
    const inicios = this.ex.inicios();
    ex.particoes.forEach((t, i) => {
      const p = ocup[i];
      if (!p) {
        out.push({ inicio: inicios[i], tamanho: t, tipo: 'livre', rotulo: `Partição ${i + 1}`, detalhe: `${t} KB`, inicioParticao: true });
      } else {
        out.push({ inicio: inicios[i], tamanho: p.tamanho, tipo: 'processo', rotulo: p.nome, detalhe: `${p.tamanho} KB`, cor: this.cores()[p.nome], inicioParticao: true });
        if (t > p.tamanho) out.push({ inicio: inicios[i] + p.tamanho, tamanho: t - p.tamanho, tipo: 'interna', rotulo: 'frag.', detalhe: `${t - p.tamanho} KB` });
      }
    });
    return out;
  }

  classe(c: Correcao): Record<string, boolean> {
    return { acerto: c === true, erro: c === false };
  }

  resp(i: number): RespostaFixa {
    return this.ex.respostas()[i] ?? { particao: '', frag: '', entra: '' };
  }

  /** Processos que já chegaram antes do evento i (candidatos a sair da fila). */
  candidatos(i: number): string[] {
    return (this.ex.ex()?.eventos ?? []).slice(0, i)
      .filter((e): e is Extract<EventoFixa, { tipo: 'chegada' }> => e.tipo === 'chegada').map(e => e.processo.nome);
  }

  explicacao(e: EventoFixa): string {
    const ex = this.ex.ex()!;
    if (e.tipo === 'chegada') {
      if (e.particao === null) {
        return e.externa
          ? `Nenhuma partição livre comporta ${e.processo.tamanho} KB, embora as livres somem o suficiente: fragmentação externa. Vai para a fila.`
          : `Nenhuma partição livre comporta ${e.processo.tamanho} KB. Vai para a fila.`;
      }
      const t = ex.particoes[e.particao - 1];
      return e.frag ? `Partição ${e.particao} (${t} KB): sobram ${e.frag} KB de fragmentação interna.` : `Partição ${e.particao} (${t} KB): encaixe exato.`;
    }
    const t = ex.particoes[e.particaoLiberada - 1];
    return e.entra
      ? `Libera a partição ${e.particaoLiberada} (${t} KB); ${e.entra.nome} (${e.entra.tamanho} KB), o primeiro da fila que cabe, entra nela.`
      : `Libera a partição ${e.particaoLiberada} (${t} KB); ninguém da fila cabe nela.`;
  }
}
