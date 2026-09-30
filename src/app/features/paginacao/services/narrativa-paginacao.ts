import { PassoPaginacao } from '../models/passo-paginacao';

type DadosNarrativa = Pick<PassoPaginacao, 'paginaReferenciada' | 'tipo' | 'quadroDestino'> &
  Partial<Pick<PassoPaginacao, 'vitima' | 'quadroVitima'>>;

export function narrarPasso(passo: DadosNarrativa): string {
  const pag = passo.paginaReferenciada.toString();
  if (passo.tipo === 'hit') {
    return `Acesso a ${pag}: a página já está na memória física (quadro ${passo.quadroDestino}). Nenhuma substituição.`;
  }
  if (passo.vitima) {
    return `Falta de página em ${pag}: memória cheia → remove ${passo.vitima.toString()} (mais antiga, FIFO) do quadro ${passo.quadroVitima} e carrega ${pag} no quadro ${passo.quadroDestino}.`;
  }
  return `Falta de página em ${pag}: carrega do disco para o quadro ${passo.quadroDestino} (havia quadro livre).`;
}
