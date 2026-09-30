import { Processo } from "./processo";

export class ListaProcessos {

  private listaProcessos: Processo[];
  private listaFinalizados: Processo[];

  constructor(Processos: Processo[]) {
    this.listaProcessos = Processos;
    this.listaFinalizados = [];

    this.listaProcessos.sort((a, b) => a.chegada - b.chegada);
  }

  vazio(): boolean {
    return this.listaProcessos.length === 0;
  }

  processosPorTempo(tempo: number): Processo[] {
    const processosProntos = this.listaProcessos.filter(p => p.chegada <= tempo);
    this.listaProcessos = this.listaProcessos.filter(p => p.chegada > tempo);
    return processosProntos;
  }


  addFinalizado(p: Processo | null): void {
    if (p) {
      this.listaFinalizados.push(p);
    }
  }

  tabelaResultado(listProcessos?: Processo[]): any[] {
    const listAux = listProcessos ?? this.listaFinalizados;
    let espMed = 0;
    let execMed = 0;
    let turnMed = 0;
    let aux;
    var resultado = []

    for (let i in listAux) {
      aux = listAux[i];
      if (aux.execucao != null) {
        espMed += aux.tempoEspera;
        execMed += aux.execucao;
        turnMed += aux.tempoEspera + aux.execucao;
        resultado.push({ nome: aux.nome, espera: aux.tempoEspera, execucao: aux.execucao, turn: aux.tempoEspera + aux.execucao });
      }
    }
    espMed = parseFloat((espMed / listAux.length).toFixed(2));
    execMed = parseFloat((execMed / listAux.length).toFixed(2));
    turnMed = parseFloat((turnMed / listAux.length).toFixed(2));
    resultado.push({ nome: "Média", espera: espMed, execucao: execMed, turn: turnMed });

    return resultado;
  }

}

