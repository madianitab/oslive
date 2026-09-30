import { Processo as ProcessoPaginacao } from "../features/paginacao/models/processo";
import { QUANT_MIN_PAG_POR_PROC, QUANT_MAX_PAG_POR_PROC } from "./constantes"

const CORES_DISPONIVEIS: string[] = [
  "#0048BA", "#B03060", "#FF4500", "#008B8B", "#A52A2A",
  "#8B0000", "#006400", "#2F4F4F", "#800080", "#000080",
  "#708090", "#6B8E23", "#556B2F", "#FF8C00", "#9932CC", "#8B4513",
];

export function embaralhamentoFisherYates(array: Array<number>): Array<number> {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function listaNum(num: number): Array<number> {
  const list: number[] = [];
  for (let i = 0; i < num; i++) list.push(i);
  return list;
}

/**
 * Cor de texto (preto/branco) que contrasta com um fundo.
 * Retorna '' para cores inválidas/transparentes (mantém a cor herdada).
 */
export function contrastText(bg: string | null | undefined): string {
  if (!bg) return '';
  let s = bg.trim();
  let r: number, g: number, b: number;
  if (s.startsWith('rgb')) {
    const m = s.match(/\d+/g);
    if (!m || m.length < 3) return '';
    [r, g, b] = [+m[0], +m[1], +m[2]];
  } else if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return '';
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    return '';
  }
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#1a1a1a' : '#ffffff';
}

export function gera_cor(coresJaUtilizadas: Array<{ cor: string }> = []): string {
  const disponiveis = CORES_DISPONIVEIS.filter(
    c => !coresJaUtilizadas.some(p => p.cor === c)
  );
  return disponiveis[Math.floor(Math.random() * disponiveis.length)];
}

export namespace Utils {
      export function embaralhamentoFisherYates(array: Array<number>): Array<number> {
            for (var i = array.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
      }

      export function gera_cor(coresJaUtilizadas: Array<ProcessoPaginacao> = []): string {
            var coresDisponiveis: Array<string> = [
                  "#0048BA", // Azul Royal
                  "#B03060", // Vermelho Vinho
                  "#FF4500", // Laranja Vermelho
                  "#008B8B", // Azul Escuro Ciano
                  "#A52A2A", // Marrom
                  "#8B0000", // Vermelho Escuro
                  "#006400", // Verde Escuro
                  "#2F4F4F", // Cinza Ardósia Escuro
                  "#800080", // Púrpura
                  "#000080", // Azul Marinho
                  "#708090", // Cinza Ardósia
                  "#6B8E23", // Verde Oliva
                  "#556B2F", // Verde Oliva Escuro
                  "#FF8C00", // Laranja Escuro
                  "#9932CC", // Orquídea Escura
                  "#8B4513", // Sela Marrom
            ];

            for (var i = 0; i < coresJaUtilizadas.length; i++) {
                  var pos = coresDisponiveis.indexOf(coresJaUtilizadas[i].cor);
                  if (pos != -1) coresDisponiveis.splice(pos, 1);
            }

            return coresDisponiveis[Math.floor(Math.random() * coresDisponiveis.length)];
      }



      export function listaNum(num: number): Array<number> {
            var listNum: Array<number> = [];
            for (var i = 0; i < num; i++)listNum.push(i);
            return listNum;
      }

      export function quantPaginas(listProc: Array<ProcessoPaginacao>): number {
            var listNum = 0;
            for (let i of listProc) listNum += i.pagina.length;
            return listNum;
      }

      export function quantPaginasMenoresQueX(listProc: Array<ProcessoPaginacao>, x: number): number {
            var listNum = 0;
            for (let i of listProc) if (i.pagina.length < x) listNum += 1;
            return listNum;
      }

      export function listaNumAleatoriosComQuantMinimaFinal(numPag: number = 1, PagVitima: boolean = false): Array<number> {
            var listNum: Array<number> = [];

            for (var i = 0; i < numPag; i++) {
                  var x = 0;
                  if (!PagVitima) x = (Number)(Math.round(Math.random() * QUANT_MIN_PAG_POR_PROC) + (QUANT_MAX_PAG_POR_PROC - QUANT_MIN_PAG_POR_PROC));
                  else x = (Number)(Math.round(Math.random() * (QUANT_MAX_PAG_POR_PROC - QUANT_MIN_PAG_POR_PROC)) + QUANT_MIN_PAG_POR_PROC);
                  listNum.push(x);
            }
            return listNum;
      }
}