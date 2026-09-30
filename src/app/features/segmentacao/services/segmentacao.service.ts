import { Injectable } from '@angular/core';

export type Memory = string[][];
export type GapTable = number[][];
export type ColorPalette = string[][];

export interface SegmentacaoState {
  tableMemory: Memory;
  tableMemoryTemp: Memory;
  tabelaLacunas: GapTable;
  colors: ColorPalette;
}

const INITIAL_MEMORY: Memory = [
  ['00000','',''], ['00001','',''], ['00010','',''], ['00011','',''],
  ['00100','',''], ['00101','',''], ['00110','',''], ['00111','',''],
  ['01000','',''], ['01001','',''], ['01010','',''], ['01011','',''],
  ['01100','',''], ['01101','',''], ['01110','',''], ['01111','',''],
  ['10000','',''], ['10001','',''], ['10010','',''], ['10011','',''],
  ['10100','',''], ['10101','',''], ['10110','',''], ['10111','',''],
  ['11000','',''], ['11001','',''], ['11010','',''], ['11011','',''],
  ['11100','',''], ['11101','',''], ['11110','',''], ['11111','',''],
];

const INITIAL_COLORS: ColorPalette = [
  ['', '#5CAAD6', '#0780A7', '#035473'],
  ['', '#AFA4B1', '#785964', '#4D394E'],
  ['', '#E99D9F', '#bf565c', '#8E3A40'],
  ['', '#77AFA5', '#4B706A', '#224B45'],
  ['', '#EDBB99', '#DC7633', '#784212'],
  ['', '#D2B4DE', '#BB8FCE', '#6A5ACD'],
  ['', '#D8C0A9', '#B2927C', '#7E6754'],
  ['', '#D3D3D3', '#A9A9A9', '#808080'],
];

@Injectable({ providedIn: 'root' })
export class SegmentacaoService {

  criarEstadoInicial(): SegmentacaoState {
    const mem = INITIAL_MEMORY.map(row => [...row]);
    return {
      tableMemory: mem,
      tableMemoryTemp: mem.map(row => [...row]),
      tabelaLacunas: [[0, 31, 32]],
      colors: INITIAL_COLORS.map(row => [...row]),
    };
  }

  decimalToBinary(decimal: number): string {
    let binary = '';
    while (decimal > 0) {
      binary = (decimal % 2) + binary;
      decimal = Math.floor(decimal / 2);
    }
    while (binary.length < 5) binary = '0' + binary;
    return binary;
  }

  validInput(processName: string, code: number, data: number, stack: number): boolean {
    return processName !== '' && code > 0 && data > 0 && stack > 0;
  }

  orderSegments(n1: number, n2: number, n3: number, code: number, data: number, stack: number): string[] {
    const seg: string[] = [];
    if (n1 === code) {
      seg.push('C');
      seg.push(n2 === data ? 'D' : 'P');
      seg.push(n2 === data ? 'P' : 'D');
    } else if (n1 === data) {
      seg.push('D');
      seg.push(n2 === code ? 'C' : 'P');
      seg.push(n2 === code ? 'P' : 'C');
    } else {
      seg.push('P');
      seg.push(n2 === code ? 'C' : 'D');
      seg.push(n2 === code ? 'D' : 'C');
    }
    return seg;
  }

  reorder(tabelaLacunas: GapTable): GapTable {
    return [...tabelaLacunas].sort((a, b) => a[2] - b[2]);
  }

  sync(tableMemory: Memory): Memory {
    return tableMemory.map(row => [...row]);
  }

  fillLacunaTemp(tabelaLacunasTemp: GapTable, lacunaPosi: number, fill: number): GapTable {
    const t = tabelaLacunasTemp.map(r => [...r]);
    if (t[lacunaPosi][2] === fill) {
      t.splice(lacunaPosi, 1);
    } else {
      t[lacunaPosi][0] = t[lacunaPosi][0] + fill;
      t[lacunaPosi][2] = t[lacunaPosi][1] - t[lacunaPosi][0] + 1;
    }
    return t.sort((a, b) => a[2] - b[2]);
  }

