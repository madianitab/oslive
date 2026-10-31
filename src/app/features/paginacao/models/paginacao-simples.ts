/** Modelo da paginação simples (sem Angular): páginas e quadros de 4 bytes, 8 quadros. */
export const TAMANHO_PAGINA = 4;          // bytes por página/quadro
export const QUANTIDADE_QUADROS = 8;      // memória física de 32 bytes
export const MAX_BYTES_PROCESSO = 16;     // até 4 páginas por processo
export const NOMES_PROCESSOS_SIMPLES = ['A', 'B', 'C', 'D', 'E', 'F'];

export function binario(valor: number, bits: number): string {
  return valor.toString(2).padStart(bits, '0');
}
