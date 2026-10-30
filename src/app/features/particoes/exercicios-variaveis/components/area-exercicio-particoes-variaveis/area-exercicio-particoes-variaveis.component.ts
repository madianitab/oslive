import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { gera_cor } from 'src/app/core/utils';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { BarraMemoriaComponent, BlocoBarra } from 'src/app/features/particoes/components/barra-memoria/barra-memoria.component';
import { ALGORITMOS_FIT } from 'src/app/features/particoes/models/particoes';
import { AlocadoEx, EventoVar, SO_VAR, TOTAL_VAR, lacunasVar } from 'src/app/features/particoes/models/exercicios-particoes';
import {
  Correcao,
  ExercicioParticoesVariaveisService,
  RespostaAlocacao,
  TIPOS_EX_VAR,
} from 'src/app/features/particoes/services/exercicio-particoes-variaveis.service';

@Component({
  selector: 'app-area-exercicio-particoes-variaveis',
  templateUrl: './area-exercicio-particoes-variaveis.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', '../../../exercicios.css'],
  standalone: true,
  imports: [FormsModule, NgClass, OsStatComponent, OsButtonComponent, BarraMemoriaComponent],
})
export class AreaExercicioParticoesVariaveisComponent {
  readonly total = TOTAL_VAR;
  readonly so = SO_VAR;

  constructor(public ex: ExercicioParticoesVariaveisService) {}

  readonly nomeTipo = computed(() => ({ ALOCACAO: 'Alocação', LACUNAS: 'Tabela de lacunas', COMPACTACAO: 'Compactação' })[this.ex.tipo()]);
  readonly descricaoTipo = computed(() => TIPOS_EX_VAR.find(t => t.valor === this.ex.tipo())?.descricao ?? '');
  readonly nomeAlgoritmo = computed(() => ALGORITMOS_FIT.find(a => a.valor === this.ex.algoritmo())?.nome ?? '');
  readonly mostrarGabarito = computed(() => this.ex.corrigido() || this.ex.mostrarResposta());

  /** Cor fixa por processo, sorteada uma vez por exercício. */
  readonly cores = computed(() => {
    const nomes = new Set<string>();
    this.ex.alocacao()?.inicial.alocados.forEach(a => nomes.add(a.nome));
    this.ex.chegadas().forEach(n => nomes.add(n));
    this.ex.lacunas()?.alocados.forEach(a => nomes.add(a.nome));
    this.ex.compactacao()?.alocados.forEach(a => nomes.add(a.nome));
    const usadas: { cor: string }[] = [];
    const mapa: Record<string, string> = {};
    [...nomes].forEach(n => { const cor = gera_cor(usadas); usadas.push({ cor }); mapa[n] = cor; });
    return mapa;
  });

  blocos(alocados: AlocadoEx[], marcador?: number): BlocoBarra[] {
    const out: BlocoBarra[] = [{ inicio: 0, tamanho: SO_VAR, tipo: 'so', rotulo: 'SO', detalhe: `${SO_VAR} KB` }];
    alocados.forEach(a => out.push({ inicio: a.base, tamanho: a.tamanho, tipo: 'processo', rotulo: a.nome, detalhe: `${a.tamanho} KB`, cor: this.cores()[a.nome] }));
    lacunasVar(alocados).forEach(l => out.push({
      inicio: l.inicio, tamanho: l.tamanho, tipo: 'livre', rotulo: 'livre', detalhe: `${l.tamanho} KB`,
      marcador: marcador !== undefined && marcador >= l.inicio && marcador < l.inicio + l.tamanho ? 'ponteiro' : undefined,
    }));
    return out.sort((a, b) => a.inicio - b.inicio);
  }

  readonly blocosCompactados = computed(() => {
    const c = this.ex.compactacao();
    if (!c) return [];
    return this.blocos(c.alocados.map(a => ({ ...a, base: c.novasBases[a.nome] })));
  });

  classe(c: Correcao): Record<string, boolean> {
    return { acerto: c === true, erro: c === false };
  }

  resp(i: number): RespostaAlocacao {
    return this.ex.respAlocacao()[i] ?? { resultado: '', base: '', entra: '', baseEntra: '' };
  }

  candidatos(i: number): string[] {
    return (this.ex.alocacao()?.eventos ?? []).slice(0, i)
      .filter((e): e is Extract<EventoVar, { tipo: 'chegada' }> => e.tipo === 'chegada').map(e => e.processo.nome);
  }

  nomeResultado(r: string): string {
    return ({ alocado: 'Alocado', fragmentacao: 'Frag. externa', insuficiente: 'Mem. insuficiente' } as Record<string, string>)[r] ?? r;
  }

  explicacao(e: EventoVar): string {
    if (e.tipo === 'chegada') {
      if (e.resultado === 'alocado') return `${e.processo.nome} vai para a lacuna que começa em ${e.base} KB.`;
      if (e.resultado === 'fragmentacao') return `Há memória livre suficiente no total, mas nenhuma lacuna comporta ${e.processo.tamanho} KB: fragmentação externa. Vai para a fila.`;
      return `A memória livre total é menor que ${e.processo.tamanho} KB: memória insuficiente. Vai para a fila.`;
    }
    const lib = `Libera ${e.liberado.tamanho} KB em ${e.liberado.inicio} KB (lacunas vizinhas se unem)`;
    return e.entra ? `${lib}; ${e.entra.nome}, da fila, entra em ${e.baseEntra} KB.` : `${lib}; ninguém da fila cabe.`;
  }
}