  fillLacuna(tabelaLacunas: GapTable, lacunaPosi: number, fill: number): GapTable {
    const t = tabelaLacunas.map(r => [...r]);
    if (t[lacunaPosi][2] === fill) {
      t.splice(lacunaPosi, 1);
    } else {
      t[lacunaPosi][0] = t[lacunaPosi][0] + fill;
      t[lacunaPosi][2] = t[lacunaPosi][1] - t[lacunaPosi][0] + 1;
    }
    return t.sort((a, b) => a[2] - b[2]);
  }

  insertMemoryTemp(tableMemoryTemp: Memory, fill: number, initialPosition: number): Memory {
    const t = tableMemoryTemp.map(r => [...r]);
    for (let i = 0; i < fill; i++) {
      t[initialPosition + i][1] = 'x' + (i + 1);
    }
    return t;
  }

  insertMemory(tableMemory: Memory, processName: string, key: string, fill: number, initialPosition: number): Memory {
    const t = tableMemory.map(r => [...r]);
    for (let i = 0; i < fill; i++) {
      t[initialPosition + i][1] = key + (i + 1);
      t[initialPosition + i][2] = processName + key;
    }
    return t;
  }

  inserirSegmentosTemp(
    tabelaLacunas: GapTable,
    tableMemoryTemp: Memory,
    n1: number, n2: number, n3: number
  ): { count: number; tableMemoryTemp: Memory } {
    let count = 0;
    let lacunasTemp: GapTable = tabelaLacunas.map(r => [...r]);
    let mem = tableMemoryTemp.map(r => [...r]);

    for (let i = 0; i < lacunasTemp.length; i++) {
      if (n1 <= lacunasTemp[i][2]) {
        mem = this.insertMemoryTemp(mem, n1, lacunasTemp[i][0]);
        lacunasTemp = this.fillLacunaTemp(lacunasTemp, i, n1);
        count++;
        break;
      }
    }
    if (count === 0) return { count, tableMemoryTemp: mem };

    for (let i = 0; i < lacunasTemp.length; i++) {
      if (n2 <= lacunasTemp[i][2]) {
        mem = this.insertMemoryTemp(mem, n2, lacunasTemp[i][0]);
        lacunasTemp = this.fillLacunaTemp(lacunasTemp, i, n2);
        count++;
        break;
      }
    }
    if (count < 2) return { count, tableMemoryTemp: mem };

    for (let i = 0; i < lacunasTemp.length; i++) {
      if (n3 <= lacunasTemp[i][2]) {
        mem = this.insertMemoryTemp(mem, n3, lacunasTemp[i][0]);
        lacunasTemp = this.fillLacunaTemp(lacunasTemp, i, n3);
        count++;
        break;
      }
    }
    return { count, tableMemoryTemp: mem };
  }

  inserirSegmentos(
    state: SegmentacaoState,
    processName: string,
    n1: number, n2: number, n3: number,
    code: number, data: number, stack: number
  ): SegmentacaoState {
    const seg = this.orderSegments(n1, n2, n3, code, data, stack);
    let mem = state.tableMemory.map(r => [...r]);
    let lacunas = state.tabelaLacunas.map(r => [...r]);

    for (let i = 0; i < lacunas.length; i++) {
      if (n1 <= lacunas[i][2]) {
        mem = this.insertMemory(mem, processName, seg[0], n1, lacunas[i][0]);
        lacunas = this.fillLacuna(lacunas, i, n1);
        lacunas = this.reorder(lacunas);
        break;
      }
    }
    for (let i = 0; i < lacunas.length; i++) {
      if (n2 <= lacunas[i][2]) {
        mem = this.insertMemory(mem, processName, seg[1], n2, lacunas[i][0]);
        lacunas = this.fillLacuna(lacunas, i, n2);
        lacunas = this.reorder(lacunas);
        break;
      }
    }
    for (let i = 0; i < lacunas.length; i++) {
      if (n3 <= lacunas[i][2]) {
        mem = this.insertMemory(mem, processName, seg[2], n3, lacunas[i][0]);
        lacunas = this.fillLacuna(lacunas, i, n3);
        lacunas = this.reorder(lacunas);
        break;
      }
    }
    return { ...state, tableMemory: mem, tableMemoryTemp: this.sync(mem), tabelaLacunas: lacunas };
  }

