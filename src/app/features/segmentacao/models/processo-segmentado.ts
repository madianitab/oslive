export class ProcessoSegmentado {
  nome: string = '';
  segmentos: Array<{ nome: string, tamanho: number }> = [];

  constructor(nome: string) {
    this.nome = nome;
  }
}