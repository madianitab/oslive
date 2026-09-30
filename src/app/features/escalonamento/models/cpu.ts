import { Processo } from "./processo";

export class CPU {
    public processo: Processo | null = null;
    public ocupado: boolean = false;

    alocaProcesso(p: Processo | undefined): boolean {
        if (p === undefined) {
            return false; 
        }
        this.processo = p; 
        this.ocupado = true; 
        return true; 
    }
    

    retiraProcesso(): Processo | null {
        const p = this.processo;
        this.processo = null;
        this.ocupado = false;
        return p;
    }

    act(): Processo | null {
        if (!this.ocupado) {
            return null;
        }
        if (this.processo && this.processo.incrTExecucao()) {
            const finishedProcess = this.processo; 
            this.processo = null; 
            this.ocupado = false;
            return finishedProcess;
        }
        return null;
    }
}
