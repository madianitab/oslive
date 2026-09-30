import { Injectable } from '@angular/core';
import { Processo } from '../models/processo';
import { ListaProcessos } from '../models/lista-processos';
import { CPU } from '../models/cpu';
import { FIFO } from '../models/fifo';
import { SJF } from '../models/sjf';
import { Prio } from '../models/prio';
import { PrioP } from '../models/prio-p';

export interface ResultadoCpu {
  tempo: number;
  nome: string;
  cor: string;
  chegada?: number;
  prioridade?: number | null;
}

export interface ConfigMultilevel {
  filaRR1: boolean;
  filaRR2: boolean;
  filaRR3: boolean;
  filaRR4: boolean;
  quantum: number;
  quantum1: number;
  quantum2: number;
  quantum3: number;
}

@Injectable({ providedIn: 'root' })
export class EscalonamentoService {

  simulaFifo(processos: Processo[]): ResultadoCpu[] {
    const escalona = new FIFO();
    const cpu = new CPU();
    const resultado: ResultadoCpu[] = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;

    while (!arrumalista.vazio() || !escalona.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach(p => escalona.addProcesso(p));

      if (!cpu.ocupado && !escalona.vazio()) {
        cpu.alocaProcesso(escalona.escolherProcesso());
      }
      escalona.addTEspera(1);
      resultado.push(cpu.processo
        ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor }
        : { tempo: time, nome: '-', cor: '#FFFFFF' });

      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }

