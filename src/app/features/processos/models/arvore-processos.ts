/**
 * Árvore de processos: interpretador de um subconjunto de C com fork().
 *
 * Lógica pura (sem Angular). O código é compilado para instruções de uma
 * máquina de pilha; cada processo tem a própria cópia das variáveis, da pilha
 * e do contador de programa, e fork() clona tudo isso.
 *
 * Modelo de execução (didático):
 * - uma CPU; o processo executa até bloquear (wait, waitpid, sleep) ou terminar;
 * - as instruções são instantâneas: o tempo só avança com sleep();
 * - após o fork(), a ordem é escolhida em `Ordem` (pai primeiro é o padrão).
 */

export type Ordem = 'pai' | 'filho' | 'aleatoria';
export type EstadoProc = 'apto' | 'executando' | 'bloqueado' | 'zumbi' | 'terminado';
export type TipoEvento = 'inicio' | 'fork' | 'printf' | 'wait' | 'sleep' | 'acorda' | 'exit' | 'escalona';

export const PID_INIT = 1;
export const PID_SHELL = 99;
export const PID_INICIAL = 100;
export const LIMITE_PROCESSOS = 64;
export const LIMITE_INSTRUCOES = 500_000;
export const LIMITE_EVENTOS = 4000;
const WNOHANG = 1;

export class ErroSimulacao extends Error {
  constructor(msg: string, public linha: number | null = null) {
    super(msg);
  }
}

// ───────────────────────── léxico ─────────────────────────

type TipoTok = 'num' | 'id' | 'str' | 'op' | 'eof';
interface Tok { t: TipoTok; v: string; n: number; linha: number; }

const OPS3 = ['<<=', '>>='];
const OPS2 = ['++', '--', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '&=', '|=', '^=', '->'];
const OPS1 = '+-*/%=<>!&|^~?:;,(){}[].';

function escape(c: string): string {
  const m: Record<string, string> = { n: '\n', t: '\t', '0': '\0', '\\': '\\', '"': '"', "'": "'", r: '' };
  return m[c] ?? c;
}

export function lexer(fonte: string): Tok[] {
  const toks: Tok[] = [];
  const defines = new Map<string, Tok[]>();
  let i = 0, linha = 1, inicioLinha = true;
  const n = fonte.length;

  const emitir = (tk: Tok) => {
    if (tk.t === 'id' && defines.has(tk.v)) {
      defines.get(tk.v)!.forEach(d => toks.push({ ...d, linha: tk.linha }));
    } else {
      toks.push(tk);
    }
  };

  while (i < n) {
    const c = fonte[i];
    if (c === '\n') { linha++; i++; inicioLinha = true; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && fonte[i + 1] === '/') { while (i < n && fonte[i] !== '\n') i++; continue; }
    if (c === '/' && fonte[i + 1] === '*') {
      i += 2;
      while (i < n && !(fonte[i] === '*' && fonte[i + 1] === '/')) { if (fonte[i] === '\n') linha++; i++; }
      i += 2;
      continue;
    }
    if (c === '#' && inicioLinha) {
      let fim = i;
      while (fim < n && fonte[fim] !== '\n') fim++;
      const diretiva = fonte.slice(i + 1, fim).trim();
      const m = diretiva.match(/^define\s+([A-Za-z_]\w*)(\()?\s*(.*)$/);
      if (m) {
        if (m[2]) throw new ErroSimulacao('#define com parâmetros não é suportado.', linha);
        const corpo = m[3] ? lexer(m[3]).filter(t => t.t !== 'eof') : [];
        const expandido: Tok[] = [];
        corpo.forEach(t => (t.t === 'id' && defines.has(t.v)) ? expandido.push(...defines.get(t.v)!) : expandido.push(t));
        defines.set(m[1], expandido);
      }
      i = fim;
      continue;
    }
    inicioLinha = false;

    if (/[0-9]/.test(c)) {
      let j = i;
      let valor: number;
      if (c === '0' && /[xX]/.test(fonte[i + 1] ?? '')) {
        j = i + 2;
        while (j < n && /[0-9a-fA-F]/.test(fonte[j])) j++;
        valor = parseInt(fonte.slice(i + 2, j), 16);
      } else {
        while (j < n && /[0-9]/.test(fonte[j])) j++;
        if (fonte[j] === '.') throw new ErroSimulacao('Números com casas decimais não são suportados (use int).', linha);
        valor = parseInt(fonte.slice(i, j), 10);
      }
      while (j < n && /[uUlL]/.test(fonte[j])) j++;
      emitir({ t: 'num', v: fonte.slice(i, j), n: valor | 0, linha });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /\w/.test(fonte[j])) j++;
      emitir({ t: 'id', v: fonte.slice(i, j), n: 0, linha });
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < n && fonte[j] !== '"') {
        if (fonte[j] === '\n') throw new ErroSimulacao('Texto entre aspas não foi fechado.', linha);
        if (fonte[j] === '\\') { s += escape(fonte[j + 1]); j += 2; } else { s += fonte[j]; j++; }
      }
      if (j >= n) throw new ErroSimulacao('Texto entre aspas não foi fechado.', linha);
      emitir({ t: 'str', v: s, n: 0, linha });
      i = j + 1;
      continue;
    }
    if (c === "'") {
      let ch: string, j: number;
      if (fonte[i + 1] === '\\') { ch = escape(fonte[i + 2]); j = i + 3; } else { ch = fonte[i + 1]; j = i + 2; }
      if (fonte[j] !== "'") throw new ErroSimulacao('Caractere entre apóstrofos inválido.', linha);
      emitir({ t: 'num', v: `'${ch}'`, n: ch.charCodeAt(0) || 0, linha });
      i = j + 1;
      continue;
    }
    const op = OPS3.find(o => fonte.startsWith(o, i)) ?? OPS2.find(o => fonte.startsWith(o, i)) ?? (OPS1.includes(c) ? c : null);
    if (!op) throw new ErroSimulacao(`Caractere inesperado: ${c}`, linha);
    emitir({ t: 'op', v: op, n: 0, linha });
    i += op.length;
  }
  toks.push({ t: 'eof', v: '', n: 0, linha });
  return toks;
}

// ───────────────────────── árvore sintática ─────────────────────────

type Alvo = { k: 'var'; nome: string; linha: number } | { k: 'idx'; nome: string; indice: Expr; linha: number };
type Expr =
  | { k: 'num'; v: number; linha: number }
  | { k: 'str'; v: string; linha: number }
  | Alvo
  | { k: 'un'; op: string; e: Expr; linha: number }
  | { k: 'addr'; alvo: Alvo; linha: number }
  | { k: 'bin'; op: string; a: Expr; b: Expr; linha: number }
  | { k: 'cond'; c: Expr; a: Expr; b: Expr; linha: number }
  | { k: 'atr'; op: string; alvo: Alvo; e: Expr; linha: number }
  | { k: 'inc'; d: number; pre: boolean; alvo: Alvo; linha: number }
  | { k: 'call'; nome: string; args: Expr[]; linha: number };

