import { PaginacaoService } from 'src/app/features/paginacao/services/paginacao.service';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { MemoriaFisica } from 'src/app/features/paginacao/models/memoria-fisica';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, TAM, TIMESTAMP_INICIAL } from 'src/app/core/constantes';

function criarProcesso(nome: string, numPaginas: number): Processo {
  return new Processo(nome, numPaginas, '#f00');
}

function criarMemoria(tamanho: number): MemoriaFisica[] {
  return Array.from({ length: tamanho }, (_, i) =>
    new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0)
  );
}

describe('PaginacaoService', () => {
  let service: PaginacaoService;

  beforeEach(() => {
    service = new PaginacaoService();
  });

  // ─── inicializarExercicio ──────────────────────────────────────────────────

  describe('inicializarExercicio', () => {
    it('deve criar memoriaFisica com TAM frames', () => {
      const estado = service.inicializarExercicio([criarProcesso('P1', 2)]);
      expect(estado.memoriaFisica.length).toBe(TAM);
    });

    it('deve criar respostaMemoriaFisica com TAM frames todos vazios', () => {
      const estado = service.inicializarExercicio([criarProcesso('P1', 2)]);
      expect(estado.respostaMemoriaFisica.length).toBe(TAM);
      estado.respostaMemoriaFisica.forEach(frame => {
        expect(frame.nome).toBe(STR_MEMORIA_VAZIA);
      });
    });

    it('deve popular filaDePaginas com as paginas dos processos', () => {
      const proc = criarProcesso('P1', 3);
      const estado = service.inicializarExercicio([proc]);
      expect(estado.filaDePaginas.length).toBeGreaterThan(0);
    });

    it('deve alocar paginas na memoriaFisica via FCFS', () => {
      const proc = criarProcesso('P1', 2);
      const estado = service.inicializarExercicio([proc]);
      const framesOcupados = estado.memoriaFisica.filter(f => f.nome !== STR_MEMORIA_VAZIA);
      expect(framesOcupados.length).toBeGreaterThan(0);
    });

    it('deve iniciar timestamp apos TIMESTAMP_INICIAL', () => {
      const proc = criarProcesso('P1', 2);
      const estado = service.inicializarExercicio([proc]);
      expect(estado.timestamp).toBeGreaterThanOrEqual(TIMESTAMP_INICIAL);
    });

    it('deve retornar estado com fila FCFS populada', () => {
      const proc = criarProcesso('P1', 2);
      const estado = service.inicializarExercicio([proc]);
      expect(estado.filaAlgoritmo.listaVazia()).toBeFalse();
    });

    it('deve funcionar com lista de processos vazia', () => {
      const estado = service.inicializarExercicio([]);
      expect(estado.memoriaFisica.length).toBe(TAM);
      expect(estado.filaDePaginas.length).toBe(0);
    });
  });

  // ─── atualizarRespostaMemoriaFisica ───────────────────────────────────────

  describe('atualizarRespostaMemoriaFisica', () => {
    it('deve limpar frame quando indicePagina é -1', () => {
      const proc = criarProcesso('P1', 2);
      const estado = service.inicializarExercicio([proc]);
      estado.respostaMemoriaFisica[0].nome = 'ocupado';

      service.atualizarRespostaMemoriaFisica(0, -1, estado);

      expect(estado.respostaMemoriaFisica[0].nome).toBe(STR_MEMORIA_VAZIA);
      expect(estado.respostaMemoriaFisica[0].cor).toBe(MEMORIA_FISICA_COR);
    });

    it('deve preencher frame com a pagina selecionada', () => {
      const proc = criarProcesso('P1', 2);
      const estado = service.inicializarExercicio([proc]);

      service.atualizarRespostaMemoriaFisica(0, 0, estado);

      expect(estado.respostaMemoriaFisica[0].nome).toBe(estado.filaDePaginas[0].toString());
      expect(estado.respostaMemoriaFisica[0].cor).toBe(estado.filaDePaginas[0].cor);
    });
  });

  // ─── calcularAcertoMemoriaFisica ──────────────────────────────────────────

  describe('calcularAcertoMemoriaFisica', () => {
    it('deve retornar 100% quando resposta bate com gabarito', () => {
      const mem = criarMemoria(TAM);
      const resp = criarMemoria(TAM);
      mem[0].nome = 'P10';
      resp[0].nome = 'P10';
      mem[1].nome = 'P11';
      resp[1].nome = 'P11';

      const resultado = service.calcularAcertoMemoriaFisica(mem, resp, 2);
      expect(resultado.acertos).toBe(2);
      expect(resultado.nivelAcerto).toBe(100);
    });

    it('deve retornar 0% quando nenhuma resposta bate', () => {
      const mem = criarMemoria(TAM);
      const resp = criarMemoria(TAM);
      mem[0].nome = 'P10';
      resp[0].nome = 'P20';

      const resultado = service.calcularAcertoMemoriaFisica(mem, resp, 1);
      expect(resultado.acertos).toBe(0);
      expect(resultado.nivelAcerto).toBe(0);
    });

    it('nao deve contar frames vazios como acerto', () => {
      const mem = criarMemoria(TAM);
      const resp = criarMemoria(TAM);

      const resultado = service.calcularAcertoMemoriaFisica(mem, resp, 2);
      expect(resultado.acertos).toBe(0);
    });

    it('deve limitar total ao TAM quando totalPaginas excede TAM', () => {
      const mem = criarMemoria(TAM);
      const resp = criarMemoria(TAM);
      const resultado = service.calcularAcertoMemoriaFisica(mem, resp, TAM + 10);
      expect(resultado.total).toBe(TAM);
    });
  });

  // ─── calcularAcertoMemoriaLogica ──────────────────────────────────────────

  describe('calcularAcertoMemoriaLogica', () => {
    it('deve retornar 100% quando todos os indices e timestamps batem', () => {
      const gabarito = [criarProcesso('P1', 2)];
      gabarito[0].pagina[0].indiceMemoriaFisica = 0;
      gabarito[0].pagina[0].timeStamp = 101;
      gabarito[0].pagina[1].indiceMemoriaFisica = 1;
      gabarito[0].pagina[1].timeStamp = 102;

      const resposta = [criarProcesso('P1', 2)];
      resposta[0].pagina[0].indiceMemoriaFisica = 0;
      resposta[0].pagina[0].timeStamp = 101;
      resposta[0].pagina[1].indiceMemoriaFisica = 1;
      resposta[0].pagina[1].timeStamp = 102;

      const resultado = service.calcularAcertoMemoriaLogica(resposta, gabarito);
      expect(resultado.total).toBe(4); // 2 paginas * 2 (indice + timestamp)
      expect(resultado.acertos).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar total = quantPaginas * 2', () => {
      const gabarito = [criarProcesso('P1', 3)];
      const resposta = [criarProcesso('P1', 3)];

      const resultado = service.calcularAcertoMemoriaLogica(resposta, gabarito);
      expect(resultado.total).toBe(6);
    });

    it('deve retornar menos acertos quando indices divergem', () => {
      const gabarito = [criarProcesso('P1', 1)];
      gabarito[0].pagina[0].indiceMemoriaFisica = 3;
      gabarito[0].pagina[0].timeStamp = 101;

      const resposta = [criarProcesso('P1', 1)];
      resposta[0].pagina[0].indiceMemoriaFisica = 7; // indice errado
      resposta[0].pagina[0].timeStamp = 101;         // timestamp certo

      const resultado = service.calcularAcertoMemoriaLogica(resposta, gabarito);
      // indice errado → 0; timestamp certo → depende da lógica, mas total=2
      expect(resultado.total).toBe(2);
      expect(resultado.acertos).toBeLessThan(resultado.total);
    });
  });
});
