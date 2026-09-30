import { Pagina } from './pagina';
import { MemoriaFisica } from './memoria-fisica';

export type TipoPasso = 'hit' | 'fault';

export interface PassoPaginacao {
  /** posição na trilha, 0..M-1 */
  indice: number;
  /** página que o processo referenciou neste passo */
  paginaReferenciada: Pagina;
  /** hit = já estava na RAM; fault = precisou carregar do disco */
  tipo: TipoPasso;
  /** quadro onde a página entrou (fault) ou onde já estava (hit) */
  quadroDestino: number;
  /** página removida, quando houve substituição (RAM cheia) */
  vitima?: Pagina;
  /** quadro de onde a vítima saiu */
  quadroVitima?: number;
  /** snapshot IMUTÁVEL da memória física APÓS aplicar este passo */
  memoriaFisica: MemoriaFisica[];
  /** texto legível em PT-BR descrevendo o passo */
  narrativa: string;
}