interface ItemDecl { nome: string; tam: number | null; init: Expr | null; lista: Expr[] | null; linha: number; }
type Stmt =
  | { k: 'decl'; itens: ItemDecl[] }
  | { k: 'expr'; e: Expr }
  | { k: 'if'; c: Expr; s: Stmt; senao: Stmt | null }
  | { k: 'while'; c: Expr; s: Stmt }
  | { k: 'do'; s: Stmt; c: Expr }
  | { k: 'for'; ini: Stmt | null; c: Expr | null; passo: Expr | null; s: Stmt }
  | { k: 'bloco'; corpo: Stmt[]; fim: number }
  | { k: 'ret'; e: Expr | null; linha: number }
  | { k: 'break'; linha: number }
  | { k: 'continue'; linha: number }
  | { k: 'vazio' };

interface Funcao { nome: string; params: string[]; corpo: Stmt; linha: number; }

const TIPOS = new Set(['int', 'long', 'short', 'unsigned', 'signed', 'char', 'pid_t', 'void', 'const', 'static', 'size_t']);
const PALAVRAS = new Set(['if', 'else', 'while', 'do', 'for', 'return', 'break', 'continue']);

class Parser {
  private p = 0;
  constructor(private toks: Tok[]) {}

  private get atual(): Tok { return this.toks[this.p]; }
  private prox(k = 1): Tok { return this.toks[Math.min(this.p + k, this.toks.length - 1)]; }
  private eh(v: string): boolean { const t = this.atual; return (t.t === 'op' || t.t === 'id') && t.v === v; }
  private aceita(v: string): boolean { if (this.eh(v)) { this.p++; return true; } return false; }
  private espera(v: string): Tok {
    if (!this.eh(v)) {
      const t = this.atual;
      throw new ErroSimulacao(`Esperava "${v}" ${t.t === 'eof' ? 'antes do fim do código' : `antes de "${t.v}"`}.`, t.linha);
    }
    return this.toks[this.p++];
  }
  private ident(): Tok {
    const t = this.atual;
    if (t.t !== 'id' || TIPOS.has(t.v) || PALAVRAS.has(t.v)) throw new ErroSimulacao(`Esperava um nome ${t.t === 'eof' ? 'antes do fim do código' : `em vez de "${t.v}"`}.`, t.linha);
    this.p++;
    return t;
  }
  private ehTipo(t: Tok = this.atual): boolean { return t.t === 'id' && TIPOS.has(t.v); }
  private tipo(): void {
    if (!this.ehTipo()) throw new ErroSimulacao(`Esperava um tipo (int, pid_t...) em vez de "${this.atual.v}".`, this.atual.linha);
    while (this.ehTipo()) this.p++;
  }

  programa(): { funcoes: Funcao[]; globais: ItemDecl[] } {
    const funcoes: Funcao[] = [];
    const globais: ItemDecl[] = [];
    while (this.atual.t !== 'eof') {
      this.tipo();
      if (this.eh('*')) throw new ErroSimulacao('Ponteiros não são suportados pelo simulador.', this.atual.linha);
      if (this.prox().v === '(' && this.prox().t === 'op') {
        const nome = this.ident();
        this.espera('(');
        const params: string[] = [];
        if (!this.eh(')')) {
          if (this.eh('void') && this.prox().v === ')') this.p++;
          else do {
            this.tipo();
            while (this.aceita('*'));
            params.push(this.ident().v);
            if (this.aceita('[')) this.espera(']');
          } while (this.aceita(','));
        }
        this.espera(')');
        if (this.aceita(';')) continue;               // protótipo
        if (!this.eh('{')) this.espera('{');
        funcoes.push({ nome: nome.v, params, corpo: this.instrucao(), linha: nome.linha });
      } else {
        globais.push(...this.itensDecl());
        this.espera(';');
      }
    }
    return { funcoes, globais };
  }

  private itensDecl(): ItemDecl[] {
    const itens: ItemDecl[] = [];
    do {
      if (this.eh('*')) throw new ErroSimulacao('Ponteiros não são suportados pelo simulador.', this.atual.linha);
      const nome = this.ident();
      const item: ItemDecl = { nome: nome.v, tam: null, init: null, lista: null, linha: nome.linha };
      if (this.aceita('[')) {
        const t = this.atual;
        if (t.t !== 'num') throw new ErroSimulacao('O tamanho do vetor deve ser um número (ou #define).', t.linha);
        this.p++;
        if (t.n <= 0 || t.n > 1000) throw new ErroSimulacao('Tamanho de vetor deve ficar entre 1 e 1000.', t.linha);
        item.tam = t.n;
        this.espera(']');
      }
      if (this.aceita('=')) {
        if (item.tam !== null) {
          this.espera('{');
          item.lista = [];
          if (!this.eh('}')) do { item.lista.push(this.atribuicao()); } while (this.aceita(',') && !this.eh('}'));
          this.espera('}');
          if (item.lista.length > item.tam) throw new ErroSimulacao('Valores demais para o tamanho do vetor.', nome.linha);
        } else {
          item.init = this.atribuicao();
        }
      }
      itens.push(item);
    } while (this.aceita(','));
    return itens;
  }

  private instrucao(): Stmt {
    const t = this.atual;
    if (this.aceita('{')) {
      const corpo: Stmt[] = [];
      while (!this.eh('}')) {
        if (this.atual.t === 'eof') throw new ErroSimulacao('Falta fechar "}".', this.atual.linha);
        corpo.push(this.instrucao());
      }
      return { k: 'bloco', corpo, fim: this.toks[this.p++].linha };
    }
    if (this.aceita(';')) return { k: 'vazio' };
    if (t.t === 'id') {
      switch (t.v) {
        case 'if': {
          this.p++; this.espera('(');
          const c = this.expr(); this.espera(')');
          const s = this.instrucao();
          return { k: 'if', c, s, senao: this.aceita('else') ? this.instrucao() : null };
        }
        case 'while': {
          this.p++; this.espera('(');
          const c = this.expr(); this.espera(')');
          return { k: 'while', c, s: this.instrucao() };
        }
        case 'do': {
          this.p++;
          const s = this.instrucao();
          this.espera('while'); this.espera('(');
          const c = this.expr(); this.espera(')'); this.espera(';');
          return { k: 'do', s, c };
        }
        case 'for': {
          this.p++; this.espera('(');
          let ini: Stmt | null = null;
          if (!this.eh(';')) {
            if (this.ehTipo()) { this.tipo(); ini = { k: 'decl', itens: this.itensDecl() }; }
            else ini = { k: 'expr', e: this.expr() };
          }
          this.espera(';');
          const c = this.eh(';') ? null : this.expr();
          this.espera(';');
          const passo = this.eh(')') ? null : this.expr();
          this.espera(')');
          return { k: 'for', ini, c, passo, s: this.instrucao() };
        }
        case 'return': {
          this.p++;
          const e = this.eh(';') ? null : this.expr();
          this.espera(';');
          return { k: 'ret', e, linha: t.linha };
        }
        case 'break': this.p++; this.espera(';'); return { k: 'break', linha: t.linha };
        case 'continue': this.p++; this.espera(';'); return { k: 'continue', linha: t.linha };
        case 'else': throw new ErroSimulacao('"else" sem "if" correspondente.', t.linha);
      }
      if (this.ehTipo()) {
        this.tipo();
        const d: Stmt = { k: 'decl', itens: this.itensDecl() };
        this.espera(';');
        return d;
      }
    }
    const e = this.expr();
    this.espera(';');
    return { k: 'expr', e };
  }

  expr(): Expr {
    let e = this.atribuicao();
    while (this.eh(',') ) {
      // operador vírgula (ex.: for (i = 0, j = 0; ...))
      const linha = this.atual.linha;
      this.p++;
      e = { k: 'bin', op: ',', a: e, b: this.atribuicao(), linha };
    }
    return e;
  }

