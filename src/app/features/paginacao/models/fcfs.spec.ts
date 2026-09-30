import { FCFS } from 'src/app/features/paginacao/models/fcfs';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { Pagina } from 'src/app/features/paginacao/models/pagina';
import { MemoriaFisica } from 'src/app/features/paginacao/models/memoria-fisica';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR } from 'src/app/core/constantes';

function criarMemoriaFisica(tamanho: number): MemoriaFisica[] {
  return Array.from({ length: tamanho }, (_, i) =>
    new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0)
  );
}

describe('FCFS (Paginacao)', () => {
  let fcfs: FCFS;
  let mem: MemoriaFisica[];
  let proc: Processo;

  beforeEach(() => {
    fcfs = new FCFS();
    // TAM=8 — removerProcesso itera até TAM, memória precisa ter 8 frames
    mem = criarMemoriaFisica(8);
    proc = new Processo('P1', 4, '#00f');
  });

  it('deve iniciar com lista vazia', () => {
    expect(fcfs.listaVazia()).toBeTrue();
  });

  it('primeiraPosicaoDisponivel deve retornar indice do primeiro frame livre', () => {
    expect(fcfs.primeiraPosicaoDisponivel(mem)).toBe(0);
  });

  it('primeiraPosicaoDisponivel deve retornar -1 quando memoria esta cheia', () => {
    mem.forEach(f => f.nome = 'ocupado');
    expect(fcfs.primeiraPosicaoDisponivel(mem)).toBe(-1);
  });

  it('addPaginaEmMemoriaFisica deve inserir pagina em frame livre', () => {
    const pag = proc.pagina[0];
    fcfs.addPaginaEmMemoriaFisica(mem, pag, 1);
    expect(mem[0].nome).toBe(pag.toString());
    expect(pag.indiceMemoriaFisica).toBe(0);
    expect(fcfs.listaVazia()).toBeFalse();
  });

  it('addPaginaEmMemoriaFisica deve despejar pagina mais antiga quando memoria esta cheia', () => {
    // preenche 8 frames (TAM)
    const proc2 = new Processo('P2', 8, '#f0f');
    for (let i = 0; i < 8; i++) {
      fcfs.addPaginaEmMemoriaFisica(mem, proc2.pagina[i], i + 1);
    }

    const paginaMaisAntiga = proc2.pagina[0];
    const frameAntigo = paginaMaisAntiga.indiceMemoriaFisica;

    // nova pagina deve despejar a mais antiga
    const novaPag = proc.pagina[0];
    fcfs.addPaginaEmMemoriaFisica(mem, novaPag, 9);

    expect(paginaMaisAntiga.indiceMemoriaFisica).toBe(-1);
    expect(paginaMaisAntiga.timeStamp).toBe(0);
    expect(novaPag.indiceMemoriaFisica).toBe(frameAntigo);
  });

  it('removerProcesso deve liberar o frame e resetar pagina', () => {
    const pag = proc.pagina[0];
    fcfs.addPaginaEmMemoriaFisica(mem, pag, 1);
    const frame = pag.indiceMemoriaFisica;
    fcfs.removerProcesso(mem, pag);

    expect(mem[frame].nome).toBe(STR_MEMORIA_VAZIA);
    expect(mem[frame].cor).toBe(MEMORIA_FISICA_COR);
    expect(pag.indiceMemoriaFisica).toBe(-1);
    expect(pag.timeStamp).toBe(0);
  });

  it('removerProcesso deve retornar -1 se pagina nao estiver na memoria', () => {
    const pag = new Pagina('NaoExiste', '#fff', 0);
    expect(() => fcfs.removerProcesso(mem, pag)).not.toThrow();
    expect(fcfs.removerProcesso(mem, pag)).toBe(-1);
  });
});
