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

/**
 * Cor para um novo processo, diferente das já usadas.
 * Usa primeiro a paleta fixa (16 cores); quando ela acaba, gera cores escuras
 * pelo ângulo áureo, sempre com contraste para o texto branco. Nunca retorna
 * undefined (antes, a partir do 17º processo a cor sumia e o rótulo ficava invisível).
 */
export function gera_cor(coresJaUtilizadas: Array<{ cor?: string | null }> = []): string {
  const usadas = new Set(coresJaUtilizadas.map(p => (p.cor ?? '').toUpperCase()));
  const disponiveis = CORES_DISPONIVEIS.filter(c => !usadas.has(c.toUpperCase()));
  if (disponiveis.length > 0) {
    return disponiveis[Math.floor(Math.random() * disponiveis.length)];
  }
  for (let i = 0; i < 360; i++) {
    const cor = corGerada(usadas.size + i);
    if (!usadas.has(cor)) return cor;
  }
  return corGerada(usadas.size);
}

/** n-ésima cor gerada: matiz espalhado pelo ângulo áureo, saturação e luminosidade fixas (fundo escuro). */
export function corGerada(n: number): string {
  const matiz = (n * 137.508) % 360;
  const luz = n % 2 === 0 ? 0.28 : 0.34;
  return hslParaHex(matiz, 0.6, luz);
}

function hslParaHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const canal = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`.toUpperCase();
}

const gera_cor_global = gera_cor;

export namespace Utils {
      export function embaralhamentoFisherYates(array: Array<number>): Array<number> {
            for (var i = array.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
      }

      export function gera_cor(coresJaUtilizadas: Array<ProcessoPaginacao> = []): string {
            return gera_cor_global(coresJaUtilizadas);
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