  private atribuicao(): Expr {
    const e = this.ternario();
    const t = this.atual;
    if (t.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^='].includes(t.v)) {
      this.p++;
      return { k: 'atr', op: t.v, alvo: this.lvalor(e, t), e: this.atribuicao(), linha: t.linha };
    }
    return e;
  }

  private lvalor(e: Expr, t: Tok): Alvo {
    if (e.k === 'var' || e.k === 'idx') return e;
    throw new ErroSimulacao(`O lado esquerdo de "${t.v}" precisa ser uma variável.`, t.linha);
  }

  private ternario(): Expr {
    const c = this.binario(0);
    if (this.eh('?')) {
      const linha = this.atual.linha;
      this.p++;
      const a = this.expr();
      this.espera(':');
      return { k: 'cond', c, a, b: this.ternario(), linha };
    }
    return c;
  }

  private static NIVEIS = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%']];

  private binario(nivel: number): Expr {
    if (nivel >= Parser.NIVEIS.length) return this.unario();
    let a = this.binario(nivel + 1);
    while (this.atual.t === 'op' && Parser.NIVEIS[nivel].includes(this.atual.v)) {
      const t = this.toks[this.p++];
      a = { k: 'bin', op: t.v, a, b: this.binario(nivel + 1), linha: t.linha };
    }
    return a;
  }

  private unario(): Expr {
    const t = this.atual;
    if (t.t === 'op') {
      if (['-', '+', '!', '~'].includes(t.v)) { this.p++; return { k: 'un', op: t.v, e: this.unario(), linha: t.linha }; }
      if (t.v === '++' || t.v === '--') {
        this.p++;
        return { k: 'inc', d: t.v === '++' ? 1 : -1, pre: true, alvo: this.lvalor(this.unario(), t), linha: t.linha };
      }
      if (t.v === '&') {
        this.p++;
        return { k: 'addr', alvo: this.lvalor(this.unario(), t), linha: t.linha };
      }
      if (t.v === '*') throw new ErroSimulacao('Ponteiros não são suportados pelo simulador.', t.linha);
      if (t.v === '(' && this.ehTipo(this.prox())) {          // conversão de tipo: (pid_t) x
        this.p++; this.tipo();
        if (this.eh('*')) throw new ErroSimulacao('Ponteiros não são suportados pelo simulador.', t.linha);
        this.espera(')');
        return this.unario();
      }
    }
    return this.posfixo();
  }

  private posfixo(): Expr {
    let e = this.primario();
    for (;;) {
      const t = this.atual;
      if (this.eh('[')) {
        if (e.k !== 'var') throw new ErroSimulacao('Só é possível indexar vetores pelo nome.', t.linha);
        this.p++;
        const indice = this.expr();
        this.espera(']');
        e = { k: 'idx', nome: e.nome, indice, linha: t.linha };
      } else if (this.eh('++') || this.eh('--')) {
        this.p++;
        e = { k: 'inc', d: t.v === '++' ? 1 : -1, pre: false, alvo: this.lvalor(e, t), linha: t.linha };
      } else if (this.eh('(')) {
        if (e.k !== 'var') throw new ErroSimulacao('Chamada de função inválida.', t.linha);
        this.p++;
        const args: Expr[] = [];
        if (!this.eh(')')) do { args.push(this.atribuicao()); } while (this.aceita(','));
        this.espera(')');
        e = { k: 'call', nome: e.nome, args, linha: e.linha };
      } else if (this.eh('.') || this.eh('->')) {
        throw new ErroSimulacao('Structs não são suportadas pelo simulador.', t.linha);
      } else {
        return e;
      }
    }
  }

  private primario(): Expr {
    const t = this.atual;
    if (t.t === 'num') { this.p++; return { k: 'num', v: t.n, linha: t.linha }; }
    if (t.t === 'str') {
      let s = '';
      while (this.atual.t === 'str') s += this.toks[this.p++].v;
      return { k: 'str', v: s, linha: t.linha };
    }
    if (this.aceita('(')) {
      const e = this.expr();
      this.espera(')');
      return e;
    }
    if (t.t === 'id' && !TIPOS.has(t.v) && !PALAVRAS.has(t.v)) { this.p++; return { k: 'var', nome: t.v, linha: t.linha }; }
    throw new ErroSimulacao(t.t === 'eof' ? 'O código terminou antes do esperado.' : `Não esperava "${t.v}" aqui.`, t.linha);
  }
}

// ───────────────────────── compilação ─────────────────────────

type Ref = { g: true; nome: string } | { g: false; i: number; nome: string };
type Instr =
  | { op: 'push'; v: number; l: number }
  | { op: 'pop' | 'dup' | 'ret' | 'fim'; l: number }
  | { op: 'load' | 'store' | 'loadi' | 'storei' | 'uninit'; r: Ref; l: number }
  | { op: 'arr'; r: Ref; tam: number; l: number }
  | { op: 'inc' | 'inci'; r: Ref; d: number; pos: boolean; l: number }
  | { op: 'bin' | 'un'; o: string; l: number }
  | { op: 'jmp' | 'jz' | 'jnz'; a: number; l: number }
  | { op: 'call'; f: number; n: number; l: number }
  | { op: 'sys'; nome: string; n: number; l: number; fmt?: string; strs?: (string | null)[]; st?: Ref | null };

interface InfoVar { ref: Ref; vetor: boolean; }
interface FuncCompilada { nome: string; inicio: number; nSlots: number; nParams: number; }

const CONSTANTES: Record<string, number> = { NULL: 0, WNOHANG, EXIT_SUCCESS: 0, EXIT_FAILURE: 1, stdout: 1, stderr: 2, true: 1, false: 0 };
const SYS: Record<string, [number, number]> = {          // nome → [mín, máx] de argumentos
  fork: [0, 0], getpid: [0, 0], getppid: [0, 0], wait: [1, 1], waitpid: [3, 3], sleep: [1, 1],
  exit: [1, 1], _exit: [1, 1], printf: [1, 20], perror: [1, 1], fflush: [1, 1],
  WEXITSTATUS: [1, 1], WIFEXITED: [1, 1], abs: [1, 1],
};

export interface Programa { cod: Instr[]; funcs: FuncCompilada[]; }

class Compilador {
  cod: Instr[] = [];
  funcs: FuncCompilada[] = [];
  private indiceFunc = new Map<string, number>();
  private fontes: Funcao[] = [];
  private globais = new Map<string, InfoVar>();
  private escopos: Map<string, InfoVar>[] = [];
  private nSlots = 0;
  private maxSlots = 0;
  private lacos: { brk: number[]; cont: number[] }[] = [];
  private emFuncao = false;

  private emit(i: Instr): number { this.cod.push(i); return this.cod.length - 1; }
  private aqui(): number { return this.cod.length; }
  private remendar(pos: number, alvo: number): void { (this.cod[pos] as { a: number }).a = alvo; }

