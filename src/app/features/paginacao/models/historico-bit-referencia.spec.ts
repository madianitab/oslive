import { HitoricoBitReferencia } from 'src/app/features/paginacao/models/historico-bit-referencia';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { Pagina } from 'src/app/features/paginacao/models/pagina';
import { MemoriaFisica } from 'src/app/features/paginacao/models/memoria-fisica';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, TAM_HISTORICO_REF } from 'src/app/core/constantes';

function criarMemoriaFisica(tamanho: number): MemoriaFisica[] {
  return Array.from({ length: tamanho }, (_, i) =>
    new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0)
  );
}

describe('HitoricoBitReferencia', () => {
  let hbr: HitoricoBitReferencia;
  let mem: MemoriaFisica[];
  let proc: Processo;

  beforeEach(() => {
    hbr = new HitoricoBitReferencia();
    // TAM=8 — removerProcesso e verificaBitReferencia usam TAM como limite fixo
    mem = criarMemoriaFisica(8);
    proc = new Processo('P1', 9, '#ff0');
  });

  it('primeiraPosicaoDisponivel deve retornar 0 para memoria vazia', () => {
    expect(hbr.primeiraPosicaoDisponivel(mem)).toBe(0);
  });

  it('primeiraPosicaoDisponivel deve retornar -1 para memoria cheia', () => {
    mem.forEach(f => f.nome = 'X');
    expect(hbr.primeiraPosicaoDisponivel(mem)).toBe(-1);
  });

  it('bitAcesso deve retornar array com tamanho correto e valores 0 ou 1', () => {
    const bits = hbr.bitAcesso(TAM_HISTORICO_REF);
    expect(bits.length).toBe(TAM_HISTORICO_REF);
    bits.forEach(b => expect([0, 1]).toContain(b));
  });

  it('verificaBitReferencia deve retornar indice da pagina com menor historico de acesso', () => {
    // BUG CONHECIDO: verificaBitReferencia usa Utils.listaNum(TAM) — sempre inicia com 8 posições
    // O historicoBit precisa ter 8 entradas para nao acessar indice undefined
    // Pagina no indice 1 tem todos zeros → deve ser a vitima
    hbr.lista = Array.from({ length: 8 }, (_, i) => proc.pagina[i]);
    hbr.historicoBit = [
      [1, 1, 1, 1],
      [0, 0, 0, 0], // vitima esperada
      [1, 0, 1, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [0, 0, 1, 1],
      [1, 1, 1, 0],
    ];
    const vitima = hbr.verificaBitReferencia();
    expect(vitima).toBe(1);
  });

  it('verificaBitReferencia quando todos tem bits 1 deve retornar um indice valido', () => {
    hbr.lista = Array.from({ length: 8 }, (_, i) => proc.pagina[i]);
    hbr.historicoBit = Array.from({ length: 8 }, () => [1, 1, 1, 1]);
    const vitima = hbr.verificaBitReferencia();
    expect(vitima).toBeDefined();
    expect(vitima).toBeGreaterThanOrEqual(0);
  });

  it('addPaginaEmMemoriaFisica deve inserir pagina em frame livre', () => {
    const pag = proc.pagina[0];
    hbr.addPaginaEmMemoriaFisica(mem, pag, 1);
    expect(mem[0].nome).toBe(pag.toString());
    expect(pag.indiceMemoriaFisica).toBe(0);
    expect(hbr.lista.length).toBe(1);
    expect(hbr.historicoBit.length).toBe(1);
    expect(hbr.historicoBit[0].length).toBe(TAM_HISTORICO_REF);
  });

  it('addPaginaEmMemoriaFisica deve despejar pagina vitima quando memoria esta cheia', () => {
    // preenche todos os 8 frames (TAM)
    for (let i = 0; i < 8; i++) {
      hbr.addPaginaEmMemoriaFisica(mem, proc.pagina[i], i + 1);
    }

    // forca historico: indice 1 tem todos zeros = vitima
    hbr.historicoBit[0] = [1, 1, 1, 1];
    hbr.historicoBit[1] = [0, 0, 0, 0];
    hbr.historicoBit[2] = [1, 0, 1, 0];
    hbr.historicoBit[3] = [1, 1, 0, 0];
    hbr.historicoBit[4] = [0, 1, 1, 0];
    hbr.historicoBit[5] = [1, 0, 0, 1];
    hbr.historicoBit[6] = [0, 0, 1, 1];
    hbr.historicoBit[7] = [1, 1, 1, 0];

    const paginaVitima = hbr.lista[1];
    hbr.addPaginaEmMemoriaFisica(mem, proc.pagina[8], 9);

    expect(paginaVitima.indiceMemoriaFisica).toBe(-1);
    expect(paginaVitima.timeStamp).toBe(0);
  });

  it('removerProcesso deve liberar frame e resetar pagina', () => {
    const pag = proc.pagina[0];
    hbr.addPaginaEmMemoriaFisica(mem, pag, 1);
    const frame = pag.indiceMemoriaFisica;
    hbr.removerProcesso(mem, pag);

    expect(mem[frame].nome).toBe(STR_MEMORIA_VAZIA);
    expect(pag.indiceMemoriaFisica).toBe(-1);
    expect(hbr.lista.length).toBe(0);
    expect(hbr.historicoBit.length).toBe(0);
  });

  it('removerProcesso deve retornar -1 se pagina nao estiver na memoria', () => {
    const pag = new Pagina('NaoExiste', '#fff', 0);
    expect(() => hbr.removerProcesso(mem, pag)).not.toThrow();
    expect(hbr.removerProcesso(mem, pag)).toBe(-1);
  });
});