  remover(state: SegmentacaoState, name: string): SegmentacaoState {
    const mem = state.tableMemory.map(r =>
      r[2][0] === name ? [r[0], '', ''] : [...r]
    );
    const lacunas = this.updateLacuna(mem);
    const colors = this.removeColor(state.colors, name);
    return { ...state, tableMemory: mem, tableMemoryTemp: this.sync(mem), tabelaLacunas: lacunas, colors };
  }

  updateLacuna(tableMemory: Memory): GapTable {
    const lacunaIni: number[] = [];
    const lacunaFim: number[] = [];
    let flag1 = 0, flag2 = 1;

    for (let i = 0; i < tableMemory.length; i++) {
      if (tableMemory[i][1] === '' && flag1 === 0) {
        lacunaIni.push(i);
        flag1 = 1; flag2 = 0;
      }
      if (tableMemory[i][1] !== '' && flag2 === 0) {
        lacunaFim.push(i);
        flag1 = 0; flag2 = 1;
      }
    }

    const lacunas: GapTable = lacunaIni.map((ini, idx) => {
      const fim = lacunaFim[idx] !== undefined ? lacunaFim[idx] - 1 : 31;
      return [ini, fim, fim - ini + 1];
    });

    return this.reorder(lacunas);
  }

  getAddress(tableMemory: Memory, segCode: string): string | undefined {
    const row = tableMemory.find(r => r[2] === segCode);
    return row?.[0];
  }

  setColor(colors: ColorPalette, processName: string): ColorPalette {
    const c = colors.map(r => [...r]);
    const free = c.find(r => r[0] === '');
    if (free) free[0] = processName;
    return c;
  }

  removeColor(colors: ColorPalette, processName: string): ColorPalette {
    const c = colors.map(r => [...r]);
    const slot = c.find(r => r[0] === processName);
    if (slot) slot[0] = '';
    return c;
  }

  whatColor(colors: ColorPalette, code: string): string | undefined {
    const slot = colors.find(r => r[0] === code[0]);
    if (!slot) return undefined;
    if (code[1] === 'C') return slot[3];
    if (code[1] === 'D') return slot[2];
    if (code[1] === 'P') return slot[1];
    return undefined;
  }

  randonChar(existingNames: string[]): string {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let indice = Math.floor(Math.random() * letras.length);
    while (existingNames.includes(letras.charAt(indice))) {
      indice = Math.floor(Math.random() * letras.length);
    }
    return letras.charAt(indice);
  }

  buildTables(
    processName: string, code: number, data: number, stack: number,
    tableMemory: Memory, colors: ColorPalette
  ): { tables: any[]; colors: ColorPalette } {
    const updatedColors = this.setColor(colors, processName);
    const data1 = [];

    const header = [
      ['00', this.getAddress(tableMemory, processName + 'C'), this.decimalToBinary(code)],
      ['00', this.getAddress(tableMemory, processName + 'D'), this.decimalToBinary(data)],
      ['00', this.getAddress(tableMemory, processName + 'P'), this.decimalToBinary(stack)],
    ];
    data1.push(header);

    data1.push(Array.from({ length: code }, (_, i) => [this.decimalToBinary(i), 'C' + (i + 1)]));
    data1.push(Array.from({ length: data }, (_, i) => [this.decimalToBinary(i), 'D' + (i + 1)]));
    data1.push(Array.from({ length: stack }, (_, i) => [this.decimalToBinary(i), 'P' + (i + 1)]));

    return { tables: data1, colors: updatedColors };
  }

  alocarProcesso(
    state: SegmentacaoState,
    processName: string,
    code: number, data: number, stack: number
  ): { success: boolean; state: SegmentacaoState } {
    const sorted = [code, data, stack].sort((a, b) => a - b);
    const [n1, n2, n3] = sorted;
    const lacunas = this.reorder(state.tabelaLacunas);
    const { count } = this.inserirSegmentosTemp(lacunas, state.tableMemoryTemp, n1, n2, n3);

    if (count === 3) {
      const newState = this.inserirSegmentos({ ...state, tabelaLacunas: lacunas }, processName, n1, n2, n3, code, data, stack);
      return { success: true, state: newState };
    }
    return { success: false, state };
  }
}