  compilar(ast: { funcoes: Funcao[]; globais: ItemDecl[] }): Programa {
    ast.funcoes.forEach(f => {
      if (this.indiceFunc.has(f.nome)) throw new ErroSimulacao(`A função ${f.nome} foi definida duas vezes.`, f.linha);
      if (SYS[f.nome]) throw new ErroSimulacao(`${f.nome} é uma chamada do sistema e não pode ser redefinida.`, f.linha);
      this.indiceFunc.set(f.nome, this.funcs.length);
      this.funcs.push({ nome: f.nome, inicio: -1, nSlots: 0, nParams: f.params.length });
      this.fontes.push(f);
    });
    const main = this.indiceFunc.get('main');
    if (main === undefined) throw new ErroSimulacao('O programa precisa de uma função main().', null);

    // inicialização das variáveis globais, chamada de main e término
    ast.globais.forEach(it => {
      if (this.globais.has(it.nome)) throw new ErroSimulacao(`A variável ${it.nome} foi declarada duas vezes.`, it.linha);
      const ref: Ref = { g: true, nome: it.nome };
      this.globais.set(it.nome, { ref, vetor: it.tam !== null });
      this.declarar(it, ref);
    });
    this.emit({ op: 'call', f: main, n: 0, l: this.fontes[main].linha });
    this.emit({ op: 'fim', l: this.fontes[main].linha });

    this.fontes.forEach((f, idx) => {
      this.funcs[idx].inicio = this.aqui();
      this.escopos = [new Map()];
      this.nSlots = 0;
      this.maxSlots = 0;
      this.emFuncao = true;
      f.params.forEach(p => this.novaLocal(p, false, f.linha));
      this.instr(f.corpo);
      const fim = f.corpo.k === 'bloco' ? f.corpo.fim : f.linha;
      this.emit({ op: 'push', v: 0, l: fim });
      this.emit({ op: 'ret', l: fim });
      this.funcs[idx].nSlots = Math.max(this.maxSlots, 1);
    });
    return { cod: this.cod, funcs: this.funcs };
  }

  private novaLocal(nome: string, vetor: boolean, linha: number): Ref {
    const escopo = this.escopos[this.escopos.length - 1];
    if (escopo.has(nome)) throw new ErroSimulacao(`A variável ${nome} foi declarada duas vezes.`, linha);
    const ref: Ref = { g: false, i: this.nSlots++, nome };
    this.maxSlots = Math.max(this.maxSlots, this.nSlots);
    escopo.set(nome, { ref, vetor });
    return ref;
  }

  private busca(nome: string, linha: number): InfoVar {
    for (let i = this.escopos.length - 1; i >= 0; i--) {
      const v = this.escopos[i].get(nome);
      if (v) return v;
    }
    const g = this.globais.get(nome);
    if (g) return g;
    throw new ErroSimulacao(`A variável ${nome} não foi declarada.`, linha);
  }

  private declarar(it: ItemDecl, ref: Ref): void {
    if (it.tam !== null) {
      this.emit({ op: 'arr', r: ref, tam: it.tam, l: it.linha });
      (it.lista ?? []).forEach((e, i) => {
        this.emit({ op: 'push', v: i, l: it.linha });
        this.expr(e);
        this.emit({ op: 'storei', r: ref, l: it.linha });
        this.emit({ op: 'pop', l: it.linha });
      });
    } else if (it.init) {
      this.expr(it.init);
      this.emit({ op: 'store', r: ref, l: it.linha });
      this.emit({ op: 'pop', l: it.linha });
    } else {
      this.emit({ op: 'uninit', r: ref, l: it.linha });
    }
  }

  private bloco(f: () => void): void {
    this.escopos.push(new Map());
    const salvo = this.nSlots;
    f();
    this.escopos.pop();
    this.nSlots = salvo;
  }

  private instr(s: Stmt): void {
    switch (s.k) {
      case 'vazio': return;
      case 'bloco': this.bloco(() => s.corpo.forEach(x => this.instr(x))); return;
      case 'decl':
        s.itens.forEach(it => {
          // o valor inicial é avaliado antes de a variável existir (int x = x; não é suportado)
          if (it.tam === null && it.init) {
            this.expr(it.init);
            const ref = this.novaLocal(it.nome, false, it.linha);
            this.emit({ op: 'store', r: ref, l: it.linha });
            this.emit({ op: 'pop', l: it.linha });
          } else {
            this.declarar(it, this.novaLocal(it.nome, it.tam !== null, it.linha));
          }
        });
        return;
      case 'expr': this.expr(s.e); this.emit({ op: 'pop', l: s.e.linha }); return;
      case 'if': {
        this.expr(s.c);
        const jz = this.emit({ op: 'jz', a: -1, l: s.c.linha });
        this.instr(s.s);
        if (s.senao) {
          const jmp = this.emit({ op: 'jmp', a: -1, l: s.c.linha });
          this.remendar(jz, this.aqui());
          this.instr(s.senao);
          this.remendar(jmp, this.aqui());
        } else {
          this.remendar(jz, this.aqui());
        }
        return;
      }
      case 'while': {
        const ini = this.aqui();
        this.expr(s.c);
        const jz = this.emit({ op: 'jz', a: -1, l: s.c.linha });
        this.laco(() => this.instr(s.s), ini, () => {
          this.emit({ op: 'jmp', a: ini, l: s.c.linha });
          this.remendar(jz, this.aqui());
        });
        return;
      }
      case 'do': {
        const ini = this.aqui();
        let cont = 0;
        this.laco(() => { this.instr(s.s); cont = this.aqui(); this.expr(s.c); this.emit({ op: 'jnz', a: ini, l: s.c.linha }); }, () => cont, () => {});
        return;
      }
      case 'for':
        this.bloco(() => {
          if (s.ini) this.instr(s.ini);
          const ini = this.aqui();
          let jz = -1;
          if (s.c) { this.expr(s.c); jz = this.emit({ op: 'jz', a: -1, l: s.c.linha }); }
          let cont = 0;
          this.laco(() => {
            this.instr(s.s);
            cont = this.aqui();
            if (s.passo) { this.expr(s.passo); this.emit({ op: 'pop', l: s.passo.linha }); }
            this.emit({ op: 'jmp', a: ini, l: s.c?.linha ?? 0 });
          }, () => cont, () => { if (jz >= 0) this.remendar(jz, this.aqui()); });
        });
        return;
      case 'ret':
        if (s.e) this.expr(s.e); else this.emit({ op: 'push', v: 0, l: s.linha });
        this.emit({ op: 'ret', l: s.linha });
        return;
      case 'break':
      case 'continue': {
        const l = this.lacos[this.lacos.length - 1];
        if (!l) throw new ErroSimulacao(`"${s.k}" fora de um laço.`, s.linha);
        const j = this.emit({ op: 'jmp', a: -1, l: s.linha });
        (s.k === 'break' ? l.brk : l.cont).push(j);
        return;
      }
    }
  }

  /** Compila o corpo de um laço e resolve break/continue. */
  private laco(corpo: () => void, cont: number | (() => number), fim: () => void): void {
    const l = { brk: [] as number[], cont: [] as number[] };
    this.lacos.push(l);
    corpo();
    fim();
    this.lacos.pop();
    const alvoCont = typeof cont === 'number' ? cont : cont();
    l.cont.forEach(j => this.remendar(j, alvoCont));
    l.brk.forEach(j => this.remendar(j, this.aqui()));
  }

  private varEscalar(nome: string, linha: number): Ref {
    const v = this.busca(nome, linha);
    if (v.vetor) throw new ErroSimulacao(`${nome} é um vetor; use ${nome}[índice].`, linha);
    return v.ref;
  }

  private varVetor(nome: string, linha: number): Ref {
    const v = this.busca(nome, linha);
    if (!v.vetor) throw new ErroSimulacao(`${nome} não é um vetor.`, linha);
    return v.ref;
  }

