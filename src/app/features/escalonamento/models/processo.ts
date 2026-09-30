export class Processo {
    nome: string;
    chegada: number;
    execucao: number | null;
    prioridade: number | null;
    cor: string;
    tempoEspera: number = 0;
    tempoExecucao: number = 0;
    entrouNaFila: number = 0;
    saiuDaFila: number = 0;

    constructor(
        nome: string,
        chegada: number,
        execucao: number | null,
        prioridade: number | null,
        cor: string
    ) {
        this.nome = nome;
        this.chegada = chegada;
        this.execucao = execucao;
        this.prioridade = prioridade;
        this.cor = cor;
    }

    incrTEspera(): void {
        this.tempoEspera++;
    }

    incrTExecucao(): boolean {
        if (this.execucao != null) {
            this.tempoExecucao += 1;
            return this.tempoExecucao >= this.execucao;
        }
        return false;
    }


    clone(): Processo {
        const clone = new Processo(this.nome, this.chegada, this.execucao, this.prioridade, this.cor);
        clone.tempoEspera = this.tempoEspera;
        clone.tempoExecucao = this.tempoExecucao;
        clone.entrouNaFila = this.entrouNaFila;
        clone.saiuDaFila = this.saiuDaFila;
        clone.prioridade = this.prioridade
        return clone;
    }
}