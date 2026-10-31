import { NAO_SE_APLICA } from './corrigir';
import { Campo, Celula } from './tipos';

/** Monta os campos e o gabarito de uma questão ao mesmo tempo. */
export class Montador {
  readonly campos: Campo[] = [];
  readonly gabarito: Record<string, string> = {};

  /** Registra o campo e devolve a célula que o mostra na tabela; valor null = "-" (não se aplica). */
  campo(c: Campo, valor: string | number | null): Celula {
    this.campos.push(c);
    this.gabarito[c.id] = valor === null ? NAO_SE_APLICA : String(valor);
    return { campo: c.id };
  }
}