  private expr(e: Expr): void {
    const l = e.linha;
    switch (e.k) {
      case 'num': this.emit({ op: 'push', v: e.v, l }); return;
      case 'str': throw new ErroSimulacao('Texto entre aspas só pode ser usado no printf.', l);
      case 'var':
        if (!this.escopos.some(s => s.has(e.nome)) && !this.globais.has(e.nome) && e.nome in CONSTANTES) {
          this.emit({ op: 'push', v: CONSTANTES[e.nome], l });
        } else {
          this.emit({ op: 'load', r: this.varEscalar(e.nome, l), l });
        }
        return;
      case 'idx':
        this.expr(e.indice);
        this.emit({ op: 'loadi', r: this.varVetor(e.nome, l), l });
        return;
      case 'un': this.expr(e.e); this.emit({ op: 'un', o: e.op, l }); return;
      case 'addr': throw new ErroSimulacao('O operador & só pode ser usado em wait(&status) e waitpid(pid, &status, ...).', l);
      case 'bin':
        if (e.op === '&&' || e.op === '||') {
          this.expr(e.a);
          const j1 = this.emit({ op: e.op === '&&' ? 'jz' : 'jnz', a: -1, l });
          this.expr(e.b);
          const j2 = this.emit({ op: e.op === '&&' ? 'jz' : 'jnz', a: -1, l });
          this.emit({ op: 'push', v: e.op === '&&' ? 1 : 0, l });
          const j3 = this.emit({ op: 'jmp', a: -1, l });
          this.remendar(j1, this.aqui());
          this.remendar(j2, this.aqui());
          this.emit({ op: 'push', v: e.op === '&&' ? 0 : 1, l });
          this.remendar(j3, this.aqui());
        } else if (e.op === ',') {
          this.expr(e.a);
          this.emit({ op: 'pop', l });
          this.expr(e.b);
        } else {
          this.expr(e.a);
          this.expr(e.b);
          this.emit({ op: 'bin', o: e.op, l });
        }
        return;
      case 'cond': {
        this.expr(e.c);
        const jz = this.emit({ op: 'jz', a: -1, l });
        this.expr(e.a);
        const jmp = this.emit({ op: 'jmp', a: -1, l });
        this.remendar(jz, this.aqui());
        this.expr(e.b);
        this.remendar(jmp, this.aqui());
        return;
      }
      case 'atr': {
        const a = e.alvo;
        const op = e.op.slice(0, -1);
        if (a.k === 'var') {
          const r = this.varEscalar(a.nome, l);
          if (op) this.emit({ op: 'load', r, l });
          this.expr(e.e);
          if (op) this.emit({ op: 'bin', o: op, l });
          this.emit({ op: 'store', r, l });
        } else {
          const r = this.varVetor(a.nome, l);
          this.expr(a.indice);
          if (op) { this.emit({ op: 'dup', l }); this.emit({ op: 'loadi', r, l }); }
          this.expr(e.e);
          if (op) this.emit({ op: 'bin', o: op, l });
          this.emit({ op: 'storei', r, l });
        }
        return;
      }
      case 'inc':
        if (e.alvo.k === 'var') {
          this.emit({ op: 'inc', r: this.varEscalar(e.alvo.nome, l), d: e.d, pos: !e.pre, l });
        } else {
          this.expr(e.alvo.indice);
          this.emit({ op: 'inci', r: this.varVetor(e.alvo.nome, l), d: e.d, pos: !e.pre, l });
        }
        return;
      case 'call': this.chamada(e); return;
    }
  }

  private chamada(e: Extract<Expr, { k: 'call' }>): void {
    const l = e.linha;
    const fi = this.indiceFunc.get(e.nome);
    if (fi !== undefined) {
      const f = this.funcs[fi];
      if (e.args.length !== f.nParams) throw new ErroSimulacao(`${e.nome}() espera ${f.nParams} argumento(s).`, l);
      e.args.forEach(a => this.expr(a));
      this.emit({ op: 'call', f: fi, n: e.args.length, l });
      return;
    }
    const lim = SYS[e.nome];
    if (!lim) throw new ErroSimulacao(`A função ${e.nome}() não é suportada pelo simulador.`, l);
    if (e.args.length < lim[0] || e.args.length > lim[1]) {
      throw new ErroSimulacao(`${e.nome}() espera ${lim[0] === lim[1] ? lim[0] : `de ${lim[0]} a ${lim[1]}`} argumento(s).`, l);
    }
    if (e.nome === 'printf' || e.nome === 'perror') {
      const fmt = e.args[0];
      if (fmt.k !== 'str') throw new ErroSimulacao(`O primeiro argumento de ${e.nome} deve ser um texto entre aspas.`, l);
      const strs: (string | null)[] = [];
      e.args.slice(1).forEach(a => {
        if (a.k === 'str') { strs.push(a.v); this.emit({ op: 'push', v: 0, l }); }
        else { strs.push(null); this.expr(a); }
      });
      this.emit({ op: 'sys', nome: e.nome, n: e.args.length - 1, fmt: fmt.v, strs, l });
      return;
    }
    if (e.nome === 'wait' || e.nome === 'waitpid') {
      const pos = e.nome === 'wait' ? 0 : 1;
      const arg = e.args[pos];
      let st: Ref | null = null;
      if (arg.k === 'addr') {
        if (arg.alvo.k !== 'var') throw new ErroSimulacao(`Use ${e.nome}(${pos ? 'pid, ' : ''}&variavel${pos ? ', 0' : ''}).`, l);
        st = this.varEscalar(arg.alvo.nome, l);
      } else if (!(arg.k === 'num' && arg.v === 0) && !(arg.k === 'var' && arg.nome === 'NULL')) {
        throw new ErroSimulacao(`O ${pos + 1}º argumento de ${e.nome} deve ser &variavel, NULL ou 0.`, l);
      }
      if (e.nome === 'waitpid') { this.expr(e.args[0]); this.expr(e.args[2]); }
      this.emit({ op: 'sys', nome: e.nome, n: e.nome === 'waitpid' ? 2 : 0, st, l });
      return;
    }
    if (e.nome === 'fflush') { this.emit({ op: 'push', v: 0, l }); return; }
    e.args.forEach(a => this.expr(a));
    this.emit({ op: 'sys', nome: e.nome === '_exit' ? 'exit' : e.nome, n: e.args.length, l });
  }
}

export function compilar(fonte: string): Programa {
  const toks = lexer(fonte);
  const ast = new Parser(toks).programa();
  return new Compilador().compilar(ast);
}

// ───────────────────────── execução ─────────────────────────

type Valor = number | null | (number | null)[];
interface Frame { f: number; slots: Valor[]; ret: number; }
type Bloqueio = { tipo: 'wait'; alvo: number; st: Ref | null; nome: string } | { tipo: 'sleep'; ate: number; seq: number };

interface Proc {
  pid: number; ppid: number; ppidOrig: number; pc: number;
  pilha: number[]; frames: Frame[]; globais: Record<string, Valor>;
  estado: EstadoProc; bloqueio: Bloqueio | null; status: number | null;
  filhos: number[]; orfao: boolean; ordemFim: number;
  ordem: number; linhaFork: number | null; linhaRet: number;
}

