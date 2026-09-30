import { SegundaChance } from 'src/app/features/paginacao/models/segunda-chance';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { Pagina } from 'src/app/features/paginacao/models/pagina';
import { MemoriaFisica } from 'src/app/features/paginacao/models/memoria-fisica';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR } from 'src/app/core/constantes';

function criarMemoriaFisica(tamanho: number): MemoriaFisica[] {
  return Array.from({ length: tamanho }, (_, i) =>
    new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0)
  );
}

describe('SegundaChance', () => {
  let sc: SegundaChance;
  let mem: MemoriaFisica[];
  let proc: Processo;

  beforeEach(() => {
    sc = new SegundaChance();
    // TAM=8 — removerProcesso itera até TAM, memória precisa ter 8 frames
    mem = criarMemoriaFisica(8);
    proc = new Processo('P1', 9, '#0f0');
  });

  it('primeiraPosicaoDisponivel deve retornar 0 para memoria vazia', () => {
    expect(sc.primeiraPosicaoDisponivel(mem)).toBe(0);
  });

  it('primeiraPosicaoDisponivel deve retornar -1 para memoria cheia', () => {
    mem.forEach(f => f.nome = 'X');
    expect(sc.primeiraPosicaoDisponivel(mem)).toBe(-1);
  });

  it('paginaVitimaEscolhida deve retornar primeiro indice com bit 0', () => {
    sc.bitReferencia = [1, 0, 1];
    expect(sc.paginaVitimaEscolhida()).toBe(1);
  });

  it('paginaVitimaEscolhida deve retornar 0 se todos bits sao 1', () => {
    sc.bitReferencia = [1, 1, 1];
    expect(sc.paginaVitimaEscolhida()).toBe(0);
  });

  it('segundaChance deve zerar bits 1 e retornar indice da vitima', () => {
    sc.lista = [proc.pagina[0], proc.pagina[1], proc.pagina[2]];
    sc.bitReferencia = [1, 1, 0];

    const vitima = sc.segundaChance(10);
    expect(vitima).toBe(0);
  });

  it('addPaginaEmMemoriaFisica deve inserir em frame livre', () => {
    sc.addPaginaEmMemoriaFisica(mem, proc.pagina[0], 1);
    expect(mem[0].nome).toBe(proc.pagina[0].toString());
    expect(proc.pagina[0].indiceMemoriaFisica).toBe(0);
  });

  it('addPaginaEmMemoriaFisica deve usar segunda chance quando memoria cheia com bit 0', () => {
    // preenche todos os 8 frames (TAM)
    for (let i = 0; i < 8; i++) {
      sc.addPaginaEmMemoriaFisica(mem, proc.pagina[i], i + 1);
    }

    // força todos os bits de referência para 0
    sc.bitReferencia = [0, 0, 0, 0, 0, 0, 0, 0];
    const paginaVitima = sc.lista[0];

    sc.addPaginaEmMemoriaFisica(mem, proc.pagina[8], 9);

    expect(paginaVitima.indiceMemoriaFisica).toBe(-1);
  });

  it('removerProcesso deve liberar frame e resetar pagina', () => {
    const pag = proc.pagina[0];
    sc.addPaginaEmMemoriaFisica(mem, pag, 1);
    const frame = pag.indiceMemoriaFisica;
    sc.removerProcesso(mem, pag);

    expect(mem[frame].nome).toBe(STR_MEMORIA_VAZIA);
    expect(pag.indiceMemoriaFisica).toBe(-1);
    expect(sc.lista.length).toBe(0);
    expect(sc.bitReferencia.length).toBe(0);
  });

  it('removerProcesso deve retornar -1 se pagina nao estiver na memoria', () => {
    const pag = new Pagina('NaoExiste', '#fff', 0);
    expect(() => sc.removerProcesso(mem, pag)).not.toThrow();
    expect(sc.removerProcesso(mem, pag)).toBe(-1);
  });
});
