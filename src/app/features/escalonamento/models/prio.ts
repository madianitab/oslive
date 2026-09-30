import { Processo } from "./processo";
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})

export class Prio {
    listaProcessos: Processo[];

    constructor() {
        this.listaProcessos = [];
    }

    vazio(): boolean {
        return this.listaProcessos.length === 0;
    }

    /**
     * Insere mantendo a fila ordenada por prioridade: quanto MENOR o número,
     * MAIOR a prioridade (0 é a mais alta), igual ao algoritmo preemptivo.
     * Em caso de empate, vale a ordem de chegada (a ordenação é estável).
     */
    addProcesso(processo: Processo): void {
        this.listaProcessos.push(processo);
        this.listaProcessos.sort((a, b) => {
            if (a.prioridade != null && b.prioridade != null) {
                return a.prioridade - b.prioridade;
            }
            return 0;
        });
    }

    escolherProcesso(): Processo | undefined {
        return this.listaProcessos.shift();
    }

    addTEspera(): void {
        for (let processo of this.listaProcessos) {
            processo.incrTEspera();
        }
    }
}