export interface InfoProc { pid: number; ppidOrig: number; ordem: number; linhaFork: number | null; }
export interface EstadoFoto { estado: EstadoProc; ppid: number; detalhe: string; status: number | null; orfao: boolean; }
export interface Foto { t: number; atual: number | null; nSaida: number; procs: { [pid: number]: EstadoFoto }; }
export interface Evento { t: number; pid: number; linha: number | null; tipo: TipoEvento; texto: string; }
export interface LinhaSaida { pid: number; texto: string; linha: number; }
export interface Aviso { linha: number | null; texto: string; }

export interface Resultado {
  processos: InfoProc[];
  eventos: Evento[];
  fotos: Foto[];
  saida: LinhaSaida[];
  avisos: Aviso[];
  tempoFinal: number;
  orfaos: number;
  erro: { texto: string; linha: number | null } | null;
}

export interface OpcoesExecucao { ordem: Ordem; semente?: number; }

/** Gerador pseudoaleatório com semente (mulberry32), para execuções reproduzíveis. */
export function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Formata o texto do printf (%d, %i, %u, %ld, %c, %s, %%, com largura e zeros). */
export function formatar(fmt: string, args: number[], strs: (string | null)[], linha: number): string {
  let i = 0;
  return fmt.replace(/%([-0]*)(\d*)(l{0,2}|h{0,2}|z?)([diucsxX%])/g, (_m, flags: string, larg: string, _len: string, conv: string) => {
    if (conv === '%') return '%';
    if (i >= args.length) throw new ErroSimulacao('O printf tem mais %… do que valores.', linha);
    const s = strs[i];
    const v = args[i++];
    let txt: string;
    if (conv === 's') {
      if (s === null) throw new ErroSimulacao('%s só aceita texto entre aspas no simulador.', linha);
      txt = s;
    } else if (conv === 'c') txt = String.fromCharCode(v);
    else if (conv === 'u') txt = String(v >>> 0);
    else if (conv === 'x') txt = (v >>> 0).toString(16);
    else if (conv === 'X') txt = (v >>> 0).toString(16).toUpperCase();
    else txt = String(v);
    const w = larg ? +larg : 0;
    if (txt.length < w) {
      if (flags.includes('-')) txt = txt.padEnd(w);
      else if (flags.includes('0') && conv !== 's') txt = txt.startsWith('-') ? '-' + txt.slice(1).padStart(w - 1, '0') : txt.padStart(w, '0');
      else txt = txt.padStart(w);
    }
    return txt;
  });
}

function opBin(o: string, a: number, b: number, linha: number): number {
  switch (o) {
    case '+': return (a + b) | 0;
    case '-': return (a - b) | 0;
    case '*': return Math.imul(a, b);
    case '/': if (b === 0) throw new ErroSimulacao('Divisão por zero.', linha); return Math.trunc(a / b) | 0;
    case '%': if (b === 0) throw new ErroSimulacao('Divisão por zero (resto).', linha); return (a % b) | 0;
    case '<': return +(a < b);
    case '>': return +(a > b);
    case '<=': return +(a <= b);
    case '>=': return +(a >= b);
    case '==': return +(a === b);
    case '!=': return +(a !== b);
    case '&': return a & b;
    case '|': return a | b;
    case '^': return a ^ b;
    case '<<': return a << b;
    case '>>': return a >> b;
  }
  throw new ErroSimulacao(`Operador ${o} não suportado.`, linha);
}

type Sinal = 'ok' | 'evento' | 'bloq' | 'fim' | 'cede';

class Maquina {
  private procs = new Map<number, Proc>();
  private fila: number[] = [];
  private t = 0;
  private proximoPid = PID_INICIAL;
  private seqFim = 0;
  private seqSono = 0;
  private atual: number | null = null;
  private orfaos = 0;
  private rand: () => number;
  private avisosVistos = new Set<string>();
  readonly r: Resultado = { processos: [], eventos: [], fotos: [], saida: [], avisos: [], tempoFinal: 0, orfaos: 0, erro: null };

  constructor(private prog: Programa, private op: OpcoesExecucao) {
    this.rand = aleatorio(op.semente ?? 1);
  }

  executar(): Resultado {
    try {
      this.laco();
    } catch (e) {
      if (!(e instanceof ErroSimulacao)) throw e;
      this.r.erro = { texto: e.message, linha: e.linha };
    }
    this.r.tempoFinal = this.t;
    this.r.orfaos = this.orfaos;
    return this.r;
  }

  private laco(): void {
    const raiz = this.novoProc(null, null);
    raiz.estado = 'executando';
    this.atual = raiz.pid;
    this.evento('inicio', raiz.pid, null,
      `O programa começa: o shell (PID ${PID_SHELL}) criou o processo ${raiz.pid}, que executa main().`);
    let ultimo = raiz.pid;
    let instrucoes = 0;

    for (;;) {
      if (this.atual === null) {
        if (this.fila.length === 0) {
          const dormindo = [...this.procs.values()].filter(p => p.bloqueio?.tipo === 'sleep' && p.estado === 'bloqueado');
          if (dormindo.length === 0) break;
          const ate = (p: Proc) => (p.bloqueio as { ate: number }).ate;
          this.t = Math.min(...dormindo.map(ate));
          dormindo.filter(p => ate(p) <= this.t)
            .sort((a, b) => (a.bloqueio as { seq: number }).seq - (b.bloqueio as { seq: number }).seq)
            .forEach(p => {
              p.estado = 'apto';
              this.fila.push(p.pid);
              this.evento('acorda', p.pid, null, `t = ${this.t} s: o PID ${p.pid} acordou do sleep() e voltou para a fila de aptos.`);
            });
          continue;
        }
        const idx = this.op.ordem === 'aleatoria' ? Math.floor(this.rand() * this.fila.length) : 0;
        const pid = this.fila.splice(idx, 1)[0];
        const p = this.procs.get(pid)!;
        p.estado = 'executando';
        this.atual = pid;
        if (pid !== ultimo) this.evento('escalona', pid, null, `O PID ${pid} ganha a CPU.`);
        ultimo = pid;
        if (p.bloqueio) this.completarBloqueio(p);
      }

      const p = this.procs.get(this.atual)!;
      if (++instrucoes > LIMITE_INSTRUCOES) {
        throw new ErroSimulacao('Execução interrompida: instruções demais. Há um laço infinito?', this.prog.cod[p.pc]?.l ?? null);
      }
      const s = this.passo(p);
      if (s === 'bloq' || s === 'fim' || s === 'cede') {
        this.atual = null;
      } else if (s === 'evento' && this.op.ordem === 'aleatoria' && this.fila.length > 0 && this.rand() < 0.3) {
        p.estado = 'apto';
        this.fila.push(p.pid);
        this.atual = null;
      }
    }
  }