  simulaSJF(processos: Processo[]): ResultadoCpu[] {
    const escalonar = new SJF();
    const cpu = new CPU();
    const resultado: ResultadoCpu[] = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;

    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach(p => escalonar.addProcesso(p));

      if (!cpu.ocupado && !escalonar.vazio()) {
        const escolhido = escalonar.escolherProcesso();
        if (escolhido) cpu.alocaProcesso(escolhido);
      }
      escalonar.addTEspera();
      resultado.push(cpu.processo
        ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor }
        : { tempo: time, nome: '-', cor: '#FFFFFF' });

      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }

  simulaPrio(processos: Processo[]): ResultadoCpu[] {
    const escalona = new Prio();
    const cpu = new CPU();
    const resultado: ResultadoCpu[] = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;

    while (!arrumalista.vazio() || !escalona.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach(p => escalona.addProcesso(p));

      if (!cpu.ocupado && !escalona.vazio()) {
        cpu.alocaProcesso(escalona.escolherProcesso());
      }
      escalona.addTEspera();
      resultado.push(cpu.processo
        ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor }
        : { tempo: time, nome: '-', cor: '#FFFFFF' });

      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }

  simulaPrioPremp(processos: Processo[]): ResultadoCpu[] {
    const escalonar = new PrioP();
    const cpu = new CPU();
    const resultado: ResultadoCpu[] = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;

    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach(p => escalonar.addProcesso(p));

      if (!cpu.ocupado) {
        const proximo = escalonar.escolherProcesso();
        if (proximo) cpu.alocaProcesso(proximo);
      } else {
        const topo = escalonar.topo();
        if (topo?.prioridade != null && cpu.processo?.prioridade != null && cpu.processo.prioridade > topo.prioridade) {
          const interrompido = cpu.retiraProcesso();
          if (interrompido) escalonar.addProcesso(interrompido);
          cpu.alocaProcesso(escalonar.escolherProcesso());
        }
      }

      resultado.push(cpu.processo
        ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor }
        : { tempo: time, nome: '-', cor: '#FFFFFF' });

      const finalizado = cpu.act();
      if (finalizado) {
        arrumalista.addFinalizado(finalizado);
        cpu.alocaProcesso(escalonar.escolherProcesso());
      }
      escalonar.addTEspera();
      time++;
    }
    return resultado;
  }

  simulaRR(processos: Processo[], quantum: number): ResultadoCpu[] {
    const escalonar = new FIFO();
    const cpu = new CPU();
    const resultado: ResultadoCpu[] = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    let tmp = 0;
    let chaveamento = 0;

    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      const prontos = arrumalista.processosPorTempo(time);
      while (prontos.length > 0) escalonar.addProcesso(prontos.shift()!);

      if (chaveamento > 0) {
        const interrompido = cpu.retiraProcesso();
        if (interrompido) escalonar.addProcesso(interrompido);
        chaveamento = 0;
      }

      if (tmp === 0 && !escalonar.vazio()) {
        cpu.alocaProcesso(escalonar.escolherProcesso());
      }

      resultado.push(cpu.processo
        ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor }
        : { tempo: time, nome: '-', cor: '#FFFFFF' });

      if (cpu.ocupado) {
        tmp++;
        const executado = cpu.act();
        if (!cpu.ocupado && executado) {
          arrumalista.addFinalizado(executado);
          tmp = 0;
        }
      }
      escalonar.addTEspera(1);
      time++;

      if (tmp === quantum) {
        tmp = 0;
        chaveamento = 1;
      }
    }
    return resultado;
  }

  simulaMF(processos: Processo[], config: ConfigMultilevel): { resultado: ResultadoCpu[]; filaApto: Processo[]; tabelaResultados: Processo[] } {
    let tempoCpu = 0;
    let quantum = 0;
    let contQuantum = 0;
    let processoAtual: Processo | null = null;
    let algRR = false;

    let filaAptos: Processo[] = [];
    const diagramaCpu: ResultadoCpu[] = [];
    let dadosTabelaResultados: Processo[] = [];
    const filaApto: Processo[] = [];

    const processosOrdenados = [...processos].sort((a, b) => a.chegada - b.chegada);

    for (let i = 0; ; i++) {
      if (processosOrdenados.length === 0 && filaAptos.length === 0 && processoAtual === null) break;
      if (i > 100) return { resultado: diagramaCpu, filaApto, tabelaResultados: dadosTabelaResultados };

      if (processosOrdenados.length > 0 && processosOrdenados[0].chegada === tempoCpu) {
        processosOrdenados[0].entrouNaFila = tempoCpu;
        filaAptos = filaAptos.length > 0
          ? this.atualizarFilaAptos(filaAptos, processosOrdenados[0])
          : [processosOrdenados[0]];
        processosOrdenados.shift();
      }

      let processoAtualAtualizado = false;

      if (filaAptos.length > 0) {
        if (processoAtual === null) {
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (processoAtual.tempoExecucao === processoAtual.execucao) {
          processoAtual.tempoEspera = tempoCpu - (processoAtual.chegada + processoAtual.tempoExecucao!);
          dadosTabelaResultados = this.inserirOrdemChegada(dadosTabelaResultados, processoAtual);
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (filaAptos[0].prioridade! < processoAtual.prioridade!) {
          processoAtual.entrouNaFila = tempoCpu;
          filaAptos = this.atualizarFilaAptos(filaAptos, processoAtual);
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (algRR && quantum === contQuantum) {
          if (filaAptos[0].prioridade === processoAtual.prioridade) {
            processoAtual.entrouNaFila = tempoCpu;
            filaAptos = this.atualizarFilaAptos(filaAptos, processoAtual);
            processoAtual = filaAptos[0];
            processoAtualAtualizado = true;
          }
        }

        if (processoAtualAtualizado) {
          processoAtual.saiuDaFila = tempoCpu;
          if (processoAtual.saiuDaFila > processoAtual.entrouNaFila) {
            filaApto.push(processoAtual.clone());
          }
          quantum = 0;
          contQuantum = 0;
          filaAptos.shift();
        }
      } else {
        if (processoAtual !== null && processoAtual.tempoExecucao === processoAtual.execucao) {
          processoAtual.tempoEspera = tempoCpu - (processoAtual.chegada + processoAtual.tempoExecucao!);
          dadosTabelaResultados = this.inserirOrdemChegada(dadosTabelaResultados, processoAtual);
          processoAtual = null;
        } else if (algRR && quantum === contQuantum) {
          contQuantum = 0;
        }
      }

      if (processoAtual === null && filaAptos.length === 0 && processosOrdenados.length > 0) {
        diagramaCpu.push({ tempo: tempoCpu, nome: '-', cor: '#FFFFFF' });
        tempoCpu++;
        continue;
      }

      if (processoAtualAtualizado) {
        switch (processoAtual!.prioridade) {
          case 0: algRR = config.filaRR1; if (algRR) quantum = config.quantum; break;
          case 1: algRR = config.filaRR2; if (algRR) quantum = config.quantum1; break;
          case 2: algRR = config.filaRR3; if (algRR) quantum = config.quantum2; break;
          case 3: algRR = config.filaRR4; if (algRR) quantum = config.quantum3; break;
          default: algRR = false;
        }
      }

      contQuantum += algRR ? 1 : 0;
      if (processoAtual !== null) {
        if (processoAtual.tempoExecucao === undefined) processoAtual.tempoExecucao = 0;
        processoAtual.tempoExecucao++;
        diagramaCpu.push({ tempo: tempoCpu, nome: processoAtual.nome, chegada: processoAtual.chegada, cor: processoAtual.cor, prioridade: processoAtual.prioridade });
      }
      tempoCpu++;
    }

    return { resultado: diagramaCpu, filaApto, tabelaResultados: dadosTabelaResultados };
  }

  atualizarFilaAptos(filaAptos: Processo[], processo: Processo): Processo[] {
    let inseriu = false;
    for (let i = 0; i < filaAptos.length; i++) {
      if (processo.prioridade != null && processo.prioridade < filaAptos[i].prioridade!) {
        filaAptos.splice(i, 0, processo);
        inseriu = true;
        break;
      }
    }
    if (!inseriu) filaAptos.push(processo);
    return filaAptos;
  }

  validarPrio(lista: Processo[]): boolean {
    return lista.every(p => p.prioridade != null);
  }

  inserirOrdemChegada(lista: Processo[], processo: Processo): Processo[] {
    let inseriu = false;
    for (let i = 0; i < lista.length; i++) {
      if (processo.chegada < lista[i].chegada) {
        lista.splice(i, 0, processo.clone());
        inseriu = true;
        break;
      }
    }
    if (!inseriu) lista.push(processo.clone());
    return lista;
  }
}
