import { FIFO } from 'src/app/features/paginacao/models/fifo';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { MemoriaFisica } from 'src/app/features/paginacao/models/memoria-fisica';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR } from 'src/app/core/constantes';

function criarMemoriaFisica(tamanho: number): MemoriaFisica[] {
  return Array.from({ length: tamanho }, (_, i) =>
    new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0)
  );
}

describe('FIFO (Paginacao)', () => {
  let fifo: FIFO;
  let mem: MemoriaFisica[];
  let proc: Processo;

  beforeEach(() => {
    fifo = new FIFO();
    // TAM=8 — removerProcesso itera até TAM, memória precisa ter 8 frames
    mem = criarMemoriaFisica(8);
    proc = new Processo('P1', 4, '#f00');
  });

  it('deve iniciar com lista vazia', () => {
    expect(fifo.listaVazia()).toBeTrue();
  });

  it('memoriaFisicaCheia deve retornar indice do primeiro frame livre', () => {
    expect(fifo.memoriaFisicaCheia(mem)).toBe(0);
  });

  it('memoriaFisicaCheia deve retornar -1 quando memoria esta cheia', () => {
    mem.forEach(f => f.nome = 'ocupado');
    expect(fifo.memoriaFisicaCheia(mem)).toBe(-1);
  });

  it('addPaginaEmMemoriaFisica deve inserir pagina em frame livre', () => {
    fifo.addPaginaEmMemoriaFisica(mem, proc, 0, 1);
    expect(mem[0].nome).toBe(proc.pagina[0].toString());
    expect(proc.pagina[0].indiceMemoriaFisica).toBe(0);
    expect(fifo.listaVazia()).toBeFalse();
  });

  it('addPaginaEmMemoriaFisica deve despejar a pagina mais antiga quando memoria esta cheia', () => {
    // preenche todos os 8 frames (TAM)
    const proc8 = new Processo('P8', 8, '#f00');
    for (let i = 0; i < 8; i++) {
      fifo.addPaginaEmMemoriaFisica(mem, proc8, i, i + 1);
    }

    const paginaMaisAntiga = proc8.pagina[0];
    const frameAntigo = paginaMaisAntiga.indiceMemoriaFisica;

    // nova pagina deve despejar a mais antiga
    fifo.addPaginaEmMemoriaFisica(mem, proc, 0, 9);

    expect(paginaMaisAntiga.indiceMemoriaFisica).toBe(-1);
    expect(paginaMaisAntiga.timeStamp).toBe(0);
    expect(proc.pagina[0].indiceMemoriaFisica).toBe(frameAntigo);
  });

  it('removerProcesso deve liberar o frame e resetar pagina', () => {
    fifo.addPaginaEmMemoriaFisica(mem, proc, 0, 1);
    const frameAntes = proc.pagina[0].indiceMemoriaFisica;
    fifo.removerProcesso(mem, proc, 0);

    expect(mem[frameAntes].nome).toBe(STR_MEMORIA_VAZIA);
    expect(mem[frameAntes].cor).toBe(MEMORIA_FISICA_COR);
    expect(proc.pagina[0].indiceMemoriaFisica).toBe(-1);
    expect(proc.pagina[0].timeStamp).toBe(0);
  });

  it('removerProcesso deve retornar -1 se pagina nao estiver na memoria', () => {
    expect(() => fifo.removerProcesso(mem, proc, 0)).not.toThrow();
    expect(fifo.removerProcesso(mem, proc, 0)).toBe(-1);
  });
});