  private novoProc(pai: Proc | null, linha: number | null): Proc {
    const pid = this.proximoPid++;
    const p: Proc = pai ? {
      ...pai,
      pid, ppid: pai.pid, ppidOrig: pai.pid,
      pilha: [...pai.pilha],
      frames: pai.frames.map(f => ({ ...f, slots: f.slots.map(v => Array.isArray(v) ? [...v] : v) })),
      globais: Object.fromEntries(Object.entries(pai.globais).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])),
      estado: 'apto', bloqueio: null, status: null, filhos: [], orfao: false, ordemFim: 0,
      ordem: this.r.processos.length, linhaFork: linha, linhaRet: 0,
    } : {
      pid, ppid: PID_SHELL, ppidOrig: PID_SHELL, pc: 0, pilha: [], frames: [], globais: {},
      estado: 'apto', bloqueio: null, status: null, filhos: [], orfao: false, ordemFim: 0,
      ordem: 0, linhaFork: null, linhaRet: 0,
    };
    this.procs.set(pid, p);
    this.r.processos.push({ pid, ppidOrig: p.ppidOrig, ordem: p.ordem, linhaFork: linha });
    return p;
  }

  private evento(tipo: TipoEvento, pid: number, linha: number | null, texto: string): void {
    if (this.r.eventos.length >= LIMITE_EVENTOS) {
      throw new ErroSimulacao(`Simulação interrompida: mais de ${LIMITE_EVENTOS} eventos. Reduza os laços ou a quantidade de printf.`, linha);
    }
    this.r.eventos.push({ t: this.t, pid, linha, tipo, texto });
    const procs: { [pid: number]: EstadoFoto } = {};
    this.procs.forEach(p => {
      let detalhe = '';
      if (p.bloqueio?.tipo === 'wait' && p.estado === 'bloqueado') detalhe = p.bloqueio.nome;
      if (p.bloqueio?.tipo === 'sleep' && p.estado === 'bloqueado') detalhe = `sleep até ${p.bloqueio.ate} s`;
      procs[p.pid] = { estado: p.estado, ppid: p.ppid, detalhe, status: p.status, orfao: p.orfao };
    });
    this.r.fotos.push({ t: this.t, atual: this.atual, nSaida: this.r.saida.length, procs });
  }

  private aviso(linha: number | null, texto: string): void {
    const chave = `${linha}|${texto}`;
    if (this.avisosVistos.has(chave)) return;
    this.avisosVistos.add(chave);
    this.r.avisos.push({ linha, texto });
  }

  // ─── memória do processo ───
  private ler(p: Proc, r: Ref): Valor {
    return r.g ? p.globais[r.nome] : p.frames[p.frames.length - 1].slots[r.i];
  }
  private gravar(p: Proc, r: Ref, v: Valor): void {
    if (r.g) p.globais[r.nome] = v;
    else p.frames[p.frames.length - 1].slots[r.i] = v;
  }
  private escalar(p: Proc, r: Ref, l: number): number {
    const v = this.ler(p, r);
    if (v === null || v === undefined) {
      this.aviso(l, `Linha ${l}: ${r.nome} é usada sem valor inicial. O simulador considera 0, mas em C o valor é indefinido.`);
      return 0;
    }
    return v as number;
  }
  private vetor(p: Proc, r: Ref, idx: number, l: number): (number | null)[] {
    const v = this.ler(p, r) as (number | null)[];
    if (idx < 0 || idx >= v.length) throw new ErroSimulacao(`Índice ${idx} fora do vetor ${r.nome}[${v.length}].`, l);
    return v;
  }
  private elemento(p: Proc, r: Ref, idx: number, l: number): number {
    const v = this.vetor(p, r, idx, l)[idx];
    if (v === null) {
      this.aviso(l, `Linha ${l}: ${r.nome}[${idx}] é usado sem valor inicial. O simulador considera 0, mas em C o valor é indefinido.`);
      return 0;
    }
    return v;
  }

  // ─── uma instrução ───
  private passo(p: Proc): Sinal {
    const ins = this.prog.cod[p.pc++];
    const s = p.pilha;
    const l = ins.l;
    switch (ins.op) {
      case 'push': s.push(ins.v); return 'ok';
      case 'pop': s.pop(); return 'ok';
      case 'dup': s.push(s[s.length - 1]); return 'ok';
      case 'load': s.push(this.escalar(p, ins.r, l)); return 'ok';
      case 'store': this.gravar(p, ins.r, s[s.length - 1]); return 'ok';
      case 'uninit': this.gravar(p, ins.r, ins.r.g ? 0 : null); return 'ok';   // globais começam com 0
      case 'arr': this.gravar(p, ins.r, new Array(ins.tam).fill(ins.r.g ? 0 : null)); return 'ok';
      case 'loadi': { const i = s.pop()!; s.push(this.elemento(p, ins.r, i, l)); return 'ok'; }
      case 'storei': { const v = s.pop()!; const i = s.pop()!; this.vetor(p, ins.r, i, l)[i] = v; s.push(v); return 'ok'; }
      case 'inc': {
        const antigo = this.escalar(p, ins.r, l);
        const novo = (antigo + ins.d) | 0;
        this.gravar(p, ins.r, novo);
        s.push(ins.pos ? antigo : novo);
        return 'ok';
      }
      case 'inci': {
        const i = s.pop()!;
        const antigo = this.elemento(p, ins.r, i, l);
        const novo = (antigo + ins.d) | 0;
        this.vetor(p, ins.r, i, l)[i] = novo;
        s.push(ins.pos ? antigo : novo);
        return 'ok';
      }
      case 'bin': { const b = s.pop()!; const a = s.pop()!; s.push(opBin(ins.o, a, b, l)); return 'ok'; }
      case 'un': {
        const a = s.pop()!;
        s.push(ins.o === '-' ? (-a | 0) : ins.o === '!' ? +(a === 0) : ins.o === '~' ? ~a : a);
        return 'ok';
      }
      case 'jmp': p.pc = ins.a; return 'ok';
      case 'jz': if (s.pop() === 0) p.pc = ins.a; return 'ok';
      case 'jnz': if (s.pop() !== 0) p.pc = ins.a; return 'ok';
      case 'call': {
        if (p.frames.length >= 200) throw new ErroSimulacao('Recursão profunda demais.', l);
        const f = this.prog.funcs[ins.f];
        const slots: Valor[] = new Array(f.nSlots).fill(null);
        const args = s.splice(s.length - ins.n, ins.n);
        args.forEach((v, i) => slots[i] = v);
        p.frames.push({ f: ins.f, slots, ret: p.pc });
        p.pc = f.inicio;
        return 'ok';
      }
      case 'ret': {
        const fr = p.frames.pop()!;
        p.pc = fr.ret;
        p.linhaRet = l;
        return 'ok';
      }
      case 'fim': return this.terminar(p, s.pop() ?? 0, p.linhaRet || l, 'return');
      case 'sys': return this.sys(p, ins, l);
    }
  }

  private sys(p: Proc, ins: Extract<Instr, { op: 'sys' }>, l: number): Sinal {
    const s = p.pilha;
    const args = s.splice(s.length - ins.n, ins.n);
    switch (ins.nome) {
      case 'getpid': s.push(p.pid); return 'ok';
      case 'getppid': s.push(p.ppid); return 'ok';
      case 'abs': s.push(Math.abs(args[0]) | 0); return 'ok';
      case 'WEXITSTATUS': s.push((args[0] >> 8) & 0xff); return 'ok';
      case 'WIFEXITED': s.push(1); return 'ok';
      case 'printf':
      case 'perror': {
        const texto = ins.nome === 'perror' ? `${ins.fmt}: Resource temporarily unavailable\n` : formatar(ins.fmt!, args, ins.strs!, l);
        s.push(texto.length);
        if (texto === '') return 'ok';
        const partes = texto.split('\n');
        if (texto.endsWith('\n')) partes.pop();
        partes.forEach(t => this.r.saida.push({ pid: p.pid, texto: t, linha: l }));
        this.evento('printf', p.pid, l, `O PID ${p.pid} imprimiu: ${partes.join(' / ') || '(linha em branco)'}`);
        return 'evento';
      }
      case 'fork': return this.fork(p, l);
      case 'exit': return this.terminar(p, args[0], l, 'exit');
      case 'sleep': {
        const seg = args[0];
        if (seg <= 0) { s.push(0); return 'ok'; }
        p.bloqueio = { tipo: 'sleep', ate: this.t + seg, seq: this.seqSono++ };
        p.estado = 'bloqueado';
        this.evento('sleep', p.pid, l, `O PID ${p.pid} chamou sleep(${seg}): fica bloqueado até t = ${this.t + seg} s.`);
        return 'bloq';
      }
      case 'wait':
      case 'waitpid': {
        const alvo = ins.nome === 'waitpid' && args[0] > 0 ? args[0] : -1;
        const opcoes = ins.nome === 'waitpid' ? args[1] : 0;
        const nome = ins.nome === 'wait' ? 'wait()' : `waitpid(${alvo === -1 ? -1 : alvo})`;
        const candidatos = p.filhos.filter(c => alvo === -1 || c === alvo);
        if (candidatos.length === 0) {
          s.push(-1);
          this.evento('wait', p.pid, l, `O PID ${p.pid} chamou ${nome}, mas não tem ${alvo === -1 ? 'filhos' : `o filho ${alvo}`} para esperar: retornou -1.`);
          return 'evento';
        }
        if (this.coletar(p, candidatos, ins.st ?? null, nome, l)) return 'evento';
        if (opcoes & WNOHANG) {
          s.push(0);
          this.evento('wait', p.pid, l, `O PID ${p.pid} chamou ${nome} com WNOHANG: o filho ainda não terminou, retornou 0 sem bloquear.`);
          return 'evento';
        }
        p.bloqueio = { tipo: 'wait', alvo, st: ins.st ?? null, nome };
        p.estado = 'bloqueado';
        this.evento('wait', p.pid, l, `O PID ${p.pid} chamou ${nome} e ficou bloqueado esperando ${alvo === -1 ? 'um filho' : `o filho ${alvo}`} terminar.`);
        return 'bloq';
      }
    }
    throw new ErroSimulacao(`Chamada ${ins.nome} não suportada.`, l);
  }

  /** Coleta um filho zumbi (se houver) entre os candidatos. Retorna true se coletou. */
  private coletar(p: Proc, candidatos: number[], st: Ref | null, nome: string, l: number | null): boolean {
    const zumbis = candidatos.map(c => this.procs.get(c)!).filter(c => c.estado === 'zumbi').sort((a, b) => a.ordemFim - b.ordemFim);
    const z = zumbis[0];
    if (!z) return false;
    z.estado = 'terminado';
    p.filhos = p.filhos.filter(c => c !== z.pid);
    if (st) this.gravar(p, st, (z.status! & 0xff) << 8);
    p.pilha.push(z.pid);
    this.evento('wait', p.pid, l, `${nome} do PID ${p.pid} retornou ${z.pid}: o zumbi ${z.pid} foi coletado (status de saída ${z.status}).`);
    return true;
  }

  private completarBloqueio(p: Proc): void {
    const b = p.bloqueio!;
    p.bloqueio = null;
    if (b.tipo === 'sleep') { p.pilha.push(0); return; }
    const candidatos = p.filhos.filter(c => b.alvo === -1 || c === b.alvo);
    const l = this.prog.cod[p.pc - 1]?.l ?? null;
    if (!this.coletar(p, candidatos, b.st, b.nome, l)) p.pilha.push(-1);
  }

  private fork(p: Proc, l: number): Sinal {
    if (this.procs.size >= LIMITE_PROCESSOS) {
      p.pilha.push(-1);
      this.aviso(l, `Limite de ${LIMITE_PROCESSOS} processos atingido: fork() retornou -1 (falha), como acontece num sistema sem recursos.`);
      this.evento('fork', p.pid, l, `O PID ${p.pid} chamou fork(), mas o limite de processos foi atingido: fork() retornou -1.`);
      return 'evento';
    }
    const f = this.novoProc(p, l);
    f.pilha.push(0);
    p.pilha.push(f.pid);
    p.filhos.push(f.pid);
    const filhoPrimeiro = this.op.ordem === 'filho' || (this.op.ordem === 'aleatoria' && this.rand() < 0.5);
    this.evento('fork', p.pid, l, `O PID ${p.pid} chamou fork() e criou o PID ${f.pid}. No pai, fork() retorna ${f.pid}; no filho, retorna 0.`);
    if (filhoPrimeiro) {
      p.estado = 'apto';
      this.fila.unshift(f.pid, p.pid);
      return 'cede';
    }
    this.fila.push(f.pid);
    return 'evento';
  }

  private terminar(p: Proc, codigo: number, l: number, como: 'exit' | 'return'): Sinal {
    p.status = codigo & 0xff;
    p.ordemFim = this.seqFim++;
    p.bloqueio = null;
    const partes: string[] = [`O PID ${p.pid} terminou (${como === 'exit' ? `exit(${codigo})` : `return ${p.status} em main`}).`];

    const adotados: number[] = [];
    const coletados: number[] = [];
    p.filhos.forEach(cid => {
      const c = this.procs.get(cid)!;
      c.ppid = PID_INIT;
      c.orfao = true;
      if (c.estado === 'zumbi') { c.estado = 'terminado'; coletados.push(cid); }
      else { adotados.push(cid); this.orfaos++; }
    });
    p.filhos = [];
    if (adotados.length) partes.push(`${adotados.length > 1 ? 'Os filhos' : 'O filho'} ${adotados.join(', ')} ${adotados.length > 1 ? 'ficaram órfãos e foram adotados' : 'ficou órfão e foi adotado'} pelo init (PID 1).`);
    if (coletados.length) partes.push(`O init coletou ${coletados.length > 1 ? 'os zumbis' : 'o zumbi'} ${coletados.join(', ')}.`);

    const pai = this.procs.get(p.ppid);
    if (!pai) {
      p.estado = 'terminado';
      partes.push(p.ppid === PID_INIT ? 'Como é órfão, o init (PID 1) o coletou na hora.' : `O shell (PID ${PID_SHELL}) coletou o processo.`);
    } else {
      p.estado = 'zumbi';
      const b = pai.bloqueio;
      if (pai.estado === 'bloqueado' && b?.tipo === 'wait' && (b.alvo === -1 || b.alvo === p.pid)) {
        pai.estado = 'apto';
        this.fila.push(pai.pid);
        partes.push(`Vira zumbi, e o pai ${pai.pid}, que esperava em ${b.nome}, volta para a fila de aptos.`);
      } else {
        partes.push(`Vira zumbi até o pai ${pai.pid} chamar wait().`);
      }
    }
    this.evento('exit', p.pid, l, partes.join(' '));
    return 'fim';
  }
}

/** Compila e executa o programa. Erros de compilação também voltam em `erro`. */
export function simular(fonte: string, op: OpcoesExecucao = { ordem: 'pai' }): Resultado {
  let prog: Programa;
  try {
    prog = compilar(fonte);
  } catch (e) {
    if (!(e instanceof ErroSimulacao)) throw e;
    return { processos: [], eventos: [], fotos: [], saida: [], avisos: [], tempoFinal: 0, orfaos: 0, erro: { texto: e.message, linha: e.linha } };
  }
  return new Maquina(prog, op).executar();
}
