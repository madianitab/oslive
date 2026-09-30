import { SegmentacaoService, Memory, GapTable, ColorPalette } from './segmentacao.service';

describe('SegmentacaoService', () => {
  let service: SegmentacaoService;

  beforeEach(() => {
    service = new SegmentacaoService();
  });

  // ─── criarEstadoInicial ──────────────────────────────────────────────────

  describe('criarEstadoInicial', () => {
    it('deve criar memória com 32 frames vazios', () => {
      const state = service.criarEstadoInicial();
      expect(state.tableMemory.length).toBe(32);
      state.tableMemory.forEach(row => {
        expect(row[1]).toBe('');
        expect(row[2]).toBe('');
      });
    });

    it('deve iniciar com uma lacuna de tamanho 32', () => {
      const state = service.criarEstadoInicial();
      expect(state.tabelaLacunas).toEqual([[0, 31, 32]]);
    });

    it('deve retornar cópias independentes a cada chamada', () => {
      const s1 = service.criarEstadoInicial();
      const s2 = service.criarEstadoInicial();
      s1.tableMemory[0][1] = 'X';
      expect(s2.tableMemory[0][1]).toBe('');
    });
  });

  // ─── decimalToBinary ─────────────────────────────────────────────────────

  describe('decimalToBinary', () => {
    it('deve converter 0 para 00000', () => {
      expect(service.decimalToBinary(0)).toBe('00000');
    });

    it('deve converter 1 para 00001', () => {
      expect(service.decimalToBinary(1)).toBe('00001');
    });

    it('deve converter 31 para 11111', () => {
      expect(service.decimalToBinary(31)).toBe('11111');
    });

    it('deve sempre retornar 5 dígitos', () => {
      [2, 5, 10, 16, 20].forEach(n => {
        expect(service.decimalToBinary(n).length).toBe(5);
      });
    });
  });

  // ─── validInput ──────────────────────────────────────────────────────────

  describe('validInput', () => {
    it('deve retornar true com todos os campos válidos', () => {
      expect(service.validInput('A', 2, 3, 1)).toBeTrue();
    });

    it('deve retornar false com nome vazio', () => {
      expect(service.validInput('', 2, 3, 1)).toBeFalse();
    });

    it('deve retornar false com segmentos zero ou negativos', () => {
      expect(service.validInput('A', 0, 3, 1)).toBeFalse();
      expect(service.validInput('A', 2, -1, 1)).toBeFalse();
      expect(service.validInput('A', 2, 3, 0)).toBeFalse();
    });
  });

  // ─── orderSegments ───────────────────────────────────────────────────────

  describe('orderSegments', () => {
    it('deve colocar C primeiro quando código é o menor', () => {
      const seg = service.orderSegments(1, 2, 3, 1, 2, 3);
      expect(seg[0]).toBe('C');
    });

    it('deve colocar D primeiro quando dados é o menor', () => {
      const seg = service.orderSegments(1, 2, 3, 2, 1, 3);
      expect(seg[0]).toBe('D');
    });

    it('deve colocar P primeiro quando pilha é o menor', () => {
      const seg = service.orderSegments(1, 2, 3, 3, 2, 1);
      expect(seg[0]).toBe('P');
    });

    it('deve retornar exatamente C, D e P', () => {
      const seg = service.orderSegments(2, 3, 4, 2, 3, 4);
      expect(seg.sort()).toEqual(['C', 'D', 'P']);
    });
  });

  // ─── reorder ─────────────────────────────────────────────────────────────

  describe('reorder', () => {
    it('deve ordenar lacunas por tamanho crescente', () => {
      const lacunas: GapTable = [[10, 15, 6], [0, 2, 3], [20, 25, 6]];
      const ordenado = service.reorder(lacunas);
      expect(ordenado[0][2]).toBe(3);
    });

    it('não deve modificar o array original', () => {
      const lacunas: GapTable = [[0, 9, 10], [15, 20, 6]];
      service.reorder(lacunas);
      expect(lacunas[0][2]).toBe(10);
    });
  });

  // ─── fillLacuna e fillLacunaTemp ─────────────────────────────────────────

  describe('fillLacuna', () => {
    it('deve remover lacuna quando fill = tamanho total', () => {
      const lacunas: GapTable = [[0, 3, 4]];
      const result = service.fillLacuna(lacunas, 0, 4);
      expect(result.length).toBe(0);
    });

    it('deve reduzir lacuna quando fill < tamanho', () => {
      const lacunas: GapTable = [[0, 9, 10]];
      const result = service.fillLacuna(lacunas, 0, 3);
      expect(result[0][0]).toBe(3);
      expect(result[0][2]).toBe(7);
    });

    it('não deve modificar o array original', () => {
      const lacunas: GapTable = [[0, 9, 10]];
      service.fillLacuna(lacunas, 0, 3);
      expect(lacunas[0][0]).toBe(0);
    });
  });

  describe('fillLacunaTemp', () => {
    it('deve ter o mesmo comportamento que fillLacuna', () => {
      const lacunas: GapTable = [[0, 9, 10]];
      const result = service.fillLacunaTemp(lacunas, 0, 3);
      expect(result[0][0]).toBe(3);
      expect(result[0][2]).toBe(7);
    });
  });

  // ─── insertMemory e insertMemoryTemp ─────────────────────────────────────

  describe('insertMemory', () => {
    it('deve preencher frames com chave e nome do processo', () => {
      const mem: Memory = Array.from({ length: 5 }, (_, i) => [String(i), '', '']);
      const result = service.insertMemory(mem, 'A', 'C', 2, 0);
      expect(result[0][1]).toBe('C1');
      expect(result[0][2]).toBe('AC');
      expect(result[1][1]).toBe('C2');
      expect(result[1][2]).toBe('AC');
      expect(result[2][1]).toBe('');
    });

    it('não deve modificar o array original', () => {
      const mem: Memory = Array.from({ length: 3 }, (_, i) => [String(i), '', '']);
      service.insertMemory(mem, 'A', 'C', 2, 0);
      expect(mem[0][1]).toBe('');
    });
  });

  describe('insertMemoryTemp', () => {
    it('deve preencher frames com marcador x', () => {
      const mem: Memory = Array.from({ length: 3 }, (_, i) => [String(i), '', '']);
      const result = service.insertMemoryTemp(mem, 2, 0);
      expect(result[0][1]).toBe('x1');
      expect(result[1][1]).toBe('x2');
    });
  });

  // ─── setColor / removeColor / whatColor ──────────────────────────────────

  describe('setColor', () => {
    it('deve atribuir processo ao primeiro slot livre', () => {
      const colors: ColorPalette = [['', '#aaa', '#bbb', '#ccc'], ['', '#ddd', '#eee', '#fff']];
      const result = service.setColor(colors, 'A');
      expect(result[0][0]).toBe('A');
    });

    it('não deve modificar o array original', () => {
      const colors: ColorPalette = [['', '#aaa', '#bbb', '#ccc']];
      service.setColor(colors, 'A');
      expect(colors[0][0]).toBe('');
    });
  });

  describe('removeColor', () => {
    it('deve limpar o slot do processo', () => {
      const colors: ColorPalette = [['A', '#aaa', '#bbb', '#ccc']];
      const result = service.removeColor(colors, 'A');
      expect(result[0][0]).toBe('');
    });
  });

  describe('whatColor', () => {
    it('deve retornar cor do segmento C (índice 3)', () => {
      const colors: ColorPalette = [['A', '#P', '#D', '#C']];
      expect(service.whatColor(colors, 'AC')).toBe('#C');
    });

    it('deve retornar cor do segmento D (índice 2)', () => {
      const colors: ColorPalette = [['A', '#P', '#D', '#C']];
      expect(service.whatColor(colors, 'AD')).toBe('#D');
    });

    it('deve retornar cor do segmento P (índice 1)', () => {
      const colors: ColorPalette = [['A', '#P', '#D', '#C']];
      expect(service.whatColor(colors, 'AP')).toBe('#P');
    });

    it('deve retornar undefined para processo inexistente', () => {
      const colors: ColorPalette = [['A', '#P', '#D', '#C']];
      expect(service.whatColor(colors, 'ZC')).toBeUndefined();
    });
  });

  // ─── getAddress ──────────────────────────────────────────────────────────

  describe('getAddress', () => {
    it('deve retornar o endereço binário do segmento', () => {
      const mem: Memory = [['00000', 'C1', 'AC'], ['00001', 'C2', 'AC'], ['00010', '', '']];
      expect(service.getAddress(mem, 'AC')).toBe('00000');
    });

    it('deve retornar undefined para segmento inexistente', () => {
      const mem: Memory = [['00000', '', '']];
      expect(service.getAddress(mem, 'AC')).toBeUndefined();
    });
  });

  // ─── randonChar ──────────────────────────────────────────────────────────

  describe('randonChar', () => {
    it('deve retornar letra não presente na lista', () => {
      const existing = 'ABCDEFGHIJKLMNOPQRSTUVWXY'.split('');
      const result = service.randonChar(existing);
      expect(result).toBe('Z');
    });

    it('deve retornar um único caractere maiúsculo', () => {
      const result = service.randonChar([]);
      expect(result.length).toBe(1);
      expect(result).toMatch(/[A-Z]/);
    });
  });

  // ─── updateLacuna ────────────────────────────────────────────────────────

  describe('updateLacuna', () => {
    it('deve identificar lacuna única em memória vazia', () => {
      const mem: Memory = Array.from({ length: 32 }, (_, i) => [String(i), '', '']);
      const lacunas = service.updateLacuna(mem);
      expect(lacunas.length).toBe(1);
      expect(lacunas[0][2]).toBe(32);
    });

    it('deve identificar duas lacunas quando há processo no meio', () => {
      const mem: Memory = Array.from({ length: 10 }, (_, i) => [String(i), '', '']);
      mem[3][1] = 'C1'; mem[3][2] = 'AC';
      mem[4][1] = 'D1'; mem[4][2] = 'AD';
      const lacunas = service.updateLacuna(mem);
      expect(lacunas.length).toBe(2);
    });

    it('deve retornar lista vazia quando memória está cheia', () => {
      const mem: Memory = Array.from({ length: 5 }, (_, i) => [String(i), 'C1', 'AC']);
      const lacunas = service.updateLacuna(mem);
      expect(lacunas.length).toBe(0);
    });
  });

  // ─── alocarProcesso ──────────────────────────────────────────────────────

  describe('alocarProcesso', () => {
    it('deve alocar processo com sucesso quando há espaço', () => {
      const state = service.criarEstadoInicial();
      const result = service.alocarProcesso(state, 'A', 2, 3, 1);
      expect(result.success).toBeTrue();
      const ocupados = result.state.tableMemory.filter(r => r[2].startsWith('A'));
      expect(ocupados.length).toBe(6); // code=2 + data=3 + stack=1
    });

    it('deve retornar sucesso=false quando não há espaço', () => {
      // preenche toda a memória
      let state = service.criarEstadoInicial();
      for (let i = 0; i < 32; i++) {
        state.tableMemory[i][1] = 'X1';
        state.tableMemory[i][2] = 'XX';
      }
      state = { ...state, tabelaLacunas: [] };
      const result = service.alocarProcesso(state, 'B', 1, 1, 1);
      expect(result.success).toBeFalse();
    });

    it('deve reduzir a lacuna após alocação', () => {
      const state = service.criarEstadoInicial();
      const result = service.alocarProcesso(state, 'A', 2, 2, 2); // 6 frames
      const totalLacuna = result.state.tabelaLacunas.reduce((sum, l) => sum + l[2], 0);
      expect(totalLacuna).toBe(26); // 32 - 6
    });
  });

  // ─── remover ─────────────────────────────────────────────────────────────

  describe('remover', () => {
    it('deve liberar os frames do processo removido', () => {
      const state = service.criarEstadoInicial();
      const { state: afterAlloc } = service.alocarProcesso(state, 'A', 2, 2, 2);
      const afterRemove = service.remover(afterAlloc, 'A');

      const ocupados = afterRemove.tableMemory.filter(r => r[2].startsWith('A'));
      expect(ocupados.length).toBe(0);
    });

    it('deve restaurar a lacuna após remoção', () => {
      const state = service.criarEstadoInicial();
      const { state: afterAlloc } = service.alocarProcesso(state, 'A', 2, 2, 2);
      const afterRemove = service.remover(afterAlloc, 'A');

      const totalLacuna = afterRemove.tabelaLacunas.reduce((sum, l) => sum + l[2], 0);
      expect(totalLacuna).toBe(32);
    });

    it('deve liberar a cor do processo removido', () => {
      const state = service.criarEstadoInicial();
      const { state: afterAlloc } = service.alocarProcesso(state, 'A', 1, 1, 1);
      const colors = service.setColor(afterAlloc.colors, 'A');
      const stateWithColor = { ...afterAlloc, colors };
      const afterRemove = service.remover(stateWithColor, 'A');

      expect(afterRemove.colors.every(c => c[0] !== 'A')).toBeTrue();
    });
  });

  // ─── inserirSegmentosTemp ────────────────────────────────────────────────

  describe('inserirSegmentosTemp', () => {
    it('deve retornar count=3 quando os 3 segmentos cabem', () => {
      const state = service.criarEstadoInicial();
      const { count } = service.inserirSegmentosTemp(
        state.tabelaLacunas, state.tableMemoryTemp, 1, 2, 3
      );
      expect(count).toBe(3);
    });

    it('deve retornar count<3 quando não há espaço', () => {
      const lacunas: GapTable = [[0, 1, 2]]; // só 2 frames disponíveis
      const mem: Memory = Array.from({ length: 32 }, (_, i) => [String(i), '', '']);
      const { count } = service.inserirSegmentosTemp(lacunas, mem, 3, 3, 3);
      expect(count).toBeLessThan(3);
    });
  });
});
