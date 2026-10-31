// src/app/core/aleatorio.ts
function criarAleatorio(semente) {
  let a = typeof semente === "number" ? semente >>> 0 : hashTexto(semente);
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function inteiro(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function escolher(rnd, lista) {
  return lista[inteiro(rnd, 0, lista.length - 1)];
}
function embaralhar(rnd, lista) {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// src/app/features/processos/models/arvore-processos.ts
var PID_INIT = 1;
var PID_SHELL = 99;
var PID_INICIAL = 100;
var LIMITE_PROCESSOS = 64;
var LIMITE_INSTRUCOES = 5e5;
var LIMITE_EVENTOS = 4e3;
var WNOHANG = 1;
var ErroSimulacao = class extends Error {
  constructor(msg, linha = null) {
    super(msg);
    this.linha = linha;
  }
};
var OPS3 = ["<<=", ">>="];
var OPS2 = ["++", "--", "+=", "-=", "*=", "/=", "%=", "==", "!=", "<=", ">=", "&&", "||", "<<", ">>", "&=", "|=", "^=", "->"];
var OPS1 = "+-*/%=<>!&|^~?:;,(){}[].";
function escape(c) {
  const m = { n: "\n", t: "	", "0": "\0", "\\": "\\", '"': '"', "'": "'", r: "" };
  return m[c] ?? c;
}
function lexer(fonte) {
  const toks = [];
  const defines = /* @__PURE__ */ new Map();
  let i = 0, linha = 1, inicioLinha = true;
  const n = fonte.length;
  const emitir = (tk) => {
    if (tk.t === "id" && defines.has(tk.v)) {
      defines.get(tk.v).forEach((d) => toks.push({ ...d, linha: tk.linha }));
    } else {
      toks.push(tk);
    }
  };
  while (i < n) {
    const c = fonte[i];
    if (c === "\n") {
      linha++;
      i++;
      inicioLinha = true;
      continue;
    }
    if (c === " " || c === "	" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && fonte[i + 1] === "/") {
      while (i < n && fonte[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && fonte[i + 1] === "*") {
      i += 2;
      while (i < n && !(fonte[i] === "*" && fonte[i + 1] === "/")) {
        if (fonte[i] === "\n") linha++;
        i++;
      }
      i += 2;
      continue;
    }
    if (c === "#" && inicioLinha) {
      let fim = i;
      while (fim < n && fonte[fim] !== "\n") fim++;
      const diretiva = fonte.slice(i + 1, fim).trim();
      const m = diretiva.match(/^define\s+([A-Za-z_]\w*)(\()?\s*(.*)$/);
      if (m) {
        if (m[2]) throw new ErroSimulacao("#define com par\xE2metros n\xE3o \xE9 suportado.", linha);
        const corpo = m[3] ? lexer(m[3]).filter((t) => t.t !== "eof") : [];
        const expandido = [];
        corpo.forEach((t) => t.t === "id" && defines.has(t.v) ? expandido.push(...defines.get(t.v)) : expandido.push(t));
        defines.set(m[1], expandido);
      }
      i = fim;
      continue;
    }
    inicioLinha = false;
    if (/[0-9]/.test(c)) {
      let j = i;
      let valor;
      if (c === "0" && /[xX]/.test(fonte[i + 1] ?? "")) {
        j = i + 2;
        while (j < n && /[0-9a-fA-F]/.test(fonte[j])) j++;
        valor = parseInt(fonte.slice(i + 2, j), 16);
      } else {
        while (j < n && /[0-9]/.test(fonte[j])) j++;
        if (fonte[j] === ".") throw new ErroSimulacao("N\xFAmeros com casas decimais n\xE3o s\xE3o suportados (use int).", linha);
        valor = parseInt(fonte.slice(i, j), 10);
      }
      while (j < n && /[uUlL]/.test(fonte[j])) j++;
      emitir({ t: "num", v: fonte.slice(i, j), n: valor | 0, linha });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /\w/.test(fonte[j])) j++;
      emitir({ t: "id", v: fonte.slice(i, j), n: 0, linha });
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < n && fonte[j] !== '"') {
        if (fonte[j] === "\n") throw new ErroSimulacao("Texto entre aspas n\xE3o foi fechado.", linha);
        if (fonte[j] === "\\") {
          s += escape(fonte[j + 1]);
          j += 2;
        } else {
          s += fonte[j];
          j++;
        }
      }
      if (j >= n) throw new ErroSimulacao("Texto entre aspas n\xE3o foi fechado.", linha);
      emitir({ t: "str", v: s, n: 0, linha });
      i = j + 1;
      continue;
    }
    if (c === "'") {
      let ch, j;
      if (fonte[i + 1] === "\\") {
        ch = escape(fonte[i + 2]);
        j = i + 3;
      } else {
        ch = fonte[i + 1];
        j = i + 2;
      }
      if (fonte[j] !== "'") throw new ErroSimulacao("Caractere entre ap\xF3strofos inv\xE1lido.", linha);
      emitir({ t: "num", v: `'${ch}'`, n: ch.charCodeAt(0) || 0, linha });
      i = j + 1;
      continue;
    }
    const op = OPS3.find((o) => fonte.startsWith(o, i)) ?? OPS2.find((o) => fonte.startsWith(o, i)) ?? (OPS1.includes(c) ? c : null);
    if (!op) throw new ErroSimulacao(`Caractere inesperado: ${c}`, linha);
    emitir({ t: "op", v: op, n: 0, linha });
    i += op.length;
  }
  toks.push({ t: "eof", v: "", n: 0, linha });
  return toks;
}
var TIPOS = /* @__PURE__ */ new Set(["int", "long", "short", "unsigned", "signed", "char", "pid_t", "void", "const", "static", "size_t"]);
var PALAVRAS = /* @__PURE__ */ new Set(["if", "else", "while", "do", "for", "return", "break", "continue"]);
var Parser = class _Parser {
  constructor(toks) {
    this.toks = toks;
    this.p = 0;
  }
  get atual() {
    return this.toks[this.p];
  }
  prox(k = 1) {
    return this.toks[Math.min(this.p + k, this.toks.length - 1)];
  }
  eh(v) {
    const t = this.atual;
    return (t.t === "op" || t.t === "id") && t.v === v;
  }
  aceita(v) {
    if (this.eh(v)) {
      this.p++;
      return true;
    }
    return false;
  }
  espera(v) {
    if (!this.eh(v)) {
      const t = this.atual;
      throw new ErroSimulacao(`Esperava "${v}" ${t.t === "eof" ? "antes do fim do c\xF3digo" : `antes de "${t.v}"`}.`, t.linha);
    }
    return this.toks[this.p++];
  }
  ident() {
    const t = this.atual;
    if (t.t !== "id" || TIPOS.has(t.v) || PALAVRAS.has(t.v)) throw new ErroSimulacao(`Esperava um nome ${t.t === "eof" ? "antes do fim do c\xF3digo" : `em vez de "${t.v}"`}.`, t.linha);
    this.p++;
    return t;
  }
  ehTipo(t = this.atual) {
    return t.t === "id" && TIPOS.has(t.v);
  }
  tipo() {
    if (!this.ehTipo()) throw new ErroSimulacao(`Esperava um tipo (int, pid_t...) em vez de "${this.atual.v}".`, this.atual.linha);
    while (this.ehTipo()) this.p++;
  }
  programa() {
    const funcoes = [];
    const globais = [];
    while (this.atual.t !== "eof") {
      this.tipo();
      if (this.eh("*")) throw new ErroSimulacao("Ponteiros n\xE3o s\xE3o suportados pelo simulador.", this.atual.linha);
      if (this.prox().v === "(" && this.prox().t === "op") {
        const nome = this.ident();
        this.espera("(");
        const params = [];
        if (!this.eh(")")) {
          if (this.eh("void") && this.prox().v === ")") this.p++;
          else do {
            this.tipo();
            while (this.aceita("*")) ;
            params.push(this.ident().v);
            if (this.aceita("[")) this.espera("]");
          } while (this.aceita(","));
        }
        this.espera(")");
        if (this.aceita(";")) continue;
        if (!this.eh("{")) this.espera("{");
        funcoes.push({ nome: nome.v, params, corpo: this.instrucao(), linha: nome.linha });
      } else {
        globais.push(...this.itensDecl());
        this.espera(";");
      }
    }
    return { funcoes, globais };
  }
  itensDecl() {
    const itens = [];
    do {
      if (this.eh("*")) throw new ErroSimulacao("Ponteiros n\xE3o s\xE3o suportados pelo simulador.", this.atual.linha);
      const nome = this.ident();
      const item = { nome: nome.v, tam: null, init: null, lista: null, linha: nome.linha };
      if (this.aceita("[")) {
        const t = this.atual;
        if (t.t !== "num") throw new ErroSimulacao("O tamanho do vetor deve ser um n\xFAmero (ou #define).", t.linha);
        this.p++;
        if (t.n <= 0 || t.n > 1e3) throw new ErroSimulacao("Tamanho de vetor deve ficar entre 1 e 1000.", t.linha);
        item.tam = t.n;
        this.espera("]");
      }
      if (this.aceita("=")) {
        if (item.tam !== null) {
          this.espera("{");
          item.lista = [];
          if (!this.eh("}")) do {
            item.lista.push(this.atribuicao());
          } while (this.aceita(",") && !this.eh("}"));
          this.espera("}");
          if (item.lista.length > item.tam) throw new ErroSimulacao("Valores demais para o tamanho do vetor.", nome.linha);
        } else {
          item.init = this.atribuicao();
        }
      }
      itens.push(item);
    } while (this.aceita(","));
    return itens;
  }
  instrucao() {
    const t = this.atual;
    if (this.aceita("{")) {
      const corpo = [];
      while (!this.eh("}")) {
        if (this.atual.t === "eof") throw new ErroSimulacao('Falta fechar "}".', this.atual.linha);
        corpo.push(this.instrucao());
      }
      return { k: "bloco", corpo, fim: this.toks[this.p++].linha };
    }
    if (this.aceita(";")) return { k: "vazio" };
    if (t.t === "id") {
      switch (t.v) {
        case "if": {
          this.p++;
          this.espera("(");
          const c = this.expr();
          this.espera(")");
          const s = this.instrucao();
          return { k: "if", c, s, senao: this.aceita("else") ? this.instrucao() : null };
        }
        case "while": {
          this.p++;
          this.espera("(");
          const c = this.expr();
          this.espera(")");
          return { k: "while", c, s: this.instrucao() };
        }
        case "do": {
          this.p++;
          const s = this.instrucao();
          this.espera("while");
          this.espera("(");
          const c = this.expr();
          this.espera(")");
          this.espera(";");
          return { k: "do", s, c };
        }
        case "for": {
          this.p++;
          this.espera("(");
          let ini = null;
          if (!this.eh(";")) {
            if (this.ehTipo()) {
              this.tipo();
              ini = { k: "decl", itens: this.itensDecl() };
            } else ini = { k: "expr", e: this.expr() };
          }
          this.espera(";");
          const c = this.eh(";") ? null : this.expr();
          this.espera(";");
          const passo = this.eh(")") ? null : this.expr();
          this.espera(")");
          return { k: "for", ini, c, passo, s: this.instrucao() };
        }
        case "return": {
          this.p++;
          const e2 = this.eh(";") ? null : this.expr();
          this.espera(";");
          return { k: "ret", e: e2, linha: t.linha };
        }
        case "break":
          this.p++;
          this.espera(";");
          return { k: "break", linha: t.linha };
        case "continue":
          this.p++;
          this.espera(";");
          return { k: "continue", linha: t.linha };
        case "else":
          throw new ErroSimulacao('"else" sem "if" correspondente.', t.linha);
      }
      if (this.ehTipo()) {
        this.tipo();
        const d = { k: "decl", itens: this.itensDecl() };
        this.espera(";");
        return d;
      }
    }
    const e = this.expr();
    this.espera(";");
    return { k: "expr", e };
  }
  expr() {
    let e = this.atribuicao();
    while (this.eh(",")) {
      const linha = this.atual.linha;
      this.p++;
      e = { k: "bin", op: ",", a: e, b: this.atribuicao(), linha };
    }
    return e;
  }
  atribuicao() {
    const e = this.ternario();
    const t = this.atual;
    if (t.t === "op" && ["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "&=", "|=", "^="].includes(t.v)) {
      this.p++;
      return { k: "atr", op: t.v, alvo: this.lvalor(e, t), e: this.atribuicao(), linha: t.linha };
    }
    return e;
  }
  lvalor(e, t) {
    if (e.k === "var" || e.k === "idx") return e;
    throw new ErroSimulacao(`O lado esquerdo de "${t.v}" precisa ser uma vari\xE1vel.`, t.linha);
  }
  ternario() {
    const c = this.binario(0);
    if (this.eh("?")) {
      const linha = this.atual.linha;
      this.p++;
      const a = this.expr();
      this.espera(":");
      return { k: "cond", c, a, b: this.ternario(), linha };
    }
    return c;
  }
  static {
    this.NIVEIS = [["||"], ["&&"], ["|"], ["^"], ["&"], ["==", "!="], ["<", ">", "<=", ">="], ["<<", ">>"], ["+", "-"], ["*", "/", "%"]];
  }
  binario(nivel) {
    if (nivel >= _Parser.NIVEIS.length) return this.unario();
    let a = this.binario(nivel + 1);
    while (this.atual.t === "op" && _Parser.NIVEIS[nivel].includes(this.atual.v)) {
      const t = this.toks[this.p++];
      a = { k: "bin", op: t.v, a, b: this.binario(nivel + 1), linha: t.linha };
    }
    return a;
  }
  unario() {
    const t = this.atual;
    if (t.t === "op") {
      if (["-", "+", "!", "~"].includes(t.v)) {
        this.p++;
        return { k: "un", op: t.v, e: this.unario(), linha: t.linha };
      }
      if (t.v === "++" || t.v === "--") {
        this.p++;
        return { k: "inc", d: t.v === "++" ? 1 : -1, pre: true, alvo: this.lvalor(this.unario(), t), linha: t.linha };
      }
      if (t.v === "&") {
        this.p++;
        return { k: "addr", alvo: this.lvalor(this.unario(), t), linha: t.linha };
      }
      if (t.v === "*") throw new ErroSimulacao("Ponteiros n\xE3o s\xE3o suportados pelo simulador.", t.linha);
      if (t.v === "(" && this.ehTipo(this.prox())) {
        this.p++;
        this.tipo();
        if (this.eh("*")) throw new ErroSimulacao("Ponteiros n\xE3o s\xE3o suportados pelo simulador.", t.linha);
        this.espera(")");
        return this.unario();
      }
    }
    return this.posfixo();
  }
  posfixo() {
    let e = this.primario();
    for (; ; ) {
      const t = this.atual;
      if (this.eh("[")) {
        if (e.k !== "var") throw new ErroSimulacao("S\xF3 \xE9 poss\xEDvel indexar vetores pelo nome.", t.linha);
        this.p++;
        const indice = this.expr();
        this.espera("]");
        e = { k: "idx", nome: e.nome, indice, linha: t.linha };
      } else if (this.eh("++") || this.eh("--")) {
        this.p++;
        e = { k: "inc", d: t.v === "++" ? 1 : -1, pre: false, alvo: this.lvalor(e, t), linha: t.linha };
      } else if (this.eh("(")) {
        if (e.k !== "var") throw new ErroSimulacao("Chamada de fun\xE7\xE3o inv\xE1lida.", t.linha);
        this.p++;
        const args = [];
        if (!this.eh(")")) do {
          args.push(this.atribuicao());
        } while (this.aceita(","));
        this.espera(")");
        e = { k: "call", nome: e.nome, args, linha: e.linha };
      } else if (this.eh(".") || this.eh("->")) {
        throw new ErroSimulacao("Structs n\xE3o s\xE3o suportadas pelo simulador.", t.linha);
      } else {
        return e;
      }
    }
  }
  primario() {
    const t = this.atual;
    if (t.t === "num") {
      this.p++;
      return { k: "num", v: t.n, linha: t.linha };
    }
    if (t.t === "str") {
      let s = "";
      while (this.atual.t === "str") s += this.toks[this.p++].v;
      return { k: "str", v: s, linha: t.linha };
    }
    if (this.aceita("(")) {
      const e = this.expr();
      this.espera(")");
      return e;
    }
    if (t.t === "id" && !TIPOS.has(t.v) && !PALAVRAS.has(t.v)) {
      this.p++;
      return { k: "var", nome: t.v, linha: t.linha };
    }
    throw new ErroSimulacao(t.t === "eof" ? "O c\xF3digo terminou antes do esperado." : `N\xE3o esperava "${t.v}" aqui.`, t.linha);
  }
};
var CONSTANTES = { NULL: 0, WNOHANG, EXIT_SUCCESS: 0, EXIT_FAILURE: 1, stdout: 1, stderr: 2, true: 1, false: 0 };
var SYS = {
  // nome → [mín, máx] de argumentos
  fork: [0, 0],
  getpid: [0, 0],
  getppid: [0, 0],
  wait: [1, 1],
  waitpid: [3, 3],
  sleep: [1, 1],
  exit: [1, 1],
  _exit: [1, 1],
  printf: [1, 20],
  perror: [1, 1],
  fflush: [1, 1],
  WEXITSTATUS: [1, 1],
  WIFEXITED: [1, 1],
  abs: [1, 1]
};
var Compilador = class {
  constructor() {
    this.cod = [];
    this.funcs = [];
    this.indiceFunc = /* @__PURE__ */ new Map();
    this.fontes = [];
    this.globais = /* @__PURE__ */ new Map();
    this.escopos = [];
    this.nSlots = 0;
    this.maxSlots = 0;
    this.lacos = [];
    this.emFuncao = false;
  }
  emit(i) {
    this.cod.push(i);
    return this.cod.length - 1;
  }
  aqui() {
    return this.cod.length;
  }
  remendar(pos, alvo) {
    this.cod[pos].a = alvo;
  }
  compilar(ast) {
    ast.funcoes.forEach((f) => {
      if (this.indiceFunc.has(f.nome)) throw new ErroSimulacao(`A fun\xE7\xE3o ${f.nome} foi definida duas vezes.`, f.linha);
      if (SYS[f.nome]) throw new ErroSimulacao(`${f.nome} \xE9 uma chamada do sistema e n\xE3o pode ser redefinida.`, f.linha);
      this.indiceFunc.set(f.nome, this.funcs.length);
      this.funcs.push({ nome: f.nome, inicio: -1, nSlots: 0, nParams: f.params.length });
      this.fontes.push(f);
    });
    const main = this.indiceFunc.get("main");
    if (main === void 0) throw new ErroSimulacao("O programa precisa de uma fun\xE7\xE3o main().", null);
    ast.globais.forEach((it) => {
      if (this.globais.has(it.nome)) throw new ErroSimulacao(`A vari\xE1vel ${it.nome} foi declarada duas vezes.`, it.linha);
      const ref = { g: true, nome: it.nome };
      this.globais.set(it.nome, { ref, vetor: it.tam !== null });
      this.declarar(it, ref);
    });
    this.emit({ op: "call", f: main, n: 0, l: this.fontes[main].linha });
    this.emit({ op: "fim", l: this.fontes[main].linha });
    this.fontes.forEach((f, idx) => {
      this.funcs[idx].inicio = this.aqui();
      this.escopos = [/* @__PURE__ */ new Map()];
      this.nSlots = 0;
      this.maxSlots = 0;
      this.emFuncao = true;
      f.params.forEach((p) => this.novaLocal(p, false, f.linha));
      this.instr(f.corpo);
      const fim = f.corpo.k === "bloco" ? f.corpo.fim : f.linha;
      this.emit({ op: "push", v: 0, l: fim });
      this.emit({ op: "ret", l: fim });
      this.funcs[idx].nSlots = Math.max(this.maxSlots, 1);
    });
    return { cod: this.cod, funcs: this.funcs };
  }
  novaLocal(nome, vetor, linha) {
    const escopo = this.escopos[this.escopos.length - 1];
    if (escopo.has(nome)) throw new ErroSimulacao(`A vari\xE1vel ${nome} foi declarada duas vezes.`, linha);
    const ref = { g: false, i: this.nSlots++, nome };
    this.maxSlots = Math.max(this.maxSlots, this.nSlots);
    escopo.set(nome, { ref, vetor });
    return ref;
  }
  busca(nome, linha) {
    for (let i = this.escopos.length - 1; i >= 0; i--) {
      const v = this.escopos[i].get(nome);
      if (v) return v;
    }
    const g = this.globais.get(nome);
    if (g) return g;
    throw new ErroSimulacao(`A vari\xE1vel ${nome} n\xE3o foi declarada.`, linha);
  }
  declarar(it, ref) {
    if (it.tam !== null) {
      this.emit({ op: "arr", r: ref, tam: it.tam, l: it.linha });
      (it.lista ?? []).forEach((e, i) => {
        this.emit({ op: "push", v: i, l: it.linha });
        this.expr(e);
        this.emit({ op: "storei", r: ref, l: it.linha });
        this.emit({ op: "pop", l: it.linha });
      });
    } else if (it.init) {
      this.expr(it.init);
      this.emit({ op: "store", r: ref, l: it.linha });
      this.emit({ op: "pop", l: it.linha });
    } else {
      this.emit({ op: "uninit", r: ref, l: it.linha });
    }
  }
  bloco(f) {
    this.escopos.push(/* @__PURE__ */ new Map());
    const salvo = this.nSlots;
    f();
    this.escopos.pop();
    this.nSlots = salvo;
  }
  instr(s) {
    switch (s.k) {
      case "vazio":
        return;
      case "bloco":
        this.bloco(() => s.corpo.forEach((x) => this.instr(x)));
        return;
      case "decl":
        s.itens.forEach((it) => {
          if (it.tam === null && it.init) {
            this.expr(it.init);
            const ref = this.novaLocal(it.nome, false, it.linha);
            this.emit({ op: "store", r: ref, l: it.linha });
            this.emit({ op: "pop", l: it.linha });
          } else {
            this.declarar(it, this.novaLocal(it.nome, it.tam !== null, it.linha));
          }
        });
        return;
      case "expr":
        this.expr(s.e);
        this.emit({ op: "pop", l: s.e.linha });
        return;
      case "if": {
        this.expr(s.c);
        const jz = this.emit({ op: "jz", a: -1, l: s.c.linha });
        this.instr(s.s);
        if (s.senao) {
          const jmp = this.emit({ op: "jmp", a: -1, l: s.c.linha });
          this.remendar(jz, this.aqui());
          this.instr(s.senao);
          this.remendar(jmp, this.aqui());
        } else {
          this.remendar(jz, this.aqui());
        }
        return;
      }
      case "while": {
        const ini = this.aqui();
        this.expr(s.c);
        const jz = this.emit({ op: "jz", a: -1, l: s.c.linha });
        this.laco(() => this.instr(s.s), ini, () => {
          this.emit({ op: "jmp", a: ini, l: s.c.linha });
          this.remendar(jz, this.aqui());
        });
        return;
      }
      case "do": {
        const ini = this.aqui();
        let cont = 0;
        this.laco(() => {
          this.instr(s.s);
          cont = this.aqui();
          this.expr(s.c);
          this.emit({ op: "jnz", a: ini, l: s.c.linha });
        }, () => cont, () => {
        });
        return;
      }
      case "for":
        this.bloco(() => {
          if (s.ini) this.instr(s.ini);
          const ini = this.aqui();
          let jz = -1;
          if (s.c) {
            this.expr(s.c);
            jz = this.emit({ op: "jz", a: -1, l: s.c.linha });
          }
          let cont = 0;
          this.laco(() => {
            this.instr(s.s);
            cont = this.aqui();
            if (s.passo) {
              this.expr(s.passo);
              this.emit({ op: "pop", l: s.passo.linha });
            }
            this.emit({ op: "jmp", a: ini, l: s.c?.linha ?? 0 });
          }, () => cont, () => {
            if (jz >= 0) this.remendar(jz, this.aqui());
          });
        });
        return;
      case "ret":
        if (s.e) this.expr(s.e);
        else this.emit({ op: "push", v: 0, l: s.linha });
        this.emit({ op: "ret", l: s.linha });
        return;
      case "break":
      case "continue": {
        const l = this.lacos[this.lacos.length - 1];
        if (!l) throw new ErroSimulacao(`"${s.k}" fora de um la\xE7o.`, s.linha);
        const j = this.emit({ op: "jmp", a: -1, l: s.linha });
        (s.k === "break" ? l.brk : l.cont).push(j);
        return;
      }
    }
  }
  /** Compila o corpo de um laço e resolve break/continue. */
  laco(corpo, cont, fim) {
    const l = { brk: [], cont: [] };
    this.lacos.push(l);
    corpo();
    fim();
    this.lacos.pop();
    const alvoCont = typeof cont === "number" ? cont : cont();
    l.cont.forEach((j) => this.remendar(j, alvoCont));
    l.brk.forEach((j) => this.remendar(j, this.aqui()));
  }
  varEscalar(nome, linha) {
    const v = this.busca(nome, linha);
    if (v.vetor) throw new ErroSimulacao(`${nome} \xE9 um vetor; use ${nome}[\xEDndice].`, linha);
    return v.ref;
  }
  varVetor(nome, linha) {
    const v = this.busca(nome, linha);
    if (!v.vetor) throw new ErroSimulacao(`${nome} n\xE3o \xE9 um vetor.`, linha);
    return v.ref;
  }
  expr(e) {
    const l = e.linha;
    switch (e.k) {
      case "num":
        this.emit({ op: "push", v: e.v, l });
        return;
      case "str":
        throw new ErroSimulacao("Texto entre aspas s\xF3 pode ser usado no printf.", l);
      case "var":
        if (!this.escopos.some((s) => s.has(e.nome)) && !this.globais.has(e.nome) && e.nome in CONSTANTES) {
          this.emit({ op: "push", v: CONSTANTES[e.nome], l });
        } else {
          this.emit({ op: "load", r: this.varEscalar(e.nome, l), l });
        }
        return;
      case "idx":
        this.expr(e.indice);
        this.emit({ op: "loadi", r: this.varVetor(e.nome, l), l });
        return;
      case "un":
        this.expr(e.e);
        this.emit({ op: "un", o: e.op, l });
        return;
      case "addr":
        throw new ErroSimulacao("O operador & s\xF3 pode ser usado em wait(&status) e waitpid(pid, &status, ...).", l);
      case "bin":
        if (e.op === "&&" || e.op === "||") {
          this.expr(e.a);
          const j1 = this.emit({ op: e.op === "&&" ? "jz" : "jnz", a: -1, l });
          this.expr(e.b);
          const j2 = this.emit({ op: e.op === "&&" ? "jz" : "jnz", a: -1, l });
          this.emit({ op: "push", v: e.op === "&&" ? 1 : 0, l });
          const j3 = this.emit({ op: "jmp", a: -1, l });
          this.remendar(j1, this.aqui());
          this.remendar(j2, this.aqui());
          this.emit({ op: "push", v: e.op === "&&" ? 0 : 1, l });
          this.remendar(j3, this.aqui());
        } else if (e.op === ",") {
          this.expr(e.a);
          this.emit({ op: "pop", l });
          this.expr(e.b);
        } else {
          this.expr(e.a);
          this.expr(e.b);
          this.emit({ op: "bin", o: e.op, l });
        }
        return;
      case "cond": {
        this.expr(e.c);
        const jz = this.emit({ op: "jz", a: -1, l });
        this.expr(e.a);
        const jmp = this.emit({ op: "jmp", a: -1, l });
        this.remendar(jz, this.aqui());
        this.expr(e.b);
        this.remendar(jmp, this.aqui());
        return;
      }
      case "atr": {
        const a = e.alvo;
        const op = e.op.slice(0, -1);
        if (a.k === "var") {
          const r = this.varEscalar(a.nome, l);
          if (op) this.emit({ op: "load", r, l });
          this.expr(e.e);
          if (op) this.emit({ op: "bin", o: op, l });
          this.emit({ op: "store", r, l });
        } else {
          const r = this.varVetor(a.nome, l);
          this.expr(a.indice);
          if (op) {
            this.emit({ op: "dup", l });
            this.emit({ op: "loadi", r, l });
          }
          this.expr(e.e);
          if (op) this.emit({ op: "bin", o: op, l });
          this.emit({ op: "storei", r, l });
        }
        return;
      }
      case "inc":
        if (e.alvo.k === "var") {
          this.emit({ op: "inc", r: this.varEscalar(e.alvo.nome, l), d: e.d, pos: !e.pre, l });
        } else {
          this.expr(e.alvo.indice);
          this.emit({ op: "inci", r: this.varVetor(e.alvo.nome, l), d: e.d, pos: !e.pre, l });
        }
        return;
      case "call":
        this.chamada(e);
        return;
    }
  }
  chamada(e) {
    const l = e.linha;
    const fi = this.indiceFunc.get(e.nome);
    if (fi !== void 0) {
      const f = this.funcs[fi];
      if (e.args.length !== f.nParams) throw new ErroSimulacao(`${e.nome}() espera ${f.nParams} argumento(s).`, l);
      e.args.forEach((a) => this.expr(a));
      this.emit({ op: "call", f: fi, n: e.args.length, l });
      return;
    }
    const lim = SYS[e.nome];
    if (!lim) throw new ErroSimulacao(`A fun\xE7\xE3o ${e.nome}() n\xE3o \xE9 suportada pelo simulador.`, l);
    if (e.args.length < lim[0] || e.args.length > lim[1]) {
      throw new ErroSimulacao(`${e.nome}() espera ${lim[0] === lim[1] ? lim[0] : `de ${lim[0]} a ${lim[1]}`} argumento(s).`, l);
    }
    if (e.nome === "printf" || e.nome === "perror") {
      const fmt = e.args[0];
      if (fmt.k !== "str") throw new ErroSimulacao(`O primeiro argumento de ${e.nome} deve ser um texto entre aspas.`, l);
      const strs = [];
      e.args.slice(1).forEach((a) => {
        if (a.k === "str") {
          strs.push(a.v);
          this.emit({ op: "push", v: 0, l });
        } else {
          strs.push(null);
          this.expr(a);
        }
      });
      this.emit({ op: "sys", nome: e.nome, n: e.args.length - 1, fmt: fmt.v, strs, l });
      return;
    }
    if (e.nome === "wait" || e.nome === "waitpid") {
      const pos = e.nome === "wait" ? 0 : 1;
      const arg = e.args[pos];
      let st = null;
      if (arg.k === "addr") {
        if (arg.alvo.k !== "var") throw new ErroSimulacao(`Use ${e.nome}(${pos ? "pid, " : ""}&variavel${pos ? ", 0" : ""}).`, l);
        st = this.varEscalar(arg.alvo.nome, l);
      } else if (!(arg.k === "num" && arg.v === 0) && !(arg.k === "var" && arg.nome === "NULL")) {
        throw new ErroSimulacao(`O ${pos + 1}\xBA argumento de ${e.nome} deve ser &variavel, NULL ou 0.`, l);
      }
      if (e.nome === "waitpid") {
        this.expr(e.args[0]);
        this.expr(e.args[2]);
      }
      this.emit({ op: "sys", nome: e.nome, n: e.nome === "waitpid" ? 2 : 0, st, l });
      return;
    }
    if (e.nome === "fflush") {
      this.emit({ op: "push", v: 0, l });
      return;
    }
    e.args.forEach((a) => this.expr(a));
    this.emit({ op: "sys", nome: e.nome === "_exit" ? "exit" : e.nome, n: e.args.length, l });
  }
};
function compilar(fonte) {
  const toks = lexer(fonte);
  const ast = new Parser(toks).programa();
  return new Compilador().compilar(ast);
}
function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function formatar(fmt, args, strs, linha) {
  let i = 0;
  return fmt.replace(/%([-0]*)(\d*)(l{0,2}|h{0,2}|z?)([diucsxX%])/g, (_m, flags, larg, _len, conv) => {
    if (conv === "%") return "%";
    if (i >= args.length) throw new ErroSimulacao("O printf tem mais %\u2026 do que valores.", linha);
    const s = strs[i];
    const v = args[i++];
    let txt;
    if (conv === "s") {
      if (s === null) throw new ErroSimulacao("%s s\xF3 aceita texto entre aspas no simulador.", linha);
      txt = s;
    } else if (conv === "c") txt = String.fromCharCode(v);
    else if (conv === "u") txt = String(v >>> 0);
    else if (conv === "x") txt = (v >>> 0).toString(16);
    else if (conv === "X") txt = (v >>> 0).toString(16).toUpperCase();
    else txt = String(v);
    const w = larg ? +larg : 0;
    if (txt.length < w) {
      if (flags.includes("-")) txt = txt.padEnd(w);
      else if (flags.includes("0") && conv !== "s") txt = txt.startsWith("-") ? "-" + txt.slice(1).padStart(w - 1, "0") : txt.padStart(w, "0");
      else txt = txt.padStart(w);
    }
    return txt;
  });
}
function opBin(o, a, b, linha) {
  switch (o) {
    case "+":
      return a + b | 0;
    case "-":
      return a - b | 0;
    case "*":
      return Math.imul(a, b);
    case "/":
      if (b === 0) throw new ErroSimulacao("Divis\xE3o por zero.", linha);
      return Math.trunc(a / b) | 0;
    case "%":
      if (b === 0) throw new ErroSimulacao("Divis\xE3o por zero (resto).", linha);
      return a % b | 0;
    case "<":
      return +(a < b);
    case ">":
      return +(a > b);
    case "<=":
      return +(a <= b);
    case ">=":
      return +(a >= b);
    case "==":
      return +(a === b);
    case "!=":
      return +(a !== b);
    case "&":
      return a & b;
    case "|":
      return a | b;
    case "^":
      return a ^ b;
    case "<<":
      return a << b;
    case ">>":
      return a >> b;
  }
  throw new ErroSimulacao(`Operador ${o} n\xE3o suportado.`, linha);
}
var Maquina = class {
  constructor(prog, op) {
    this.prog = prog;
    this.op = op;
    this.procs = /* @__PURE__ */ new Map();
    this.fila = [];
    this.t = 0;
    this.proximoPid = PID_INICIAL;
    this.seqFim = 0;
    this.seqSono = 0;
    this.atual = null;
    this.orfaos = 0;
    this.avisosVistos = /* @__PURE__ */ new Set();
    this.r = { processos: [], eventos: [], fotos: [], saida: [], avisos: [], tempoFinal: 0, orfaos: 0, erro: null };
    this.rand = aleatorio(op.semente ?? 1);
  }
  executar() {
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
  laco() {
    const raiz = this.novoProc(null, null);
    raiz.estado = "executando";
    this.atual = raiz.pid;
    this.evento(
      "inicio",
      raiz.pid,
      null,
      `O programa come\xE7a: o shell (PID ${PID_SHELL}) criou o processo ${raiz.pid}, que executa main().`
    );
    let ultimo = raiz.pid;
    let instrucoes = 0;
    for (; ; ) {
      if (this.atual === null) {
        if (this.fila.length === 0) {
          const dormindo = [...this.procs.values()].filter((p3) => p3.bloqueio?.tipo === "sleep" && p3.estado === "bloqueado");
          if (dormindo.length === 0) break;
          const ate = (p3) => p3.bloqueio.ate;
          this.t = Math.min(...dormindo.map(ate));
          dormindo.filter((p3) => ate(p3) <= this.t).sort((a, b) => a.bloqueio.seq - b.bloqueio.seq).forEach((p3) => {
            p3.estado = "apto";
            this.fila.push(p3.pid);
            this.evento("acorda", p3.pid, null, `t = ${this.t} s: o PID ${p3.pid} acordou do sleep() e voltou para a fila de aptos.`);
          });
          continue;
        }
        const idx = this.op.ordem === "aleatoria" ? Math.floor(this.rand() * this.fila.length) : 0;
        const pid = this.fila.splice(idx, 1)[0];
        const p2 = this.procs.get(pid);
        p2.estado = "executando";
        this.atual = pid;
        if (pid !== ultimo) this.evento("escalona", pid, null, `O PID ${pid} ganha a CPU.`);
        ultimo = pid;
        if (p2.bloqueio) this.completarBloqueio(p2);
      }
      const p = this.procs.get(this.atual);
      if (++instrucoes > LIMITE_INSTRUCOES) {
        throw new ErroSimulacao("Execu\xE7\xE3o interrompida: instru\xE7\xF5es demais. H\xE1 um la\xE7o infinito?", this.prog.cod[p.pc]?.l ?? null);
      }
      const s = this.passo(p);
      if (s === "bloq" || s === "fim" || s === "cede") {
        this.atual = null;
      } else if (s === "evento" && this.op.ordem === "aleatoria" && this.fila.length > 0 && this.rand() < 0.3) {
        p.estado = "apto";
        this.fila.push(p.pid);
        this.atual = null;
      }
    }
  }
  novoProc(pai, linha) {
    const pid = this.proximoPid++;
    const p = pai ? {
      ...pai,
      pid,
      ppid: pai.pid,
      ppidOrig: pai.pid,
      pilha: [...pai.pilha],
      frames: pai.frames.map((f) => ({ ...f, slots: f.slots.map((v) => Array.isArray(v) ? [...v] : v) })),
      globais: Object.fromEntries(Object.entries(pai.globais).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])),
      estado: "apto",
      bloqueio: null,
      status: null,
      filhos: [],
      orfao: false,
      ordemFim: 0,
      ordem: this.r.processos.length,
      linhaFork: linha,
      linhaRet: 0
    } : {
      pid,
      ppid: PID_SHELL,
      ppidOrig: PID_SHELL,
      pc: 0,
      pilha: [],
      frames: [],
      globais: {},
      estado: "apto",
      bloqueio: null,
      status: null,
      filhos: [],
      orfao: false,
      ordemFim: 0,
      ordem: 0,
      linhaFork: null,
      linhaRet: 0
    };
    this.procs.set(pid, p);
    this.r.processos.push({ pid, ppidOrig: p.ppidOrig, ordem: p.ordem, linhaFork: linha });
    return p;
  }
  evento(tipo, pid, linha, texto) {
    if (this.r.eventos.length >= LIMITE_EVENTOS) {
      throw new ErroSimulacao(`Simula\xE7\xE3o interrompida: mais de ${LIMITE_EVENTOS} eventos. Reduza os la\xE7os ou a quantidade de printf.`, linha);
    }
    this.r.eventos.push({ t: this.t, pid, linha, tipo, texto });
    const procs = {};
    this.procs.forEach((p) => {
      let detalhe = "";
      if (p.bloqueio?.tipo === "wait" && p.estado === "bloqueado") detalhe = p.bloqueio.nome;
      if (p.bloqueio?.tipo === "sleep" && p.estado === "bloqueado") detalhe = `sleep at\xE9 ${p.bloqueio.ate} s`;
      procs[p.pid] = { estado: p.estado, ppid: p.ppid, detalhe, status: p.status, orfao: p.orfao };
    });
    this.r.fotos.push({ t: this.t, atual: this.atual, nSaida: this.r.saida.length, procs });
  }
  aviso(linha, texto) {
    const chave = `${linha}|${texto}`;
    if (this.avisosVistos.has(chave)) return;
    this.avisosVistos.add(chave);
    this.r.avisos.push({ linha, texto });
  }
  // ─── memória do processo ───
  ler(p, r) {
    return r.g ? p.globais[r.nome] : p.frames[p.frames.length - 1].slots[r.i];
  }
  gravar(p, r, v) {
    if (r.g) p.globais[r.nome] = v;
    else p.frames[p.frames.length - 1].slots[r.i] = v;
  }
  escalar(p, r, l) {
    const v = this.ler(p, r);
    if (v === null || v === void 0) {
      this.aviso(l, `Linha ${l}: ${r.nome} \xE9 usada sem valor inicial. O simulador considera 0, mas em C o valor \xE9 indefinido.`);
      return 0;
    }
    return v;
  }
  vetor(p, r, idx, l) {
    const v = this.ler(p, r);
    if (idx < 0 || idx >= v.length) throw new ErroSimulacao(`\xCDndice ${idx} fora do vetor ${r.nome}[${v.length}].`, l);
    return v;
  }
  elemento(p, r, idx, l) {
    const v = this.vetor(p, r, idx, l)[idx];
    if (v === null) {
      this.aviso(l, `Linha ${l}: ${r.nome}[${idx}] \xE9 usado sem valor inicial. O simulador considera 0, mas em C o valor \xE9 indefinido.`);
      return 0;
    }
    return v;
  }
  // ─── uma instrução ───
  passo(p) {
    const ins = this.prog.cod[p.pc++];
    const s = p.pilha;
    const l = ins.l;
    switch (ins.op) {
      case "push":
        s.push(ins.v);
        return "ok";
      case "pop":
        s.pop();
        return "ok";
      case "dup":
        s.push(s[s.length - 1]);
        return "ok";
      case "load":
        s.push(this.escalar(p, ins.r, l));
        return "ok";
      case "store":
        this.gravar(p, ins.r, s[s.length - 1]);
        return "ok";
      case "uninit":
        this.gravar(p, ins.r, ins.r.g ? 0 : null);
        return "ok";
      case "arr":
        this.gravar(p, ins.r, new Array(ins.tam).fill(ins.r.g ? 0 : null));
        return "ok";
      case "loadi": {
        const i = s.pop();
        s.push(this.elemento(p, ins.r, i, l));
        return "ok";
      }
      case "storei": {
        const v = s.pop();
        const i = s.pop();
        this.vetor(p, ins.r, i, l)[i] = v;
        s.push(v);
        return "ok";
      }
      case "inc": {
        const antigo = this.escalar(p, ins.r, l);
        const novo = antigo + ins.d | 0;
        this.gravar(p, ins.r, novo);
        s.push(ins.pos ? antigo : novo);
        return "ok";
      }
      case "inci": {
        const i = s.pop();
        const antigo = this.elemento(p, ins.r, i, l);
        const novo = antigo + ins.d | 0;
        this.vetor(p, ins.r, i, l)[i] = novo;
        s.push(ins.pos ? antigo : novo);
        return "ok";
      }
      case "bin": {
        const b = s.pop();
        const a = s.pop();
        s.push(opBin(ins.o, a, b, l));
        return "ok";
      }
      case "un": {
        const a = s.pop();
        s.push(ins.o === "-" ? -a | 0 : ins.o === "!" ? +(a === 0) : ins.o === "~" ? ~a : a);
        return "ok";
      }
      case "jmp":
        p.pc = ins.a;
        return "ok";
      case "jz":
        if (s.pop() === 0) p.pc = ins.a;
        return "ok";
      case "jnz":
        if (s.pop() !== 0) p.pc = ins.a;
        return "ok";
      case "call": {
        if (p.frames.length >= 200) throw new ErroSimulacao("Recurs\xE3o profunda demais.", l);
        const f = this.prog.funcs[ins.f];
        const slots = new Array(f.nSlots).fill(null);
        const args = s.splice(s.length - ins.n, ins.n);
        args.forEach((v, i) => slots[i] = v);
        p.frames.push({ f: ins.f, slots, ret: p.pc });
        p.pc = f.inicio;
        return "ok";
      }
      case "ret": {
        const fr = p.frames.pop();
        p.pc = fr.ret;
        p.linhaRet = l;
        return "ok";
      }
      case "fim":
        return this.terminar(p, s.pop() ?? 0, p.linhaRet || l, "return");
      case "sys":
        return this.sys(p, ins, l);
    }
  }
  sys(p, ins, l) {
    const s = p.pilha;
    const args = s.splice(s.length - ins.n, ins.n);
    switch (ins.nome) {
      case "getpid":
        s.push(p.pid);
        return "ok";
      case "getppid":
        s.push(p.ppid);
        return "ok";
      case "abs":
        s.push(Math.abs(args[0]) | 0);
        return "ok";
      case "WEXITSTATUS":
        s.push(args[0] >> 8 & 255);
        return "ok";
      case "WIFEXITED":
        s.push(1);
        return "ok";
      case "printf":
      case "perror": {
        const texto = ins.nome === "perror" ? `${ins.fmt}: Resource temporarily unavailable
` : formatar(ins.fmt, args, ins.strs, l);
        s.push(texto.length);
        if (texto === "") return "ok";
        const partes = texto.split("\n");
        if (texto.endsWith("\n")) partes.pop();
        partes.forEach((t) => this.r.saida.push({ pid: p.pid, texto: t, linha: l }));
        this.evento("printf", p.pid, l, `O PID ${p.pid} imprimiu: ${partes.join(" / ") || "(linha em branco)"}`);
        return "evento";
      }
      case "fork":
        return this.fork(p, l);
      case "exit":
        return this.terminar(p, args[0], l, "exit");
      case "sleep": {
        const seg = args[0];
        if (seg <= 0) {
          s.push(0);
          return "ok";
        }
        p.bloqueio = { tipo: "sleep", ate: this.t + seg, seq: this.seqSono++ };
        p.estado = "bloqueado";
        this.evento("sleep", p.pid, l, `O PID ${p.pid} chamou sleep(${seg}): fica bloqueado at\xE9 t = ${this.t + seg} s.`);
        return "bloq";
      }
      case "wait":
      case "waitpid": {
        const alvo = ins.nome === "waitpid" && args[0] > 0 ? args[0] : -1;
        const opcoes = ins.nome === "waitpid" ? args[1] : 0;
        const nome = ins.nome === "wait" ? "wait()" : `waitpid(${alvo === -1 ? -1 : alvo})`;
        const candidatos = p.filhos.filter((c) => alvo === -1 || c === alvo);
        if (candidatos.length === 0) {
          s.push(-1);
          this.evento("wait", p.pid, l, `O PID ${p.pid} chamou ${nome}, mas n\xE3o tem ${alvo === -1 ? "filhos" : `o filho ${alvo}`} para esperar: retornou -1.`);
          return "evento";
        }
        if (this.coletar(p, candidatos, ins.st ?? null, nome, l)) return "evento";
        if (opcoes & WNOHANG) {
          s.push(0);
          this.evento("wait", p.pid, l, `O PID ${p.pid} chamou ${nome} com WNOHANG: o filho ainda n\xE3o terminou, retornou 0 sem bloquear.`);
          return "evento";
        }
        p.bloqueio = { tipo: "wait", alvo, st: ins.st ?? null, nome };
        p.estado = "bloqueado";
        this.evento("wait", p.pid, l, `O PID ${p.pid} chamou ${nome} e ficou bloqueado esperando ${alvo === -1 ? "um filho" : `o filho ${alvo}`} terminar.`);
        return "bloq";
      }
    }
    throw new ErroSimulacao(`Chamada ${ins.nome} n\xE3o suportada.`, l);
  }
  /** Coleta um filho zumbi (se houver) entre os candidatos. Retorna true se coletou. */
  coletar(p, candidatos, st, nome, l) {
    const zumbis = candidatos.map((c) => this.procs.get(c)).filter((c) => c.estado === "zumbi").sort((a, b) => a.ordemFim - b.ordemFim);
    const z = zumbis[0];
    if (!z) return false;
    z.estado = "terminado";
    p.filhos = p.filhos.filter((c) => c !== z.pid);
    if (st) this.gravar(p, st, (z.status & 255) << 8);
    p.pilha.push(z.pid);
    this.evento("wait", p.pid, l, `${nome} do PID ${p.pid} retornou ${z.pid}: o zumbi ${z.pid} foi coletado (status de sa\xEDda ${z.status}).`);
    return true;
  }
  completarBloqueio(p) {
    const b = p.bloqueio;
    p.bloqueio = null;
    if (b.tipo === "sleep") {
      p.pilha.push(0);
      return;
    }
    const candidatos = p.filhos.filter((c) => b.alvo === -1 || c === b.alvo);
    const l = this.prog.cod[p.pc - 1]?.l ?? null;
    if (!this.coletar(p, candidatos, b.st, b.nome, l)) p.pilha.push(-1);
  }
  fork(p, l) {
    if (this.procs.size >= LIMITE_PROCESSOS) {
      p.pilha.push(-1);
      this.aviso(l, `Limite de ${LIMITE_PROCESSOS} processos atingido: fork() retornou -1 (falha), como acontece num sistema sem recursos.`);
      this.evento("fork", p.pid, l, `O PID ${p.pid} chamou fork(), mas o limite de processos foi atingido: fork() retornou -1.`);
      return "evento";
    }
    const f = this.novoProc(p, l);
    f.pilha.push(0);
    p.pilha.push(f.pid);
    p.filhos.push(f.pid);
    const filhoPrimeiro = this.op.ordem === "filho" || this.op.ordem === "aleatoria" && this.rand() < 0.5;
    this.evento("fork", p.pid, l, `O PID ${p.pid} chamou fork() e criou o PID ${f.pid}. No pai, fork() retorna ${f.pid}; no filho, retorna 0.`);
    if (filhoPrimeiro) {
      p.estado = "apto";
      this.fila.unshift(f.pid, p.pid);
      return "cede";
    }
    this.fila.push(f.pid);
    return "evento";
  }
  terminar(p, codigo, l, como) {
    p.status = codigo & 255;
    p.ordemFim = this.seqFim++;
    p.bloqueio = null;
    const partes = [`O PID ${p.pid} terminou (${como === "exit" ? `exit(${codigo})` : `return ${p.status} em main`}).`];
    const adotados = [];
    const coletados = [];
    p.filhos.forEach((cid) => {
      const c = this.procs.get(cid);
      c.ppid = PID_INIT;
      c.orfao = true;
      if (c.estado === "zumbi") {
        c.estado = "terminado";
        coletados.push(cid);
      } else {
        adotados.push(cid);
        this.orfaos++;
      }
    });
    p.filhos = [];
    if (adotados.length) partes.push(`${adotados.length > 1 ? "Os filhos" : "O filho"} ${adotados.join(", ")} ${adotados.length > 1 ? "ficaram \xF3rf\xE3os e foram adotados" : "ficou \xF3rf\xE3o e foi adotado"} pelo init (PID 1).`);
    if (coletados.length) partes.push(`O init coletou ${coletados.length > 1 ? "os zumbis" : "o zumbi"} ${coletados.join(", ")}.`);
    const pai = this.procs.get(p.ppid);
    if (!pai) {
      p.estado = "terminado";
      partes.push(p.ppid === PID_INIT ? "Como \xE9 \xF3rf\xE3o, o init (PID 1) o coletou na hora." : `O shell (PID ${PID_SHELL}) coletou o processo.`);
    } else {
      p.estado = "zumbi";
      const b = pai.bloqueio;
      if (pai.estado === "bloqueado" && b?.tipo === "wait" && (b.alvo === -1 || b.alvo === p.pid)) {
        pai.estado = "apto";
        this.fila.push(pai.pid);
        partes.push(`Vira zumbi, e o pai ${pai.pid}, que esperava em ${b.nome}, volta para a fila de aptos.`);
      } else {
        partes.push(`Vira zumbi at\xE9 o pai ${pai.pid} chamar wait().`);
      }
    }
    this.evento("exit", p.pid, l, partes.join(" "));
    return "fim";
  }
};
function simular(fonte, op = { ordem: "pai" }) {
  let prog;
  try {
    prog = compilar(fonte);
  } catch (e) {
    if (!(e instanceof ErroSimulacao)) throw e;
    return { processos: [], eventos: [], fotos: [], saida: [], avisos: [], tempoFinal: 0, orfaos: 0, erro: { texto: e.message, linha: e.linha } };
  }
  return new Maquina(prog, op).executar();
}

// src/app/features/processos/models/estados.ts
var NOMES_ESTADO = {
  CRIACAO: "Cria\xE7\xE3o",
  APTO: "Apto",
  EXECUTANDO: "Executando",
  BLOQUEADO: "Bloqueado",
  DESTRUICAO: "Destrui\xE7\xE3o"
};
var ROTULOS_TRANSICAO = {
  CRIACAO: "Cria\xE7\xE3o do processo",
  ADMISSAO: "Admiss\xE3o",
  SELECAO: "Sele\xE7\xE3o (escalonador)",
  PREEMPCAO: "Interrup\xE7\xE3o de HW (preemp\xE7\xE3o)",
  SOLICITA_ES: "Interrup\xE7\xE3o de SW (solicita\xE7\xE3o de E/S)",
  ES_CONCLUIDA: "Interrup\xE7\xE3o de HW (E/S conclu\xEDda)",
  TERMINO: "T\xE9rmino normal (exit)",
  RETORNO_IMEDIATO: "Retorno imediato",
  ENCERRAMENTO_BLOQUEADO: "Interrup\xE7\xE3o de SW (kill) / Exce\xE7\xE3o"
};
var DISPOSITIVOS = [
  { nome: "disco", operacao: "leitura do disco" },
  { nome: "teclado", operacao: "espera por uma tecla" },
  { nome: "rede", operacao: "recebimento de dados pela rede" },
  { nome: "impressora", operacao: "impress\xE3o" }
];
var CORES = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#db2777"];
function aleatorio2(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function gerarProcessos(op, rnd = Math.random) {
  const q = Math.max(1, op.quantum);
  const processos = [];
  for (let i = 0; i < op.quantidade; i++) {
    const passos = [
      { tipo: "CPU", duracao: aleatorio2(rnd, q + 1, 2 * q) },
      { tipo: "ES", duracao: aleatorio2(rnd, 2, 4), dispositivo: DISPOSITIVOS[aleatorio2(rnd, 0, DISPOSITIVOS.length - 1)] },
      { tipo: "CPU", duracao: aleatorio2(rnd, 1, q) }
    ];
    processos.push({
      nome: `P${i + 1}`,
      cor: CORES[i % CORES.length],
      chegada: i === 0 ? 0 : aleatorio2(rnd, 0, 4),
      passos,
      chamadaSistema: null,
      encerramento: null
    });
  }
  if (op.especiais) {
    const p = processos[aleatorio2(rnd, 0, processos.length - 1)];
    p.chamadaSistema = 1;
    const outro = processos.filter((x) => x !== p)[aleatorio2(rnd, 0, processos.length - 2)];
    outro.encerramento = { passo: 1, apos: aleatorio2(rnd, 1, outro.passos[1].duracao - 1), motivo: rnd() < 0.5 ? "kill" : "excecao" };
  }
  return processos;
}
function simular2(processos, quantum) {
  const st = {};
  processos.forEach((p) => st[p.nome] = { estado: null, passo: 0, restante: p.passos[0].duracao, quantumUsado: 0, cpuExecutada: 0, bloqueadoHa: 0 });
  const proc = (n) => processos.find((p) => p.nome === n);
  const fila = [];
  let cpu = null;
  const eventos = [];
  const fotos = [];
  const linhaTempo = {};
  processos.forEach((p) => linhaTempo[p.nome] = []);
  const foto = (t2) => ({
    t: t2,
    estados: Object.fromEntries(processos.map((p) => [p.nome, st[p.nome].estado])),
    fila: [...fila],
    cpu,
    bloqueados: processos.filter((p) => st[p.nome].estado === "BLOQUEADO").map((p) => ({
      nome: p.nome,
      dispositivo: p.passos[st[p.nome].passo].dispositivo.nome,
      restante: st[p.nome].restante
    })),
    cpuExecutada: Object.fromEntries(processos.map((p) => [p.nome, st[p.nome].cpuExecutada]))
  });
  const inicial = foto(0);
  const emitir = (t2, nome, para, transicao, detalhe) => {
    const de = st[nome].estado;
    st[nome].estado = para;
    eventos.push({ t: t2, processo: nome, de, para, transicao, detalhe });
    fotos.push(foto(t2));
  };
  let t = 0;
  for (; t < 200; t++) {
    let preemptar = null;
    if (cpu) {
      const s = st[cpu];
      const p = proc(cpu);
      if (s.restante === 0) {
        s.passo++;
        s.quantumUsado = 0;
        if (s.passo >= p.passos.length) {
          const nome = cpu;
          cpu = null;
          emitir(
            t,
            nome,
            "DESTRUICAO",
            "TERMINO",
            `${nome} concluiu toda a sua execu\xE7\xE3o e chamou exit(): passa de Executando para Destrui\xE7\xE3o e o SO libera seus recursos (PCB, mem\xF3ria).`
          );
        } else {
          const ps = p.passos[s.passo];
          s.restante = ps.duracao;
          s.bloqueadoHa = 0;
          const nome = cpu;
          cpu = null;
          emitir(
            t,
            nome,
            "BLOQUEADO",
            "SOLICITA_ES",
            `${nome} solicita ${ps.dispositivo.operacao} (${ps.duracao} u) por meio de uma chamada de sistema e precisa esperar: vai para Bloqueado e libera a CPU.`
          );
        }
      } else if (s.quantumUsado >= quantum) {
        const chegaAgora = processos.some((x) => x.chegada === t && st[x.nome].estado === null);
        const esTermina = processos.some((x) => st[x.nome].estado === "BLOQUEADO" && st[x.nome].restante === 0);
        if (fila.length > 0 || chegaAgora || esTermina) {
          preemptar = cpu;
        } else {
          s.quantumUsado = 0;
          emitir(
            t,
            cpu,
            "EXECUTANDO",
            "RETORNO_IMEDIATO",
            `O timer interrompeu ${cpu} ao fim do quantum (${quantum} u), mas n\xE3o h\xE1 outro processo apto: o SO devolve a CPU a ${cpu}, que continua Executando.`
          );
        }
      }
    }
    for (const p of processos.filter((x) => x.chegada === t)) {
      emitir(t, p.nome, "CRIACAO", "CRIACAO", `${p.nome} \xE9 criado: o SO monta seu bloco descritor (PCB) e carrega o programa na mem\xF3ria.`);
      emitir(t, p.nome, "APTO", "ADMISSAO", `Admiss\xE3o: ${p.nome} est\xE1 pronto para executar e entra na fila de aptos para disputar o processador.`);
      fila.push(p.nome);
    }
    for (const p of processos.filter((x) => st[x.nome].estado === "BLOQUEADO")) {
      const s = st[p.nome];
      const enc = p.encerramento;
      if (enc && enc.passo === s.passo && s.bloqueadoHa >= enc.apos) {
        emitir(t, p.nome, "DESTRUICAO", "ENCERRAMENTO_BLOQUEADO", enc.motivo === "kill" ? `Outro processo pediu o t\xE9rmino de ${p.nome} (chamada externa, como o kill) enquanto ele esperava a E/S: o SO o encerra direto de Bloqueado para Destrui\xE7\xE3o.` : `Exce\xE7\xE3o (timeout na ${p.passos[s.passo].dispositivo.operacao}): o SO encerra ${p.nome} mesmo estando Bloqueado.`);
        continue;
      }
      if (s.restante === 0) {
        const op = p.passos[s.passo].dispositivo.operacao;
        s.passo++;
        s.restante = p.passos[s.passo].duracao;
        emitir(
          t,
          p.nome,
          "APTO",
          "ES_CONCLUIDA",
          `O dispositivo gerou uma interrup\xE7\xE3o de HW: a ${op} de ${p.nome} terminou. ${p.nome} volta para a fila de aptos (n\xE3o vai direto para a CPU).`
        );
        fila.push(p.nome);
      }
    }
    if (preemptar) {
      st[preemptar].quantumUsado = 0;
      cpu = null;
      const prox = fila[0];
      emitir(
        t,
        preemptar,
        "APTO",
        "PREEMPCAO",
        `Interrup\xE7\xE3o de HW (timer): ${preemptar} usou todo o seu quantum (${quantum} u) e ${prox} est\xE1 esperando. O SO retira a CPU de ${preemptar} (preemp\xE7\xE3o), que volta ao fim da fila de aptos.`
      );
      fila.push(preemptar);
    }
    if (!cpu && fila.length) {
      const nome = fila.shift();
      cpu = nome;
      st[nome].quantumUsado = 0;
      emitir(t, nome, "EXECUTANDO", "SELECAO", `Sele\xE7\xE3o: o escalonador escolhe ${nome}, o primeiro da fila de aptos, e lhe entrega a CPU.`);
    }
    if (processos.every((p) => st[p.nome].estado === "DESTRUICAO")) break;
    processos.forEach((p) => linhaTempo[p.nome].push(st[p.nome].estado === "DESTRUICAO" ? null : st[p.nome].estado));
    if (cpu) {
      const s = st[cpu];
      s.restante--;
      s.quantumUsado++;
      s.cpuExecutada++;
      const p = proc(cpu);
      if (p.chamadaSistema !== null && s.cpuExecutada >= p.chamadaSistema && s.restante > 0) {
        emitir(
          t + 1,
          cpu,
          "EXECUTANDO",
          "RETORNO_IMEDIATO",
          `${cpu} fez uma chamada de sistema simples (ex.: consultar a hora). O SO atende na hora e devolve a CPU: retorno imediato, ${cpu} continua Executando.`
        );
        p.chamadaSistema = null;
      }
    }
    processos.filter((p) => st[p.nome].estado === "BLOQUEADO").forEach((p) => {
      st[p.nome].restante = Math.max(0, st[p.nome].restante - 1);
      st[p.nome].bloqueadoHa++;
    });
  }
  return { processos, quantum, eventos, fotos, inicial, linhaTempo, duracao: t };
}

// src/app/features/avaliacoes/questoes/corrigir.ts
var NAO_SE_APLICA = "-";
function normalizar(tipo, valor) {
  const v = (valor ?? "").trim();
  if (v === "-" || v === "\u2014" || v === "\u2013") return NAO_SE_APLICA;
  switch (tipo) {
    case "numero": {
      if (v === "") return "";
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) ? String(n) : v.toUpperCase();
    }
    case "binario":
      return v.replace(/[\s|_.]/g, "");
    case "texto": {
      const t = v.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[\s|_.]/g, "");
      return ["INTERRUPCAO", "INT", "X"].includes(t) ? "ERRO" : t;
    }
    case "opcao":
      return v;
  }
}
function corrigirQuestao(q, respostas) {
  const campos = {};
  let acertos = 0;
  for (const c of q.publica.campos) {
    const certo = respostas?.[c.id] !== void 0 && normalizar(c.tipo, respostas[c.id]) !== "" && normalizar(c.tipo, respostas[c.id]) === normalizar(c.tipo, q.gabarito[c.id]);
    campos[c.id] = certo;
    if (certo) acertos++;
  }
  return { acertos, total: q.publica.campos.length, campos };
}
function arredondar(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function corrigirProva(questoes, respostas, valorTotal) {
  const valor = questoes.length ? valorTotal / questoes.length : 0;
  let soma = 0;
  const lista = questoes.map((q, i) => {
    const c = corrigirQuestao(q, respostas[String(i)]);
    const nota = c.total ? valor * c.acertos / c.total : 0;
    soma += nota;
    return { ...c, valor: arredondar(valor), nota: arredondar(nota) };
  });
  return { nota: arredondar(soma), questoes: lista };
}

// src/app/features/avaliacoes/questoes/montador.ts
var Montador = class {
  constructor() {
    this.campos = [];
    this.gabarito = {};
  }
  /** Registra o campo e devolve a célula que o mostra na tabela; valor null = "-" (não se aplica). */
  campo(c, valor) {
    this.campos.push(c);
    this.gabarito[c.id] = valor === null ? NAO_SE_APLICA : String(valor);
    return { campo: c.id };
  }
};

// src/app/features/avaliacoes/questoes/processos.ts
var REGRAS_FORK = `O primeiro processo tem PID ${PID_INICIAL} e os demais recebem PIDs em ordem de cria\xE7\xE3o. Uma CPU; depois do fork() o pai continua executando, e cada processo executa at\xE9 bloquear (wait, sleep) ou terminar. As instru\xE7\xF5es s\xE3o instant\xE2neas; o tempo s\xF3 avan\xE7a com sleep().`;
var MAX_PROCESSOS = 8;
function programaArvore(rnd) {
  const modelo = inteiro(rnd, 0, 3);
  if (modelo === 0) {
    const k = inteiro(rnd, 2, 3);
    return [
      "int main() {",
      ...Array.from({ length: k }, () => "    fork();"),
      '    printf("PID %d\\n", getpid());',
      "}"
    ].join("\n");
  }
  if (modelo === 1) {
    const n = inteiro(rnd, 2, 3);
    return [
      "int main() {",
      `    for (int i = 0; i < ${n}; i++) {`,
      "        fork();",
      "    }",
      '    printf("PID %d\\n", getpid());',
      "}"
    ].join("\n");
  }
  if (modelo === 2) {
    const final = rnd() < 0.5;
    return [
      "int main() {",
      "    pid_t p = fork();",
      "    if (p != 0) {",
      "        fork();",
      "    }",
      ...final ? ["    fork();"] : [],
      '    printf("PID %d\\n", getpid());',
      "}"
    ].join("\n");
  }
  const x = inteiro(rnd, 2, 9);
  const a = inteiro(rnd, 1, 5);
  const b = inteiro(rnd, 1, 5);
  const espera = rnd() < 0.5;
  const neto = rnd() < 0.6;
  return [
    "int main() {",
    `    int x = ${x};`,
    "    pid_t p = fork();",
    "    if (p == 0) {",
    `        x = x + ${a};`,
    ...neto ? ["        fork();"] : [],
    '        printf("x = %d\\n", x);',
    "    } else {",
    ...espera ? ["        wait(NULL);"] : [],
    `        x = x * ${b};`,
    '        printf("x = %d\\n", x);',
    "    }",
    "}"
  ].join("\n");
}
function programaZumbi(rnd) {
  const [s1, s2, s3] = embaralhar(rnd, [1, 2, 3, 4, 5, 6]).slice(0, 3);
  const espera = rnd() < 0.5;
  return [
    "int main() {",
    "    pid_t a = fork();",
    "    if (a == 0) {",
    `        sleep(${s1});`,
    '        printf("filho 1 termina\\n");',
    "        exit(0);",
    "    }",
    "    pid_t b = fork();",
    "    if (b == 0) {",
    `        sleep(${s2});`,
    '        printf("filho 2 termina\\n");',
    "        exit(0);",
    "    }",
    `    sleep(${s3});`,
    ...espera ? ["    wait(NULL);"] : [],
    '    printf("pai termina\\n");',
    "}"
  ].join("\n");
}
function executar(codigo) {
  const r = simular(codigo, { ordem: "pai" });
  if (r.erro) throw new Error(`Programa de fork inv\xE1lido: ${r.erro.texto}`);
  if (r.processos.length > MAX_PROCESSOS) throw new Error("Programa com processos demais.");
  return r;
}
function situacoes(r) {
  const s = {};
  for (const p of r.processos) if (p.pid !== PID_INICIAL) s[p.pid] = "normal";
  for (let i = 0; i < r.fotos.length; i++) {
    for (const [pidTexto, e] of Object.entries(r.fotos[i].procs)) {
      const pid = Number(pidTexto);
      if (!(pid in s) || !e.orfao || s[pid] !== "normal") continue;
      s[pid] = r.fotos[i - 1]?.procs[pid]?.estado === "zumbi" ? "zumbi" : "orfao";
    }
  }
  return s;
}
function arvoreQuantos(rnd) {
  const codigo = programaArvore(rnd);
  const r = executar(codigo);
  const m = new Montador();
  return {
    publica: {
      tipo: "arv-quantos",
      titulo: "\xC1rvore de processos \u2014 quantos processos",
      enunciado: "Considere o programa abaixo. Quantos processos existem ao todo (contando o primeiro, sem contar o shell) e quantas linhas s\xE3o impressas?",
      codigo,
      dados: [],
      respostas: [{
        cabecalho: ["Pergunta", "Resposta"],
        linhas: [
          ["Processos ao todo", m.campo({ id: "processos", tipo: "numero", rotulo: "Processos ao todo" }, r.processos.length)],
          ["Linhas impressas", m.campo({ id: "linhas", tipo: "numero", rotulo: "Linhas impressas" }, r.saida.length)]
        ]
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function arvorePais(rnd) {
  const codigo = programaArvore(rnd);
  const r = executar(codigo);
  const m = new Montador();
  const filhos = r.processos.filter((p) => p.pid !== PID_INICIAL);
  return {
    publica: {
      tipo: "arv-pais",
      titulo: "\xC1rvore de processos \u2014 pai de cada processo",
      enunciado: `${REGRAS_FORK} Monte a \xE1rvore: informe o PID do pai (quem chamou o fork que o criou) de cada processo.`,
      codigo,
      dados: [],
      respostas: [{
        titulo: "Processos",
        cabecalho: ["PID", "PID do pai"],
        linhas: filhos.map((p) => [
          String(p.pid),
          m.campo({ id: `ppid-${p.pid}`, tipo: "numero", rotulo: `Pai do PID ${p.pid}` }, p.ppidOrig)
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function arvoreSaida(rnd) {
  const codigo = programaArvore(rnd);
  const r = executar(codigo);
  const m = new Montador();
  return {
    publica: {
      tipo: "arv-saida",
      titulo: "\xC1rvore de processos \u2014 sa\xEDda do programa",
      enunciado: `${REGRAS_FORK} Escreva as linhas impressas, na ordem em que aparecem na tela.`,
      codigo,
      dados: [],
      respostas: [{
        titulo: "Sa\xEDda",
        cabecalho: ["Linha", "Texto impresso"],
        linhas: r.saida.map((s, i) => [
          String(i + 1),
          m.campo({ id: `linha${i}`, tipo: "texto", rotulo: `Linha ${i + 1}`, dica: "ex.: PID 100" }, s.texto.trim())
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var OPCOES_SITUACAO = [
  { valor: "normal", rotulo: "Coletado pelo pai (wait)" },
  { valor: "zumbi", rotulo: "Zumbi at\xE9 o pai terminar" },
  { valor: "orfao", rotulo: "\xD3rf\xE3o (adotado pelo init)" }
];
function arvoreZumbi(rnd) {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const codigo = programaZumbi(rnd);
    const r = executar(codigo);
    const sit = situacoes(r);
    if (!Object.values(sit).some((s) => s !== "normal")) continue;
    const m = new Montador();
    return {
      publica: {
        tipo: "arv-zumbi",
        titulo: "\xC1rvore de processos \u2014 zumbi e \xF3rf\xE3o",
        enunciado: `${REGRAS_FORK} Um processo que termina fica zumbi at\xE9 o pai chamar wait; se o pai termina antes do filho, o filho fica \xF3rf\xE3o e \xE9 adotado pelo init (PID 1), que coleta os zumbis. Classifique cada filho.`,
        codigo,
        dados: [],
        respostas: [{
          titulo: "Filhos",
          cabecalho: ["PID", "O que acontece"],
          linhas: Object.keys(sit).map(Number).sort((x, y) => x - y).map((pid) => [
            String(pid),
            m.campo({ id: `sit-${pid}`, tipo: "opcao", rotulo: `Situa\xE7\xE3o do PID ${pid}`, opcoes: OPCOES_SITUACAO }, sit[pid])
          ])
        }],
        campos: m.campos
      },
      gabarito: m.gabarito
    };
  }
  throw new Error("N\xE3o foi poss\xEDvel gerar a quest\xE3o de zumbi e \xF3rf\xE3o.");
}
var QUANTUM_ESTADOS = 2;
var EVENTOS_POR_QUESTAO = 8;
function descrever(c, e) {
  const p = c.processos.find((x) => x.nome === e.processo);
  const op = p.passos.find((x) => x.tipo === "ES")?.dispositivo?.operacao ?? "uma E/S";
  switch (e.transicao) {
    case "SELECAO":
      return `O escalonador entrega a CPU a ${e.processo}.`;
    case "PREEMPCAO":
      return `O quantum de ${e.processo} acaba e h\xE1 outro processo esperando a CPU.`;
    case "SOLICITA_ES":
      return `${e.processo} pede ${op}.`;
    case "ES_CONCLUIDA":
      return `A ${op} de ${e.processo} termina.`;
    case "TERMINO":
      return `${e.processo} chega ao fim do programa e chama exit().`;
    case "RETORNO_IMEDIATO":
      return e.detalhe.includes("timer") ? `O quantum de ${e.processo} acaba, mas n\xE3o h\xE1 outro processo apto.` : `${e.processo} faz uma chamada de sistema simples (ex.: consultar a hora).`;
    case "ENCERRAMENTO_BLOQUEADO":
      return e.detalhe.includes("kill") ? `Outro processo pede o t\xE9rmino (kill) de ${e.processo} enquanto ele espera ${op}.` : `Ocorre uma exce\xE7\xE3o (timeout) na E/S de ${e.processo}.`;
    case "CRIACAO":
      return `${e.processo} \xE9 criado.`;
    case "ADMISSAO":
      return `${e.processo} \xE9 admitido.`;
  }
}
function escolherEventos(rnd) {
  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const cenario = simular2(gerarProcessos({ quantidade: 3, quantum: QUANTUM_ESTADOS, especiais: true }, rnd), QUANTUM_ESTADOS);
    const candidatos = cenario.eventos.filter((e) => e.transicao !== "CRIACAO" && e.transicao !== "ADMISSAO");
    const tipos = new Set(candidatos.map((e) => e.transicao));
    if (tipos.size < 6) continue;
    const escolhidos = /* @__PURE__ */ new Set();
    for (const t of embaralhar(rnd, [...tipos])) escolhidos.add(escolher(rnd, candidatos.filter((e) => e.transicao === t)));
    for (const e of embaralhar(rnd, candidatos)) {
      if (escolhidos.size >= EVENTOS_POR_QUESTAO) break;
      escolhidos.add(e);
    }
    const eventos = candidatos.filter((e) => escolhidos.has(e)).slice(0, EVENTOS_POR_QUESTAO);
    return { cenario, eventos };
  }
  throw new Error("N\xE3o foi poss\xEDvel gerar a quest\xE3o de estados.");
}
var OPCOES_ESTADO = Object.keys(NOMES_ESTADO).map((e) => ({ valor: e, rotulo: NOMES_ESTADO[e] }));
var OPCOES_TRANSICAO = Object.keys(ROTULOS_TRANSICAO).filter((t) => t !== "CRIACAO").map((t) => ({ valor: t, rotulo: ROTULOS_TRANSICAO[t] }));
var MODELO_ESTADOS = `Estados do processo: Cria\xE7\xE3o, Apto, Executando, Bloqueado e Destrui\xE7\xE3o (Figura 4.2 do livro). Uma CPU, escalonamento circular com quantum de ${QUANTUM_ESTADOS} u.`;
function estadosApos(rnd) {
  const { cenario, eventos } = escolherEventos(rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: "est-estado",
      titulo: "Estados do processo \u2014 estado ap\xF3s cada evento",
      enunciado: `${MODELO_ESTADOS} Para cada evento, informe em que estado o processo fica logo depois dele.`,
      dados: [],
      respostas: [{
        titulo: "Eventos (em ordem de tempo)",
        cabecalho: ["t", "Evento", "Estado do processo depois"],
        linhas: eventos.map((e, i) => [
          String(e.t),
          descrever(cenario, e),
          m.campo({ id: `est${i}`, tipo: "opcao", rotulo: `Estado ap\xF3s o evento ${i + 1}`, opcoes: OPCOES_ESTADO }, e.para)
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function estadosTransicao(rnd) {
  const { cenario, eventos } = escolherEventos(rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: "est-transicao",
      titulo: "Estados do processo \u2014 nome da transi\xE7\xE3o",
      enunciado: `${MODELO_ESTADOS} Para cada evento, indique a transi\xE7\xE3o que ocorre (como no diagrama do livro).`,
      dados: [],
      respostas: [{
        titulo: "Eventos (em ordem de tempo)",
        cabecalho: ["t", "Evento", "Transi\xE7\xE3o"],
        linhas: eventos.map((e, i) => [
          String(e.t),
          descrever(cenario, e),
          m.campo({ id: `tr${i}`, tipo: "opcao", rotulo: `Transi\xE7\xE3o do evento ${i + 1}`, opcoes: OPCOES_TRANSICAO }, e.transicao)
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var VALIDAS = [
  ["CRIACAO", "APTO", "ADMISSAO"],
  ["APTO", "EXECUTANDO", "SELECAO"],
  ["EXECUTANDO", "APTO", "PREEMPCAO"],
  ["EXECUTANDO", "BLOQUEADO", "SOLICITA_ES"],
  ["BLOQUEADO", "APTO", "ES_CONCLUIDA"],
  ["EXECUTANDO", "DESTRUICAO", "TERMINO"],
  ["EXECUTANDO", "EXECUTANDO", "RETORNO_IMEDIATO"],
  ["BLOQUEADO", "DESTRUICAO", "ENCERRAMENTO_BLOQUEADO"]
];
var INVALIDAS = [
  ["APTO", "BLOQUEADO"],
  ["BLOQUEADO", "EXECUTANDO"],
  ["CRIACAO", "EXECUTANDO"],
  ["APTO", "DESTRUICAO"],
  ["DESTRUICAO", "APTO"],
  ["CRIACAO", "BLOQUEADO"],
  ["APTO", "CRIACAO"],
  ["BLOQUEADO", "BLOQUEADO"]
];
function estadosValida(rnd) {
  const pares = embaralhar(rnd, [
    ...embaralhar(rnd, VALIDAS).slice(0, 4).map(([de, para, t]) => ({ de, para, t })),
    ...embaralhar(rnd, INVALIDAS).slice(0, 4).map(([de, para]) => ({ de, para, t: null }))
  ]);
  const m = new Montador();
  const linhas = pares.map((p, i) => [
    `${NOMES_ESTADO[p.de]} \u2192 ${NOMES_ESTADO[p.para]}`,
    m.campo({
      id: `ok${i}`,
      tipo: "opcao",
      rotulo: `Transi\xE7\xE3o ${i + 1} \xE9 poss\xEDvel?`,
      opcoes: [{ valor: "sim", rotulo: "Sim" }, { valor: "nao", rotulo: "N\xE3o" }]
    }, p.t ? "sim" : "nao"),
    m.campo({
      id: `qual${i}`,
      tipo: "opcao",
      rotulo: `Qual \xE9 a transi\xE7\xE3o ${i + 1}`,
      opcoes: [...OPCOES_TRANSICAO, { valor: "nenhuma", rotulo: "Nenhuma: n\xE3o existe" }]
    }, p.t ?? "nenhuma")
  ]);
  return {
    publica: {
      tipo: "est-valida",
      titulo: "Estados do processo \u2014 transi\xE7\xE3o poss\xEDvel?",
      enunciado: 'Pelo diagrama de estados do livro (incluindo as linhas pontilhadas), diga se cada mudan\xE7a de estado \xE9 poss\xEDvel. Se for, indique qual transi\xE7\xE3o \xE9; se n\xE3o for, escolha "Nenhuma: n\xE3o existe".',
      dados: [],
      respostas: [{ titulo: "Mudan\xE7as de estado", cabecalho: ["De \u2192 para", "Poss\xEDvel?", "Qual transi\xE7\xE3o"], linhas }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var QUESTOES_PROCESSOS = [
  { id: "est-estado", assunto: "Estados do processo", nome: "Estado ap\xF3s cada evento", gerar: estadosApos },
  { id: "est-transicao", assunto: "Estados do processo", nome: "Nome da transi\xE7\xE3o", gerar: estadosTransicao },
  { id: "est-valida", assunto: "Estados do processo", nome: "Transi\xE7\xE3o poss\xEDvel?", gerar: estadosValida },
  { id: "arv-quantos", assunto: "\xC1rvore de processos (fork)", nome: "Quantos processos e linhas", gerar: arvoreQuantos },
  { id: "arv-pais", assunto: "\xC1rvore de processos (fork)", nome: "Pai de cada processo (PPID)", gerar: arvorePais },
  { id: "arv-saida", assunto: "\xC1rvore de processos (fork)", nome: "Sa\xEDda do programa", gerar: arvoreSaida },
  { id: "arv-zumbi", assunto: "\xC1rvore de processos (fork)", nome: "Zumbi e \xF3rf\xE3o", gerar: arvoreZumbi }
];

// src/app/features/escalonamento/models/processo.ts
var Processo = class _Processo {
  constructor(nome, chegada, execucao, prioridade, cor) {
    this.tempoEspera = 0;
    this.tempoExecucao = 0;
    this.entrouNaFila = 0;
    this.saiuDaFila = 0;
    this.nome = nome;
    this.chegada = chegada;
    this.execucao = execucao;
    this.prioridade = prioridade;
    this.cor = cor;
  }
  incrTEspera() {
    this.tempoEspera++;
  }
  incrTExecucao() {
    if (this.execucao != null) {
      this.tempoExecucao += 1;
      return this.tempoExecucao >= this.execucao;
    }
    return false;
  }
  clone() {
    const clone = new _Processo(this.nome, this.chegada, this.execucao, this.prioridade, this.cor);
    clone.tempoEspera = this.tempoEspera;
    clone.tempoExecucao = this.tempoExecucao;
    clone.entrouNaFila = this.entrouNaFila;
    clone.saiuDaFila = this.saiuDaFila;
    clone.prioridade = this.prioridade;
    return clone;
  }
};

// src/app/features/escalonamento/models/lista-processos.ts
var ListaProcessos = class {
  constructor(Processos) {
    this.listaProcessos = Processos;
    this.listaFinalizados = [];
    this.listaProcessos.sort((a, b) => a.chegada - b.chegada);
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  processosPorTempo(tempo) {
    const processosProntos = this.listaProcessos.filter((p) => p.chegada <= tempo);
    this.listaProcessos = this.listaProcessos.filter((p) => p.chegada > tempo);
    return processosProntos;
  }
  addFinalizado(p) {
    if (p) {
      this.listaFinalizados.push(p);
    }
  }
  tabelaResultado(listProcessos) {
    const listAux = listProcessos ?? this.listaFinalizados;
    let espMed = 0;
    let execMed = 0;
    let turnMed = 0;
    let aux;
    var resultado = [];
    for (let i in listAux) {
      aux = listAux[i];
      if (aux.execucao != null) {
        espMed += aux.tempoEspera;
        execMed += aux.execucao;
        turnMed += aux.tempoEspera + aux.execucao;
        resultado.push({ nome: aux.nome, espera: aux.tempoEspera, execucao: aux.execucao, turn: aux.tempoEspera + aux.execucao });
      }
    }
    espMed = parseFloat((espMed / listAux.length).toFixed(2));
    execMed = parseFloat((execMed / listAux.length).toFixed(2));
    turnMed = parseFloat((turnMed / listAux.length).toFixed(2));
    resultado.push({ nome: "M\xE9dia", espera: espMed, execucao: execMed, turn: turnMed });
    return resultado;
  }
};

// src/app/features/escalonamento/models/cpu.ts
var CPU = class {
  constructor() {
    this.processo = null;
    this.ocupado = false;
  }
  alocaProcesso(p) {
    if (p === void 0) {
      return false;
    }
    this.processo = p;
    this.ocupado = true;
    return true;
  }
  retiraProcesso() {
    const p = this.processo;
    this.processo = null;
    this.ocupado = false;
    return p;
  }
  act() {
    if (!this.ocupado) {
      return null;
    }
    if (this.processo && this.processo.incrTExecucao()) {
      const finishedProcess = this.processo;
      this.processo = null;
      this.ocupado = false;
      return finishedProcess;
    }
    return null;
  }
};

// src/app/features/escalonamento/models/fifo.ts
var FIFO = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  addProcesso(processo) {
    if (processo) {
      this.listaProcessos.push(processo);
    }
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera(tempo) {
    this.listaProcessos.forEach((processo) => {
      for (let j = 0; j < tempo; j++) {
        processo.incrTEspera();
      }
    });
  }
};

// src/app/features/escalonamento/models/sjf.ts
var SJF = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  addProcesso(processo) {
    this.listaProcessos.push(processo);
    this.listaProcessos.sort((a, b) => {
      if (a.execucao !== null && b.execucao !== null) {
        return a.execucao - b.execucao;
      }
      return 0;
    });
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera() {
    this.listaProcessos.forEach((processo) => processo.incrTEspera());
  }
};

// src/app/features/escalonamento/models/prio.ts
var Prio = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  /**
   * Insere mantendo a fila ordenada por prioridade: quanto MENOR o número,
   * MAIOR a prioridade (0 é a mais alta), igual ao algoritmo preemptivo.
   * Em caso de empate, vale a ordem de chegada (a ordenação é estável).
   */
  addProcesso(processo) {
    this.listaProcessos.push(processo);
    this.listaProcessos.sort((a, b) => {
      if (a.prioridade != null && b.prioridade != null) {
        return a.prioridade - b.prioridade;
      }
      return 0;
    });
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera() {
    for (let processo of this.listaProcessos) {
      processo.incrTEspera();
    }
  }
};

// src/app/features/escalonamento/models/prio-p.ts
var PrioP = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  addProcesso(processo) {
    this.listaProcessos.push(processo);
    this.listaProcessos.sort((a, b) => {
      if (a.prioridade != null && b.prioridade != null) {
        return a.prioridade - b.prioridade;
      }
      return 0;
    });
  }
  topo() {
    return this.listaProcessos[0];
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera() {
    for (let processo of this.listaProcessos) {
      processo.incrTEspera();
    }
  }
};

// src/app/features/escalonamento/models/escalonador.ts
var Escalonador = class {
  simulaFifo(processos) {
    const escalona = new FIFO();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalona.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalona.addProcesso(p));
      if (!cpu.ocupado && !escalona.vazio()) {
        cpu.alocaProcesso(escalona.escolherProcesso());
      }
      escalona.addTEspera(1);
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }
  simulaSJF(processos) {
    const escalonar = new SJF();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalonar.addProcesso(p));
      if (!cpu.ocupado && !escalonar.vazio()) {
        const escolhido = escalonar.escolherProcesso();
        if (escolhido) cpu.alocaProcesso(escolhido);
      }
      escalonar.addTEspera();
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }
  simulaPrio(processos) {
    const escalona = new Prio();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalona.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalona.addProcesso(p));
      if (!cpu.ocupado && !escalona.vazio()) {
        cpu.alocaProcesso(escalona.escolherProcesso());
      }
      escalona.addTEspera();
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }
  simulaPrioPremp(processos) {
    const escalonar = new PrioP();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalonar.addProcesso(p));
      if (!cpu.ocupado) {
        const proximo = escalonar.escolherProcesso();
        if (proximo) cpu.alocaProcesso(proximo);
      } else {
        const topo = escalonar.topo();
        if (topo?.prioridade != null && cpu.processo?.prioridade != null && cpu.processo.prioridade > topo.prioridade) {
          const interrompido = cpu.retiraProcesso();
          if (interrompido) escalonar.addProcesso(interrompido);
          cpu.alocaProcesso(escalonar.escolherProcesso());
        }
      }
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      escalonar.addTEspera();
      if (finalizado) {
        arrumalista.addFinalizado(finalizado);
        cpu.alocaProcesso(escalonar.escolherProcesso());
      }
      time++;
    }
    return resultado;
  }
  simulaRR(processos, quantum) {
    const escalonar = new FIFO();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    let tmp = 0;
    let chaveamento = 0;
    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      const prontos = arrumalista.processosPorTempo(time);
      while (prontos.length > 0) escalonar.addProcesso(prontos.shift());
      if (chaveamento > 0) {
        const interrompido = cpu.retiraProcesso();
        if (interrompido) escalonar.addProcesso(interrompido);
        chaveamento = 0;
      }
      if (tmp === 0 && !escalonar.vazio()) {
        cpu.alocaProcesso(escalonar.escolherProcesso());
      }
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      if (cpu.ocupado) {
        tmp++;
        const executado = cpu.act();
        if (!cpu.ocupado && executado) {
          arrumalista.addFinalizado(executado);
          tmp = 0;
        }
      }
      escalonar.addTEspera(1);
      time++;
      if (tmp === quantum) {
        tmp = 0;
        chaveamento = 1;
      }
    }
    return resultado;
  }
  simulaMF(processos, config) {
    let tempoCpu = 0;
    let quantum = 0;
    let contQuantum = 0;
    let processoAtual = null;
    let algRR = false;
    let filaAptos = [];
    const diagramaCpu = [];
    let dadosTabelaResultados = [];
    const filaApto = [];
    processos.forEach((p) => {
      if (p.prioridade != null) p.prioridade = Number(p.prioridade);
    });
    const processosOrdenados = [...processos].sort((a, b) => a.chegada - b.chegada);
    const limite = processos.reduce((t, p) => Math.max(t, p.chegada), 0) + processos.reduce((t, p) => t + (p.execucao ?? 0), 0) + 2;
    for (let i = 0; ; i++) {
      if (processosOrdenados.length === 0 && filaAptos.length === 0 && processoAtual === null) break;
      if (i > limite) return { resultado: diagramaCpu, filaApto, tabelaResultados: dadosTabelaResultados };
      while (processosOrdenados.length > 0 && processosOrdenados[0].chegada === tempoCpu) {
        processosOrdenados[0].entrouNaFila = tempoCpu;
        filaAptos = filaAptos.length > 0 ? this.atualizarFilaAptos(filaAptos, processosOrdenados[0]) : [processosOrdenados[0]];
        processosOrdenados.shift();
      }
      let processoAtualAtualizado = false;
      if (filaAptos.length > 0) {
        if (processoAtual === null) {
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (processoAtual.tempoExecucao === processoAtual.execucao) {
          processoAtual.tempoEspera = tempoCpu - (processoAtual.chegada + processoAtual.tempoExecucao);
          dadosTabelaResultados = this.inserirOrdemChegada(dadosTabelaResultados, processoAtual);
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (filaAptos[0].prioridade < processoAtual.prioridade) {
          processoAtual.entrouNaFila = tempoCpu;
          filaAptos = this.atualizarFilaAptos(filaAptos, processoAtual);
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (algRR && quantum === contQuantum) {
          if (filaAptos[0].prioridade === processoAtual.prioridade) {
            processoAtual.entrouNaFila = tempoCpu;
            filaAptos = this.atualizarFilaAptos(filaAptos, processoAtual);
            processoAtual = filaAptos[0];
            processoAtualAtualizado = true;
          } else {
            contQuantum = 0;
          }
        }
        if (processoAtualAtualizado) {
          processoAtual.saiuDaFila = tempoCpu;
          if (processoAtual.saiuDaFila > processoAtual.entrouNaFila) {
            filaApto.push(processoAtual.clone());
          }
          quantum = 0;
          contQuantum = 0;
          filaAptos.shift();
        }
      } else {
        if (processoAtual !== null && processoAtual.tempoExecucao === processoAtual.execucao) {
          processoAtual.tempoEspera = tempoCpu - (processoAtual.chegada + processoAtual.tempoExecucao);
          dadosTabelaResultados = this.inserirOrdemChegada(dadosTabelaResultados, processoAtual);
          processoAtual = null;
        } else if (algRR && quantum === contQuantum) {
          contQuantum = 0;
        }
      }
      if (processoAtual === null && filaAptos.length === 0 && processosOrdenados.length > 0) {
        diagramaCpu.push({ tempo: tempoCpu, nome: "-", cor: "#FFFFFF" });
        tempoCpu++;
        continue;
      }
      if (processoAtualAtualizado) {
        switch (processoAtual.prioridade) {
          case 0:
            algRR = config.filaRR1;
            if (algRR) quantum = config.quantum;
            break;
          case 1:
            algRR = config.filaRR2;
            if (algRR) quantum = config.quantum1;
            break;
          case 2:
            algRR = config.filaRR3;
            if (algRR) quantum = config.quantum2;
            break;
          case 3:
            algRR = config.filaRR4;
            if (algRR) quantum = config.quantum3;
            break;
          default:
            algRR = false;
        }
      }
      contQuantum += algRR ? 1 : 0;
      if (processoAtual !== null) {
        if (processoAtual.tempoExecucao === void 0) processoAtual.tempoExecucao = 0;
        processoAtual.tempoExecucao++;
        diagramaCpu.push({ tempo: tempoCpu, nome: processoAtual.nome, chegada: processoAtual.chegada, cor: processoAtual.cor, prioridade: processoAtual.prioridade });
      }
      tempoCpu++;
    }
    return { resultado: diagramaCpu, filaApto, tabelaResultados: dadosTabelaResultados };
  }
  atualizarFilaAptos(filaAptos, processo) {
    let inseriu = false;
    for (let i = 0; i < filaAptos.length; i++) {
      if (processo.prioridade != null && processo.prioridade < filaAptos[i].prioridade) {
        filaAptos.splice(i, 0, processo);
        inseriu = true;
        break;
      }
    }
    if (!inseriu) filaAptos.push(processo);
    return filaAptos;
  }
  validarPrio(lista) {
    return lista.every((p) => p.prioridade != null);
  }
  inserirOrdemChegada(lista, processo) {
    let inseriu = false;
    for (let i = 0; i < lista.length; i++) {
      if (processo.chegada < lista[i].chegada) {
        lista.splice(i, 0, processo.clone());
        inseriu = true;
        break;
      }
    }
    if (!inseriu) lista.push(processo.clone());
    return lista;
  }
};

// src/app/features/escalonamento/models/exercicio-escalonamento.ts
var NOMES_PROCESSOS = ["A", "B", "C", "D", "E", "F", "G", "H"];
function usaPrioridade(algoritmo) {
  return algoritmo === "PRIO" || algoritmo === "PRIO_P";
}
function gerarProcessosEscalonamento(rnd = Math.random) {
  const processos = [];
  for (let i = 0; i < 4; i++) {
    const chegada = Math.floor(rnd() * 9);
    const execucao = Math.floor(rnd() * 7) + 1;
    const prioridade = Math.floor(rnd() * 4);
    processos.push(new Processo(NOMES_PROCESSOS[i], chegada, execucao, prioridade, ""));
  }
  const quantum = Math.floor(rnd() * 3) + 1;
  return { processos: processos.sort((a, b) => a.chegada - b.chegada), quantum };
}
function gerarGabaritoEscalonamento(processos, algoritmo, quantum, escalonador = new Escalonador()) {
  const copias = processos.map((p) => p.clone());
  copias.forEach((p) => {
    p.tempoEspera = 0;
    p.tempoExecucao = 0;
  });
  let diagrama;
  switch (algoritmo) {
    case "FIFO":
      diagrama = escalonador.simulaFifo(copias);
      break;
    case "SJF":
      diagrama = escalonador.simulaSJF(copias);
      break;
    case "PRIO":
      diagrama = escalonador.simulaPrio(copias);
      break;
    case "PRIO_P":
      diagrama = escalonador.simulaPrioPremp(copias);
      break;
    case "RR":
      diagrama = escalonador.simulaRR(copias, quantum);
      break;
  }
  const tabela2 = [...copias].sort((a, b) => a.chegada - b.chegada).map((p) => ({
    nome: p.nome,
    cor: p.cor,
    espera: p.tempoEspera,
    turnaround: p.tempoEspera + (p.execucao ?? 0)
  }));
  const media = (valores) => valores.length ? parseFloat((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)) : 0;
  return {
    diagrama,
    tabela: tabela2,
    mediaEspera: media(tabela2.map((l) => l.espera)),
    mediaTurnaround: media(tabela2.map((l) => l.turnaround))
  };
}

// src/app/features/avaliacoes/questoes/escalonamento.ts
var NOMES = {
  FIFO: "FIFO",
  SJF: "SJF (n\xE3o preemptivo)",
  PRIO: "Prioridade n\xE3o preemptiva",
  PRIO_P: "Prioridade preemptiva",
  RR: "Round Robin"
};
var REGRAS = {
  FIFO: "Chegadas no mesmo instante: ordem da tabela.",
  SJF: "Empate no tempo de execu\xE7\xE3o: ordem de chegada.",
  PRIO: "Menor n\xFAmero = maior prioridade. Empate: ordem de chegada.",
  PRIO_P: "Menor n\xFAmero = maior prioridade. Empate: ordem de chegada.",
  RR: "Quando um processo chega no mesmo instante em que outro volta por fim de quantum, o que chega entra antes na fila."
};
function gerar(alg, rnd) {
  const { processos, quantum } = gerarProcessosEscalonamento(rnd);
  const g = gerarGabaritoEscalonamento(processos, alg, quantum);
  const prio = usaPrioridade(alg);
  const campos = [];
  const gabarito = {};
  const campo = (id, rotulo, valor) => {
    campos.push({ id, tipo: "numero", rotulo });
    gabarito[id] = String(valor);
    return { campo: id };
  };
  const linhas = g.tabela.map((l) => [
    l.nome,
    campo(`esp-${l.nome}`, `Espera de ${l.nome}`, l.espera),
    campo(`tat-${l.nome}`, `Turnaround de ${l.nome}`, l.turnaround)
  ]);
  linhas.push(["M\xE9dia", campo("media-esp", "M\xE9dia de espera", g.mediaEspera), campo("media-tat", "M\xE9dia de turnaround", g.mediaTurnaround)]);
  return {
    publica: {
      tipo: `esc-${alg}`,
      titulo: `Escalonamento \u2014 ${NOMES[alg]}`,
      enunciado: `Escalone os processos com ${NOMES[alg]}${alg === "RR" ? `, quantum = ${quantum}` : ""} e calcule o tempo de espera e o turnaround de cada processo, e as m\xE9dias (at\xE9 2 casas decimais). Turnaround = t\xE9rmino \u2212 chegada; espera = turnaround \u2212 execu\xE7\xE3o. ${REGRAS[alg]}`,
      dados: [{
        titulo: "Processos",
        cabecalho: ["Processo", "Chegada", "Execu\xE7\xE3o", ...prio ? ["Prioridade"] : []],
        linhas: processos.map((p) => [p.nome, String(p.chegada), String(p.execucao), ...prio ? [String(p.prioridade)] : []])
      }],
      respostas: [{ titulo: "Resultado", cabecalho: ["Processo", "Tempo de espera", "Turnaround"], linhas }],
      campos
    },
    gabarito
  };
}
var QUESTOES_ESCALONAMENTO = ["FIFO", "SJF", "PRIO", "PRIO_P", "RR"].map((alg) => ({
  id: `esc-${alg}`,
  assunto: "Escalonamento",
  nome: `${NOMES[alg]}: espera e turnaround`,
  gerar: (rnd) => gerar(alg, rnd)
}));

// src/app/features/particoes/models/particoes.ts
var ALGORITMOS_FIT = [
  { valor: "FIRST", nome: "First-fit", regra: "a primeira lacuna que comporta o processo, come\xE7ando sempre do in\xEDcio" },
  { valor: "BEST", nome: "Best-fit", regra: "a lacuna que resulta na menor sobra" },
  { valor: "WORST", nome: "Worst-fit", regra: "a lacuna que resulta na maior sobra" },
  { valor: "CIRCULAR", nome: "Circular-fit", regra: "como o first-fit, mas come\xE7ando na lacuna seguinte \xE0 \xFAltima aloca\xE7\xE3o" }
];
function escolherLacuna(lacunas3, tamanho, alg, ponteiro) {
  const cabem = lacunas3.filter((l) => l.tamanho >= tamanho);
  if (cabem.length === 0) return null;
  switch (alg) {
    case "FIRST":
      return cabem[0];
    case "BEST":
      return [...cabem].sort((a, b) => a.tamanho - b.tamanho || a.inicio - b.inicio)[0];
    case "WORST":
      return [...cabem].sort((a, b) => b.tamanho - a.tamanho || a.inicio - b.inicio)[0];
    case "CIRCULAR":
      return cabem.find((l) => l.inicio >= ponteiro) ?? cabem[0];
  }
}
function lacunasEntre(ocupados, inicio, fim) {
  const ord = [...ocupados].sort((a, b) => a.inicio - b.inicio);
  const out = [];
  let cursor = inicio;
  for (const o of ord) {
    if (o.inicio > cursor) out.push({ inicio: cursor, tamanho: o.inicio - cursor });
    cursor = Math.max(cursor, o.inicio + o.tamanho);
  }
  if (cursor < fim) out.push({ inicio: cursor, tamanho: fim - cursor });
  return out;
}

// src/app/features/particoes/models/exercicios-particoes.ts
function inteiro2(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function multiplo(rnd, min, max, passo) {
  return inteiro2(rnd, Math.ceil(min / passo), Math.floor(max / passo)) * passo;
}
var SO_FIXAS = 120;
var AREA_FIXAS = 380;
function iniciosParticoes(particoes) {
  let inicio = SO_FIXAS;
  return particoes.map((t) => {
    const i = inicio;
    inicio += t;
    return i;
  });
}
function escolherParticao(particoes, ocupadas, tamanho, politica) {
  const livres = particoes.map((t, i) => ({ t, i })).filter((x) => !ocupadas[x.i] && x.t >= tamanho);
  if (!livres.length) return null;
  if (politica === "BEST") livres.sort((a, b) => a.t - b.t || a.i - b.i);
  return livres[0].i;
}
function resolverFixas(particoes, politica, passos) {
  const ocupadas = particoes.map(() => null);
  const fila = [];
  const eventos = [];
  for (const p of passos) {
    if ("chega" in p) {
      const i = escolherParticao(particoes, ocupadas, p.chega.tamanho, politica);
      if (i === null) {
        const livre = particoes.reduce((t, x, k) => t + (ocupadas[k] ? 0 : x), 0);
        fila.push(p.chega);
        eventos.push({ tipo: "chegada", processo: p.chega, particao: null, frag: null, externa: livre >= p.chega.tamanho });
      } else {
        ocupadas[i] = p.chega;
        eventos.push({ tipo: "chegada", processo: p.chega, particao: i + 1, frag: particoes[i] - p.chega.tamanho, externa: false });
      }
    } else {
      const i = ocupadas.findIndex((x) => x?.nome === p.termina);
      if (i === -1) return null;
      ocupadas[i] = null;
      const k = fila.findIndex((f) => f.tamanho <= particoes[i]);
      let entra = null;
      if (k !== -1) {
        entra = fila.splice(k, 1)[0];
        ocupadas[i] = entra;
      }
      eventos.push({ tipo: "termino", processo: p.termina, particaoLiberada: i + 1, entra, fragEntra: entra ? particoes[i] - entra.tamanho : null });
    }
  }
  const fragFinal = ocupadas.reduce((t, x, k) => t + (x ? particoes[k] - x.tamanho : 0), 0);
  return { politica, particoes, eventos, fragFinal };
}
function gerarFixas(politica, rnd = Math.random) {
  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const n = inteiro2(rnd, 4, 5);
    let particoes;
    do {
      particoes = Array.from({ length: n }, () => multiplo(rnd, 30, 160, 10));
    } while (particoes.reduce((a, b) => a + b, 0) > AREA_FIXAS);
    const maior = Math.max(...particoes);
    const passos = [];
    const ativos = [];
    let cont = 0;
    const total = inteiro2(rnd, 7, 9);
    for (let e = 0; e < total; e++) {
      if (ativos.length >= 2 && rnd() < 0.3) {
        const nome = ativos.splice(inteiro2(rnd, 0, ativos.length - 1), 1)[0];
        passos.push({ termina: nome });
      } else {
        const tamanho = rnd() < 0.2 ? particoes[inteiro2(rnd, 0, n - 1)] : multiplo(rnd, 10, maior, 5);
        const nome = `P${++cont}`;
        passos.push({ chega: { nome, tamanho } });
        ativos.push(nome);
      }
    }
    const ex = resolverFixas(particoes, politica, passos);
    if (!ex) continue;
    const temFila = ex.eventos.some((ev) => ev.tipo === "chegada" && ev.particao === null);
    const saiDaFila = ex.eventos.some((ev) => ev.tipo === "termino" && ev.entra);
    const temFrag = ex.eventos.some((ev) => ev.tipo === "chegada" && (ev.frag ?? 0) > 0);
    if (temFila && saiDaFila && temFrag) return ex;
  }
  return resolverFixas([200, 100, 50, 30], politica, [
    { chega: { nome: "P1", tamanho: 150 } },
    { chega: { nome: "P2", tamanho: 120 } },
    { chega: { nome: "P3", tamanho: 50 } },
    { chega: { nome: "P4", tamanho: 25 } },
    { termina: "P1" },
    { chega: { nome: "P5", tamanho: 90 } }
  ]);
}
var SO_VAR = 100;
var TOTAL_VAR = 500;
function lacunasVar(alocados) {
  return lacunasEntre(alocados.map((a) => ({ inicio: a.base, tamanho: a.tamanho })), SO_VAR, TOTAL_VAR);
}
function resolverAlocacao(algoritmo, inicial, passos) {
  let alocados = inicial.alocados.map((a) => ({ ...a }));
  let ponteiro = inicial.ponteiro;
  const fila = [];
  const eventos = [];
  const alocar2 = (p) => {
    const lac = escolherLacuna(lacunasVar(alocados), p.tamanho, algoritmo, ponteiro);
    if (!lac) return null;
    alocados.push({ ...p, base: lac.inicio });
    ponteiro = lac.inicio + p.tamanho;
    return lac.inicio;
  };
  for (const passo of passos) {
    if ("chega" in passo) {
      const lacunas3 = lacunasVar(alocados);
      const baseFirst = escolherLacuna(lacunas3, passo.chega.tamanho, "FIRST", ponteiro)?.inicio ?? null;
      const base = alocar2(passo.chega);
      if (base === null) {
        const livre = lacunas3.reduce((t, l) => t + l.tamanho, 0);
        fila.push(passo.chega);
        eventos.push({ tipo: "chegada", processo: passo.chega, resultado: livre >= passo.chega.tamanho ? "fragmentacao" : "insuficiente", base: null, baseFirst });
      } else {
        eventos.push({ tipo: "chegada", processo: passo.chega, resultado: "alocado", base, baseFirst });
      }
    } else {
      const a = alocados.find((x) => x.nome === passo.termina);
      if (!a) return null;
      alocados = alocados.filter((x) => x !== a);
      let entra = null;
      let baseEntra = null;
      for (let k = 0; k < fila.length; k++) {
        const b = alocar2(fila[k]);
        if (b !== null) {
          if (entra) return null;
          entra = fila.splice(k, 1)[0];
          baseEntra = b;
          k--;
        }
      }
      eventos.push({ tipo: "termino", processo: passo.termina, liberado: { inicio: a.base, tamanho: a.tamanho }, entra, baseEntra });
    }
  }
  return { algoritmo, inicial, eventos, final: { alocados, ponteiro } };
}
function gerarEstadoInicial(rnd, minLacunas = 2) {
  for (; ; ) {
    const alocados = [];
    let cursor = SO_VAR;
    let n = 0;
    while (true) {
      const tamanho = multiplo(rnd, 20, 90, 10);
      if (cursor + tamanho > TOTAL_VAR - 20) break;
      alocados.push({ nome: `P${++n}`, tamanho, base: cursor });
      cursor += tamanho;
    }
    const restantes = alocados.filter(() => rnd() > 0.4);
    const lacunas3 = lacunasVar(restantes);
    if (restantes.length >= 2 && lacunas3.length >= minLacunas && lacunas3.length <= 5) {
      const ultimo = restantes.reduce((m, a) => Math.max(m, a.base + a.tamanho), SO_VAR);
      return { estado: { alocados: restantes, ponteiro: ultimo }, proximoNumero: n + 1 };
    }
  }
}
function gerarAlocacao(algoritmo, rnd = Math.random) {
  for (let tentativa = 0; tentativa < 2e3; tentativa++) {
    const { estado, proximoNumero } = gerarEstadoInicial(rnd, 3);
    let num = proximoNumero;
    const ativos = estado.alocados.map((a) => a.nome);
    const passos = [];
    const total = inteiro2(rnd, 5, 7);
    for (let e = 0; e < total; e++) {
      if (e > 0 && rnd() < 0.3 && ativos.length) {
        passos.push({ termina: ativos.splice(inteiro2(rnd, 0, ativos.length - 1), 1)[0] });
      } else {
        const nome = `P${num++}`;
        passos.push({ chega: { nome, tamanho: multiplo(rnd, 10, 120, 10) } });
        ativos.push(nome);
      }
    }
    const ex = resolverAlocacao(algoritmo, estado, passos);
    if (!ex) continue;
    const chegadas = ex.eventos.filter((e) => e.tipo === "chegada");
    const temExterna = chegadas.some((c) => c.resultado === "fragmentacao");
    const alocadas = chegadas.filter((c) => c.resultado === "alocado").length;
    const diferente = algoritmo === "FIRST" || chegadas.some((c) => c.resultado === "alocado" && c.base !== c.baseFirst);
    if (temExterna && alocadas >= 2 && diferente) return ex;
  }
  throw new Error("N\xE3o foi poss\xEDvel gerar o exerc\xEDcio de aloca\xE7\xE3o");
}
function gerarLacunas(rnd = Math.random) {
  const { estado } = gerarEstadoInicial(rnd, 2);
  return { alocados: estado.alocados, lacunas: lacunasVar(estado.alocados) };
}
function compactar(alocados) {
  let cursor = SO_VAR;
  const novasBases = {};
  [...alocados].sort((a, b) => a.base - b.base).forEach((a) => {
    novasBases[a.nome] = cursor;
    cursor += a.tamanho;
  });
  return { novasBases, lacunaFinal: { inicio: cursor, tamanho: TOTAL_VAR - cursor } };
}
function gerarCompactacao(rnd = Math.random) {
  const { estado } = gerarEstadoInicial(rnd, 3);
  return { alocados: estado.alocados, ...compactar(estado.alocados) };
}

// src/app/features/avaliacoes/questoes/particoes.ts
function tabelaProcessos(alocados) {
  return {
    titulo: "Processos na mem\xF3ria",
    cabecalho: ["Processo", "Base (KB)", "Tamanho (KB)"],
    linhas: [...alocados].sort((a, b) => a.base - b.base).map((a) => [a.nome, String(a.base), String(a.tamanho)])
  };
}
var AVISO_VAR = `Mem\xF3ria de ${TOTAL_VAR} KB. O SO ocupa de 0 a ${SO_VAR - 1} KB; a \xE1rea dos processos come\xE7a em ${SO_VAR} KB.`;
var NOME_POLITICA = {
  FIRST: "primeira parti\xE7\xE3o livre que comporta",
  BEST: "menor parti\xE7\xE3o livre que comporta"
};
function fixas(politica, rnd) {
  const ex = gerarFixas(politica, rnd);
  const m = new Montador();
  const inicios = iniciosParticoes(ex.particoes);
  const opcoesParticao = [
    ...ex.particoes.map((_, i) => ({ valor: String(i + 1), rotulo: `Parti\xE7\xE3o ${i + 1}` })),
    { valor: "fila", rotulo: "Fila" }
  ];
  const nomes = ex.eventos.filter((e) => e.tipo === "chegada").map((e) => e.processo.nome);
  const linhas = ex.eventos.map((e, i) => {
    if (e.tipo === "chegada") {
      return [
        String(i + 1),
        `${e.processo.nome} chega (${e.processo.tamanho} KB)`,
        m.campo(
          { id: `ev${i}-part`, tipo: "opcao", rotulo: `Parti\xE7\xE3o de ${e.processo.nome}`, opcoes: opcoesParticao },
          e.particao === null ? "fila" : e.particao
        ),
        m.campo({ id: `ev${i}-frag`, tipo: "numero", rotulo: `Fragmenta\xE7\xE3o interna de ${e.processo.nome}`, dica: "- se foi para a fila" }, e.frag)
      ];
    }
    return [
      String(i + 1),
      `${e.processo} termina`,
      m.campo({
        id: `ev${i}-entra`,
        tipo: "opcao",
        rotulo: `Quem sai da fila quando ${e.processo} termina`,
        opcoes: [{ valor: "ninguem", rotulo: "Ningu\xE9m" }, ...nomes.map((n) => ({ valor: n, rotulo: n }))]
      }, e.entra ? e.entra.nome : "ninguem"),
      m.campo({ id: `ev${i}-fragentra`, tipo: "numero", rotulo: `Fragmenta\xE7\xE3o interna de quem entra`, dica: "- se ningu\xE9m entra" }, e.fragEntra)
    ];
  });
  return {
    publica: {
      tipo: `fixas-${politica}`,
      titulo: `Parti\xE7\xF5es fixas \u2014 ${NOME_POLITICA[politica]}`,
      enunciado: `O SO ocupa de 0 a ${SO_FIXAS - 1} KB e as parti\xE7\xF5es ocupam os ${AREA_FIXAS} KB seguintes. Cada processo usa a ${NOME_POLITICA[politica]}; se nenhuma livre comportar, vai para a fila. Quando um processo termina, entra o primeiro da fila (ordem de chegada) que couber na parti\xE7\xE3o liberada. Informe a parti\xE7\xE3o de cada chegada, quem sai da fila em cada t\xE9rmino e a fragmenta\xE7\xE3o interna. Use "-" quando n\xE3o se aplica.`,
      dados: [{
        titulo: "Parti\xE7\xF5es",
        cabecalho: ["Parti\xE7\xE3o", "In\xEDcio (KB)", "Tamanho (KB)"],
        linhas: ex.particoes.map((t, i) => [String(i + 1), String(inicios[i]), String(t)])
      }],
      respostas: [
        { titulo: "Eventos", cabecalho: ["#", "Evento", "Parti\xE7\xE3o / quem entra", "Fragmenta\xE7\xE3o interna (KB)"], linhas },
        { cabecalho: ["Ao final", "Valor"], linhas: [[
          "Fragmenta\xE7\xE3o interna total (KB)",
          m.campo({ id: "frag-final", tipo: "numero", rotulo: "Fragmenta\xE7\xE3o interna total" }, ex.fragFinal)
        ]] }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var RESULTADOS = [
  { valor: "alocado", rotulo: "Alocado" },
  { valor: "fragmentacao", rotulo: "Fragmenta\xE7\xE3o externa" },
  { valor: "insuficiente", rotulo: "Mem\xF3ria insuficiente" }
];
function alocacao(alg, rnd) {
  const ex = gerarAlocacao(alg, rnd);
  const m = new Montador();
  const info = ALGORITMOS_FIT.find((a) => a.valor === alg);
  const nomes = ex.eventos.filter((e) => e.tipo === "chegada").map((e) => e.processo.nome);
  const linhas = ex.eventos.map((e, i) => {
    if (e.tipo === "chegada") {
      return [
        String(i + 1),
        `${e.processo.nome} chega (${e.processo.tamanho} KB)`,
        m.campo({ id: `ev${i}-res`, tipo: "opcao", rotulo: `Resultado de ${e.processo.nome}`, opcoes: RESULTADOS }, e.resultado),
        m.campo({ id: `ev${i}-base`, tipo: "numero", rotulo: `Endere\xE7o de ${e.processo.nome}`, dica: "- se n\xE3o foi alocado" }, e.base)
      ];
    }
    return [
      String(i + 1),
      `${e.processo} termina`,
      m.campo({
        id: `ev${i}-entra`,
        tipo: "opcao",
        rotulo: `Quem entra quando ${e.processo} termina`,
        opcoes: [{ valor: "ninguem", rotulo: "Ningu\xE9m entra" }, ...nomes.map((n) => ({ valor: n, rotulo: `${n} entra` }))]
      }, e.entra ? e.entra.nome : "ninguem"),
      m.campo({ id: `ev${i}-baseentra`, tipo: "numero", rotulo: "Endere\xE7o de quem entra", dica: "- se ningu\xE9m entra" }, e.baseEntra)
    ];
  });
  return {
    publica: {
      tipo: `var-${alg}`,
      titulo: `Parti\xE7\xF5es vari\xE1veis \u2014 ${info.nome}`,
      enunciado: `${AVISO_VAR} Aloque com ${info.nome} (${info.regra}; empate: menor endere\xE7o)` + (alg === "CIRCULAR" ? `. A busca come\xE7a em ${ex.inicial.ponteiro} KB (ap\xF3s a \xFAltima aloca\xE7\xE3o)` : "") + `. Sem lacuna que comporte, o processo vai para a fila e tenta de novo quando mem\xF3ria \xE9 liberada. Informe o resultado e o endere\xE7o inicial de cada evento. Use "-" quando n\xE3o se aplica.`,
      dados: [tabelaProcessos(ex.inicial.alocados)],
      respostas: [{ titulo: "Sequ\xEAncia de eventos", cabecalho: ["#", "Evento", "Resultado / quem entra", "Endere\xE7o inicial (KB)"], linhas }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var LINHAS_LACUNAS = 5;
function lacunas(rnd) {
  const ex = gerarLacunas(rnd);
  const m = new Montador();
  const linhas = Array.from({ length: LINHAS_LACUNAS }, (_, i) => {
    const l = ex.lacunas[i];
    return [
      String(i + 1),
      m.campo({ id: `lac${i}-inicio`, tipo: "numero", rotulo: `In\xEDcio da lacuna ${i + 1}`, dica: "- se sobrar" }, l ? l.inicio : null),
      m.campo({ id: `lac${i}-tamanho`, tipo: "numero", rotulo: `Tamanho da lacuna ${i + 1}`, dica: "- se sobrar" }, l ? l.tamanho : null)
    ];
  });
  return {
    publica: {
      tipo: "var-lacunas",
      titulo: "Parti\xE7\xF5es vari\xE1veis \u2014 tabela de lacunas",
      enunciado: `${AVISO_VAR} Preencha a tabela de lacunas (in\xEDcio e tamanho), em ordem de endere\xE7o. Lacunas vizinhas formam uma s\xF3. Preencha as linhas que sobrarem com "-".`,
      dados: [tabelaProcessos(ex.alocados)],
      respostas: [{ titulo: "Tabela de lacunas", cabecalho: ["#", "In\xEDcio (KB)", "Tamanho (KB)"], linhas }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function compactacao(rnd) {
  const ex = gerarCompactacao(rnd);
  const m = new Montador();
  const ordem = [...ex.alocados].sort((a, b) => a.base - b.base);
  return {
    publica: {
      tipo: "var-compactacao",
      titulo: "Parti\xE7\xF5es vari\xE1veis \u2014 compacta\xE7\xE3o",
      enunciado: `${AVISO_VAR} Fa\xE7a a compacta\xE7\xE3o: os processos v\xE3o para o in\xEDcio da \xE1rea dos processos, na ordem de endere\xE7o. Informe a nova base de cada processo e a lacuna que sobra.`,
      dados: [],
      respostas: [
        {
          titulo: "Novas bases",
          cabecalho: ["Processo", "Base atual (KB)", "Tamanho (KB)", "Nova base (KB)"],
          linhas: ordem.map((a) => [
            a.nome,
            String(a.base),
            String(a.tamanho),
            m.campo({ id: `base-${a.nome}`, tipo: "numero", rotulo: `Nova base de ${a.nome}` }, ex.novasBases[a.nome])
          ])
        },
        {
          titulo: "Lacuna depois da compacta\xE7\xE3o",
          cabecalho: ["In\xEDcio (KB)", "Tamanho (KB)"],
          linhas: [[
            m.campo({ id: "lacuna-inicio", tipo: "numero", rotulo: "In\xEDcio da lacuna final" }, ex.lacunaFinal.inicio),
            m.campo({ id: "lacuna-tamanho", tipo: "numero", rotulo: "Tamanho da lacuna final" }, ex.lacunaFinal.tamanho)
          ]]
        }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var QUESTOES_PARTICOES = [
  ...["FIRST", "BEST"].map((p) => ({
    id: `fixas-${p}`,
    assunto: "Parti\xE7\xF5es fixas",
    nome: `Aloca\xE7\xE3o: ${NOME_POLITICA[p]}`,
    gerar: (rnd) => fixas(p, rnd)
  })),
  ...ALGORITMOS_FIT.map((a) => ({
    id: `var-${a.valor}`,
    assunto: "Parti\xE7\xF5es vari\xE1veis",
    nome: `Aloca\xE7\xE3o: ${a.nome}`,
    gerar: (rnd) => alocacao(a.valor, rnd)
  })),
  { id: "var-lacunas", assunto: "Parti\xE7\xF5es vari\xE1veis", nome: "Tabela de lacunas", gerar: lacunas },
  { id: "var-compactacao", assunto: "Parti\xE7\xF5es vari\xE1veis", nome: "Compacta\xE7\xE3o", gerar: compactacao }
];

// src/app/features/paginacao/models/paginacao-simples.ts
var TAMANHO_PAGINA = 4;
var QUANTIDADE_QUADROS = 8;
var MAX_BYTES_PROCESSO = 16;
function binario(valor, bits) {
  return valor.toString(2).padStart(bits, "0");
}

// src/app/features/paginacao/models/exercicio-paginacao-simples.ts
var NOMES_EXERCICIO_SIMPLES = ["A", "B", "C"];
var QUANTIDADE_PERGUNTAS_TRADUCAO = 4;
var BITS_PAGINA = 2;
var BITS_QUADRO = 3;
var BITS_DESLOCAMENTO = 2;
function paginasNecessarias(bytes) {
  return Math.ceil(bytes / TAMANHO_PAGINA);
}
function fragmentacaoInterna(bytes) {
  return paginasNecessarias(bytes) * TAMANHO_PAGINA - bytes;
}
function enderecoLogico(pagina, deslocamento) {
  return binario(pagina, BITS_PAGINA) + binario(deslocamento, BITS_DESLOCAMENTO);
}
function enderecoFisico(quadro, deslocamento) {
  return binario(quadro, BITS_QUADRO) + binario(deslocamento, BITS_DESLOCAMENTO);
}
function gerarPaginacaoSimples(tipo, rnd = Math.random) {
  const embaralhar2 = (l) => embaralhar(rnd, l);
  let tamanhos;
  do {
    tamanhos = NOMES_EXERCICIO_SIMPLES.map(() => inteiro(rnd, 1, MAX_BYTES_PROCESSO));
  } while (tamanhos.reduce((t, b) => t + paginasNecessarias(b), 0) > QUANTIDADE_QUADROS || // o primeiro processo (exercício da tabela de páginas) tem pelo menos 2 páginas
  paginasNecessarias(tamanhos[0]) < 2 || // memória física: sobram pelo menos 2 quadros livres, para os quadros editáveis não entregarem a resposta
  tipo === "MEMORIA_FISICA" && tamanhos.reduce((t, b) => t + paginasNecessarias(b), 0) > QUANTIDADE_QUADROS - 2 || // pelo menos um processo com sobra, para trabalhar a fragmentação interna
  tamanhos.every((b) => fragmentacaoInterna(b) === 0));
  const livres = embaralhar2([...Array(QUANTIDADE_QUADROS).keys()]);
  const processos = NOMES_EXERCICIO_SIMPLES.map((nome, i) => ({ nome, bytes: tamanhos[i], cor: "", quadros: livres.splice(0, paginasNecessarias(tamanhos[i])) }));
  const candidatos = processos.map((p, i) => ({ p, i })).filter((x) => x.p.quadros.length >= 2);
  const alvoMemoria = embaralhar2(candidatos)[0].i;
  return { processos, alvoMemoria, perguntas: sortearPerguntas(processos, embaralhar2) };
}
function sortearPerguntas(processos, embaralhar2) {
  const candidatos = [];
  processos.forEach((p) => {
    for (let i = 0; i < p.bytes; i++) {
      candidatos.push({ processo: p, pagina: Math.floor(i / TAMANHO_PAGINA), deslocamento: i % TAMANHO_PAGINA });
    }
  });
  const escolhidas = [];
  for (const p of embaralhar2(processos)) {
    const doProcesso = embaralhar2(candidatos.filter((c) => c.processo === p));
    if (doProcesso.length) escolhidas.push(doProcesso[0]);
  }
  for (const c of embaralhar2(candidatos)) {
    if (escolhidas.length >= QUANTIDADE_PERGUNTAS_TRADUCAO) break;
    if (!escolhidas.some((e) => e.processo === c.processo && e.pagina === c.pagina)) escolhidas.push(c);
  }
  return escolhidas.slice(0, QUANTIDADE_PERGUNTAS_TRADUCAO);
}

// src/app/core/constantes.ts
var TAM = 8;
var TAM_HISTORICO_REF = 4;
var TIMESTAMP_INICIAL = 100;

// src/app/features/paginacao/models/historico-bits.ts
function valorHistoricoBits(historico) {
  return historico.reduce((acc, bit) => acc * 2 + (bit ? 1 : 0), 0);
}
function vitimaHistorico(paginas) {
  if (paginas.length === 0) return null;
  return [...paginas].sort((a, b) => valorHistoricoBits(a.historico) - valorHistoricoBits(b.historico) || (a.timestamp ?? 0) - (b.timestamp ?? 0))[0];
}
function bitsT1aT4(historico) {
  return [...historico].reverse();
}

// src/app/features/paginacao/models/exercicio-paginacao-demanda.ts
var NOMES_PROCESSOS2 = ["A", "B", "C", "D"];
var BITS_HISTORICO = TAM_HISTORICO_REF;
function nomePagina(p) {
  return `${p.processo}${p.indice}`;
}
function gerarPaginacaoDemanda(tipo, quantidade, rnd = Math.random) {
  const embaralhar2 = (l) => embaralhar(rnd, l);
  const nomes = NOMES_PROCESSOS2.slice(0, quantidade);
  let tamanhos;
  do {
    tamanhos = nomes.map(() => tipo === "VITIMA" ? inteiro(rnd, 2, 4) : inteiro(rnd, 1, 4));
  } while (tipo === "VITIMA" && tamanhos.reduce((a, b) => a + b, 0) <= TAM);
  const processos = nomes.map((nome, i) => ({
    nome,
    cor: "",
    paginas: Array.from({ length: tamanhos[i] }, (_, k) => ({ processo: nome, indice: k, cor: "", quadro: null, timestamp: null, bitRef: 0, historico: [] }))
  }));
  const todas = processos.flatMap((p) => p.paginas);
  const total = todas.length;
  let carregadas;
  if (tipo === "VITIMA") {
    carregadas = TAM;
  } else if (total === 1) {
    carregadas = 1;
  } else {
    const maximo = Math.min(TAM, total - 1);
    const minimo = Math.max(1, Math.min(maximo, Math.ceil(total / 2)));
    carregadas = inteiro(rnd, minimo, maximo);
  }
  const ordemCarga = embaralhar2(todas).slice(0, carregadas);
  const quadrosLivres = embaralhar2([...Array(TAM).keys()]);
  const quadros = Array(TAM).fill(null);
  ordemCarga.forEach((pagina, i) => {
    const quadro = quadrosLivres[i];
    pagina.quadro = quadro;
    pagina.timestamp = TIMESTAMP_INICIAL + i;
    pagina.bitRef = rnd() < 0.5 ? 0 : 1;
    pagina.historico = Array.from({ length: BITS_HISTORICO }, () => rnd() < 0.5 ? 0 : 1);
    quadros[quadro] = pagina;
  });
  const paginaSolicitada = tipo === "VITIMA" ? embaralhar2(todas.filter((p) => p.quadro === null))[0] ?? null : null;
  return { processos, quadros, paginaSolicitada };
}
function calcularVitimaPaginacao(quadros, algoritmo) {
  const fila = quadros.filter((q) => q !== null).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  if (fila.length === 0) return null;
  switch (algoritmo) {
    case "FIFO":
      return fila[0];
    case "HISTORICO":
      return vitimaHistorico(fila);
    case "SEGUNDA_CHANCE":
      return fila.find((p) => p.bitRef === 0) ?? fila[0];
  }
}

// src/app/features/paginacao/models/segunda-chance-sequencia.ts
var CASOS_OBRIGATORIOS = {
  SC: ["primeira", "meio", "ultima", "volta", "fifo"],
  SCM: ["pula", "segunda-volta", "todas-r1"]
};
var PREPARO = {
  SC: { caso: "fifo", via: "volta" }
};
var RAROS = { SC: ["fifo"], SCM: ["primeira", "fifo"] };
function copiarFila(fila) {
  return fila.map((p) => ({ ...p }));
}
function aplicarAcessos(fila, acessos) {
  const nova = copiarFila(fila);
  for (const a of acessos) {
    const p = nova.find((x) => x.nome === a.pagina);
    if (!p) continue;
    p.r = 1;
    if (a.escrita) p.m = 1;
  }
  return nova;
}
function substituir(fila, nova, momento, algoritmo) {
  if (fila.length === 0) throw new Error("Fila vazia");
  const original = copiarFila(fila);
  const q = copiarFila(fila);
  const passos = [];
  let t = momento;
  let vitima = null;
  const daSegundaChance = (volta) => {
    const p = q.shift();
    passos.push({ pagina: p.nome, volta, acao: "segunda-chance", r: p.r, m: p.m, novoMomento: t });
    p.r = 0;
    p.carga = t++;
    q.push(p);
  };
  if (algoritmo === "SC") {
    for (let i = 0; i <= original.length && !vitima; i++) {
      if (q[0].r === 0) {
        passos.push({ pagina: q[0].nome, volta: 1, acao: "vitima", r: 0, m: q[0].m });
        vitima = q.shift();
      } else {
        daSegundaChance(1);
      }
    }
  } else {
    for (let volta = 1; volta <= 4 && !vitima; volta++) {
      if (volta % 2 === 1) {
        const idx = q.findIndex((p) => p.r === 0 && p.m === 0);
        const limite = idx === -1 ? q.length : idx;
        for (let k = 0; k < limite; k++) passos.push({ pagina: q[k].nome, volta, acao: "pulada", r: q[k].r, m: q[k].m });
        if (idx !== -1) {
          passos.push({ pagina: q[idx].nome, volta, acao: "vitima", r: 0, m: 0 });
          vitima = q.splice(idx, 1)[0];
        }
      } else {
        const n = q.length;
        for (let k = 0; k < n && !vitima; k++) {
          const p = q[0];
          if (p.r === 0 && p.m === 1) {
            passos.push({ pagina: p.nome, volta, acao: "vitima", r: 0, m: 1 });
            vitima = q.shift();
          } else if (p.r === 1) {
            daSegundaChance(volta);
          } else {
            passos.push({ pagina: p.nome, volta, acao: "pulada", r: p.r, m: p.m });
            q.push(q.shift());
          }
        }
      }
    }
  }
  const v = vitima;
  const momentoNova = t;
  q.push({ nome: nova, carga: momentoNova, r: 0, m: 0 });
  return {
    vitima: v,
    posicaoVitima: original.findIndex((p) => p.nome === v.nome),
    passos,
    filaFinal: q,
    momentoNova,
    caso: classificar(original, v, algoritmo)
  };
}
function classificar(fila, vitima, algoritmo) {
  const pos = fila.findIndex((p) => p.nome === vitima.nome);
  if (algoritmo === "SC") {
    if (fila.every((p) => p.r === 0)) return "fifo";
    if (fila.every((p) => p.r === 1)) return "volta";
    if (pos === 0) return "primeira";
    if (pos === fila.length - 1) return "ultima";
    return "meio";
  }
  if (fila.every((p) => p.r === 0 && p.m === 0)) return "fifo";
  const tem00 = fila.some((p) => p.r === 0 && p.m === 0);
  if (tem00) return pos === 0 ? "primeira" : "pula";
  if (fila.some((p) => p.r === 0 && p.m === 1)) return "segunda-volta";
  return "todas-r1";
}
var LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function inteiro3(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function gerarFilaInicial(_algoritmo, rnd = Math.random) {
  const n = inteiro3(rnd, 6, 8);
  let momento = 0;
  return LETRAS.slice(0, n).map((nome, i) => {
    if (i > 0) momento += inteiro3(rnd, 1, 4);
    return { nome, carga: momento, r: 0, m: 0 };
  });
}
function proximoMomento(fila) {
  return Math.max(...fila.map((p) => p.carga)) + 1;
}
function escolherNova(fila, vitimasAnteriores, rnd = Math.random) {
  const naMemoria = new Set(fila.map((p) => p.nome));
  const voltam = vitimasAnteriores.filter((n) => !naMemoria.has(n));
  if (voltam.length && rnd() < 0.3) return voltam[inteiro3(rnd, 0, voltam.length - 1)];
  const livres = LETRAS.filter((l) => !naMemoria.has(l) && !vitimasAnteriores.includes(l));
  const fim = livres.slice(-10);
  const lista = fim.length ? fim : LETRAS.filter((l) => !naMemoria.has(l));
  return lista[inteiro3(rnd, 0, lista.length - 1)];
}
function gerarSituacao(fila, algoritmo, casosVistos, vitimasAnteriores, ultimoCaso, rnd = Math.random) {
  const inicio = proximoMomento(fila);
  const candidatos = [];
  const avaliar = (escolhas) => {
    const acessos2 = escolhas.map((e, i) => ({ ...e, momento: inicio + i }));
    const filaFalta2 = aplicarAcessos(fila, acessos2);
    const res = substituir(filaFalta2, "?", inicio + acessos2.length, algoritmo);
    candidatos.push({ acessos: escolhas, caso: res.caso });
  };
  avaliar([]);
  for (let k = 1; k <= fila.length; k++) {
    for (let rep = 0; rep < 4; rep++) {
      const escolhas = [];
      fila.forEach((p, i) => {
        const acessar = i < k ? p.r === 0 || rnd() < 0.25 : rnd() < 0.2;
        if (acessar) escolhas.push({ pagina: p.nome, escrita: algoritmo === "SCM" && rnd() < 0.35 });
      });
      avaliar(embaralharAcessos(escolhas, rnd));
    }
  }
  for (const prob of [0.15, 0.3, 0.5, 0.7]) {
    for (let rep = 0; rep < 6; rep++) {
      const escolhas = fila.filter(() => rnd() < prob).map((p) => ({ pagina: p.nome, escrita: algoritmo === "SCM" && rnd() < 0.35 }));
      avaliar(escolhas);
    }
  }
  if (algoritmo === "SCM") {
    for (let rep = 0; rep < 4; rep++) {
      const escolhas = fila.filter((p) => p.r === 0 && p.m === 0).map((p) => ({ pagina: p.nome, escrita: rnd() < 0.3 }));
      avaliar(embaralharAcessos(escolhas, rnd));
    }
  }
  const possiveis = Array.from(new Set(candidatos.map((c) => c.caso)));
  const faltando = CASOS_OBRIGATORIOS[algoritmo].filter((c) => !casosVistos.includes(c) && possiveis.includes(c));
  let alvo;
  const raro = casosVistos.length > 0 || rnd() < 0.5 ? RAROS[algoritmo].find((c) => !casosVistos.includes(c) && possiveis.includes(c)) : void 0;
  if (raro) {
    alvo = raro;
  } else if (faltando.length) {
    alvo = faltando[inteiro3(rnd, 0, faltando.length - 1)];
  } else {
    const preparo = PREPARO[algoritmo];
    const precisaPreparar = !!preparo && !casosVistos.includes(preparo.caso) && possiveis.includes(preparo.via);
    const variados = possiveis.filter((c) => c !== ultimoCaso);
    if (precisaPreparar) alvo = preparo.via;
    else alvo = (variados.length ? variados : possiveis)[inteiro3(rnd, 0, (variados.length ? variados : possiveis).length - 1)];
  }
  const doCaso = candidatos.filter((c) => c.caso === alvo);
  const curtos = doCaso.filter((c) => c.acessos.length <= 5);
  const lista = curtos.length ? curtos : doCaso;
  const escolhido = lista[inteiro3(rnd, 0, lista.length - 1)];
  const acessos = escolhido.acessos.map((e, i) => ({ ...e, momento: inicio + i }));
  const filaFalta = aplicarAcessos(fila, acessos);
  const momentoFalta = inicio + acessos.length;
  const nova = escolherNova(fila, vitimasAnteriores, rnd);
  return {
    filaInicial: copiarFila(fila),
    acessos,
    filaFalta,
    momentoFalta,
    nova,
    resultado: substituir(filaFalta, nova, momentoFalta, algoritmo)
  };
}
function embaralharAcessos(lista, rnd) {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

// src/app/features/avaliacoes/questoes/paginacao.ts
var MODELO_SIMPLES = `P\xE1ginas e quadros de ${TAMANHO_PAGINA} bytes; mem\xF3ria f\xEDsica de ${QUANTIDADE_QUADROS} quadros. Endere\xE7o l\xF3gico = p\xE1gina (2 bits) + deslocamento (2 bits); f\xEDsico = quadro (3 bits) + deslocamento (2 bits).`;
function tabelaPaginas(p) {
  return {
    titulo: `Tabela de p\xE1ginas de ${p.nome} (${p.bytes} bytes)`,
    cabecalho: ["P\xE1gina", "Quadro"],
    linhas: p.quadros.map((q, i) => [binario(i, 2), binario(q, BITS_QUADRO)])
  };
}
function memoriaSimples(processos) {
  const linhas = [];
  for (let q = 0; q < QUANTIDADE_QUADROS; q++) {
    const dono = processos.find((p) => p.quadros.includes(q));
    let conteudo = "livre";
    if (dono) {
      const pag = dono.quadros.indexOf(q);
      conteudo = Array.from({ length: TAMANHO_PAGINA }, (_, d) => {
        const i = pag * TAMANHO_PAGINA + d;
        return i < dono.bytes ? `${dono.nome}${i}` : "sobra";
      }).join(" ");
    }
    linhas.push([binario(q, BITS_QUADRO), conteudo]);
  }
  return { titulo: "Mem\xF3ria f\xEDsica", cabecalho: ["Quadro", "Bytes"], linhas };
}
function simplesTraducao(rnd) {
  const ex = gerarPaginacaoSimples("TRADUCAO", rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: "pag-traducao",
      titulo: "Pagina\xE7\xE3o simples \u2014 tradu\xE7\xE3o de endere\xE7os",
      enunciado: `${MODELO_SIMPLES} Use as tabelas de p\xE1ginas para traduzir cada endere\xE7o l\xF3gico em f\xEDsico (5 bits).`,
      dados: ex.processos.map(tabelaPaginas),
      respostas: [{
        titulo: "Endere\xE7os",
        cabecalho: ["Processo", "Endere\xE7o l\xF3gico", "Endere\xE7o f\xEDsico"],
        linhas: ex.perguntas.map((q, i) => [
          q.processo.nome,
          enderecoLogico(q.pagina, q.deslocamento),
          m.campo(
            { id: `trad${i}`, tipo: "binario", rotulo: `Endere\xE7o f\xEDsico ${i + 1}`, dica: "5 bits" },
            enderecoFisico(q.processo.quadros[q.pagina], q.deslocamento)
          )
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function simplesTabela(rnd) {
  const ex = gerarPaginacaoSimples("TABELA", rnd);
  const m = new Montador();
  const alvo = ex.processos[0];
  return {
    publica: {
      tipo: "pag-tabela",
      titulo: "Pagina\xE7\xE3o simples \u2014 tabela de p\xE1ginas",
      enunciado: `${MODELO_SIMPLES} Observe a mem\xF3ria f\xEDsica e complete a tabela de p\xE1ginas do processo ${alvo.nome} (${alvo.bytes} bytes). O n\xFAmero do byte \xE9 a posi\xE7\xE3o dele no processo, contando a partir de 0.`,
      dados: [memoriaSimples(ex.processos)],
      respostas: [{
        titulo: `Tabela de p\xE1ginas de ${alvo.nome}`,
        cabecalho: ["P\xE1gina", "Quadro (3 bits)"],
        linhas: alvo.quadros.map((q, i) => [
          binario(i, 2),
          m.campo({ id: `pag${i}`, tipo: "binario", rotulo: `Quadro da p\xE1gina ${i}`, dica: "3 bits" }, binario(q, BITS_QUADRO))
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function simplesCalculos(rnd) {
  const ex = gerarPaginacaoSimples("CALCULOS", rnd);
  const m = new Montador();
  const quadros = ex.processos.reduce((t, p) => t + p.quadros.length, 0);
  return {
    publica: {
      tipo: "pag-calculos",
      titulo: "Pagina\xE7\xE3o simples \u2014 p\xE1ginas e fragmenta\xE7\xE3o",
      enunciado: `${MODELO_SIMPLES} Calcule quantas p\xE1ginas cada processo ocupa, a fragmenta\xE7\xE3o interna de cada um, quantos quadros ficam ocupados e quantos bytes ficam livres na mem\xF3ria f\xEDsica.`,
      dados: [],
      respostas: [
        {
          titulo: "Processos",
          cabecalho: ["Processo", "Tamanho (bytes)", "P\xE1ginas", "Fragmenta\xE7\xE3o interna (bytes)"],
          linhas: ex.processos.map((p) => [
            p.nome,
            String(p.bytes),
            m.campo({ id: `${p.nome}-paginas`, tipo: "numero", rotulo: `P\xE1ginas de ${p.nome}` }, paginasNecessarias(p.bytes)),
            m.campo({ id: `${p.nome}-sobra`, tipo: "numero", rotulo: `Fragmenta\xE7\xE3o interna de ${p.nome}` }, fragmentacaoInterna(p.bytes))
          ])
        },
        {
          titulo: "Mem\xF3ria f\xEDsica",
          cabecalho: ["Quadros ocupados", "Bytes livres"],
          linhas: [[
            m.campo({ id: "quadros", tipo: "numero", rotulo: "Quadros ocupados" }, quadros),
            m.campo({ id: "livre", tipo: "numero", rotulo: "Bytes livres" }, (QUANTIDADE_QUADROS - quadros) * TAMANHO_PAGINA)
          ]]
        }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function memoriaDemanda(quadros, colunas) {
  const extra = colunas === "FIFO" ? ["Carga"] : colunas === "SEGUNDA_CHANCE" ? ["Carga", "Bit R"] : colunas === "HISTORICO" ? ["Carga", "T1", "T2", "T3", "T4"] : [];
  return {
    titulo: "Mem\xF3ria f\xEDsica",
    cabecalho: ["Quadro", "P\xE1gina", ...extra],
    linhas: quadros.map((p, q) => {
      if (!p) return [String(q), "livre", ...extra.map(() => "")];
      const cols = colunas === "FIFO" ? [String(p.timestamp)] : colunas === "SEGUNDA_CHANCE" ? [String(p.timestamp), String(p.bitRef)] : colunas === "HISTORICO" ? [String(p.timestamp), ...bitsT1aT4(p.historico).map(String)] : [];
      return [String(q), nomePagina(p), ...cols];
    })
  };
}
function demandaTabela(rnd) {
  const ex = gerarPaginacaoDemanda("LOGICA", 4, rnd);
  const m = new Montador();
  const opcoesQuadro = [{ valor: "-", rotulo: "-" }, ...Array.from({ length: TAM }, (_, q) => ({ valor: String(q), rotulo: String(q) }))];
  const opcoesBit = [{ valor: "V", rotulo: "V" }, { valor: "I", rotulo: "I" }];
  return {
    publica: {
      tipo: "dem-tabela",
      titulo: "Pagina\xE7\xE3o por demanda \u2014 tabela de p\xE1ginas",
      enunciado: `Mem\xF3ria f\xEDsica de ${TAM} quadros. Observe a mem\xF3ria f\xEDsica e complete a tabela de p\xE1ginas de cada processo: o quadro (ou "-" se a p\xE1gina est\xE1 s\xF3 no disco) e o bit V/I.`,
      dados: [memoriaDemanda(ex.quadros, "nenhuma")],
      respostas: ex.processos.map((p) => ({
        titulo: `Processo ${p.nome}`,
        cabecalho: ["P\xE1gina", "Quadro", "Bit V/I"],
        linhas: p.paginas.map((pg) => [
          String(pg.indice),
          m.campo(
            { id: `${nomePagina(pg)}-q`, tipo: "opcao", rotulo: `Quadro de ${nomePagina(pg)}`, opcoes: opcoesQuadro },
            pg.quadro === null ? "-" : pg.quadro
          ),
          m.campo(
            { id: `${nomePagina(pg)}-b`, tipo: "opcao", rotulo: `Bit de ${nomePagina(pg)}`, opcoes: opcoesBit },
            pg.quadro === null ? "I" : "V"
          )
        ])
      })),
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var NOME_VITIMA = {
  FIFO: "FIFO",
  HISTORICO: "Hist\xF3rico de bits de refer\xEAncia",
  SEGUNDA_CHANCE: "Segunda Chance"
};
var REGRA_VITIMA = {
  FIFO: "Sai a p\xE1gina carregada h\xE1 mais tempo (menor carga).",
  HISTORICO: "Compare a partir de T4 (o mais recente), depois T3, T2 e T1; persistindo o empate, sai a de menor carga.",
  SEGUNDA_CHANCE: "Percorra em ordem de carga: bit R = 1 ganha segunda chance (vira 0 e vai para o fim); a primeira com bit 0 sai."
};
function demandaVitima(alg, rnd) {
  const ex = gerarPaginacaoDemanda("VITIMA", 4, rnd);
  const m = new Montador();
  const vitima = calcularVitimaPaginacao(ex.quadros, alg);
  const carregadas = ex.quadros.filter((q) => q !== null);
  return {
    publica: {
      tipo: `dem-${alg}`,
      titulo: `Pagina\xE7\xE3o por demanda \u2014 p\xE1gina v\xEDtima (${NOME_VITIMA[alg]})`,
      enunciado: `A mem\xF3ria f\xEDsica est\xE1 cheia e ocorreu falta de p\xE1gina para ${nomePagina(ex.paginaSolicitada)}. Pelo algoritmo ${NOME_VITIMA[alg]}, qual p\xE1gina sai? ${REGRA_VITIMA[alg]}`,
      dados: [memoriaDemanda(ex.quadros, alg)],
      respostas: [{
        cabecalho: ["P\xE1gina v\xEDtima"],
        linhas: [[m.campo({
          id: "vitima",
          tipo: "opcao",
          rotulo: "P\xE1gina v\xEDtima",
          opcoes: carregadas.map((p) => ({ valor: nomePagina(p), rotulo: nomePagina(p) }))
        }, nomePagina(vitima))]]
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var SITUACOES_SC = 3;
var REGRA_SC = {
  SC: "Segunda Chance: percorra a fila a partir do in\xEDcio; com R = 1 a p\xE1gina ganha segunda chance (R vira 0, recebe o momento atual e vai para o fim); a primeira com R = 0 sai.",
  SCM: "Segunda Chance Melhorada, classes (R,M) na ordem (0,0) \u2192 (0,1) \u2192 (1,0) \u2192 (1,1): 1\xAA volta procura (0,0) sem alterar nada; 2\xAA volta procura (0,1), e quem tem R = 1 e \xE9 ultrapassada fica com R = 0, recebe o momento atual e vai para o fim (M \xE9 mantido); repita se preciso."
};
function tabelaFila(fila, alg, titulo) {
  return {
    titulo,
    cabecalho: ["Posi\xE7\xE3o", "P\xE1gina", "Carga", "R", ...alg === "SCM" ? ["M"] : []],
    linhas: fila.map((p, i) => [String(i + 1), p.nome, String(p.carga), String(p.r), ...alg === "SCM" ? [String(p.m)] : []])
  };
}
function segundaChanceSequencia(alg, rnd) {
  let fila = gerarFilaInicial(alg, rnd);
  const vistos = [];
  const vitimas = [];
  const situacoes2 = [];
  for (let i = 0; i < SITUACOES_SC; i++) {
    const s = gerarSituacao(fila, alg, vistos, vitimas, vistos[vistos.length - 1] ?? null, rnd);
    situacoes2.push(s);
    vistos.push(s.resultado.caso);
    vitimas.push(s.resultado.vitima.nome);
    fila = s.resultado.filaFinal;
  }
  const m = new Montador();
  const dados = situacoes2.map((s, i) => {
    const acessos = s.acessos.length ? s.acessos.map((a) => `t=${a.momento}: ${a.escrita ? "escrita em" : "leitura de"} ${a.pagina}`).join("; ") : "nenhum acesso";
    return tabelaFila(
      s.filaInicial,
      alg,
      `Situa\xE7\xE3o ${i + 1}. Acessos: ${acessos}. Em t=${s.momentoFalta}, falta de p\xE1gina para ${s.nova}.`
    );
  });
  return {
    publica: {
      tipo: `sc-${alg}`,
      titulo: `Pagina\xE7\xE3o por demanda \u2014 ${alg === "SC" ? "Segunda Chance" : "Segunda Chance Melhorada"} em sequ\xEAncia`,
      enunciado: `${REGRA_SC[alg]} Em cada situa\xE7\xE3o, aplique os acessos (leitura liga R${alg === "SCM" ? "; escrita liga R e M" : ""}) \xE0 fila mostrada e responda qual p\xE1gina sai e quantas p\xE1ginas ganham segunda chance (v\xE3o para o fim com R = 0).`,
      dados,
      respostas: [{
        titulo: "Respostas",
        cabecalho: ["Situa\xE7\xE3o", "P\xE1gina v\xEDtima", "Segundas chances"],
        linhas: situacoes2.map((s, i) => [
          String(i + 1),
          m.campo({
            id: `vit${i}`,
            tipo: "opcao",
            rotulo: `V\xEDtima da situa\xE7\xE3o ${i + 1}`,
            opcoes: s.filaInicial.map((p) => ({ valor: p.nome, rotulo: p.nome }))
          }, s.resultado.vitima.nome),
          m.campo(
            { id: `sc${i}`, tipo: "numero", rotulo: `Segundas chances na situa\xE7\xE3o ${i + 1}` },
            s.resultado.passos.filter((x) => x.acao === "segunda-chance").length
          )
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var QUESTOES_PAGINACAO = [
  { id: "pag-traducao", assunto: "Pagina\xE7\xE3o simples", nome: "Tradu\xE7\xE3o de endere\xE7os", gerar: simplesTraducao },
  { id: "pag-tabela", assunto: "Pagina\xE7\xE3o simples", nome: "Tabela de p\xE1ginas", gerar: simplesTabela },
  { id: "pag-calculos", assunto: "Pagina\xE7\xE3o simples", nome: "P\xE1ginas e fragmenta\xE7\xE3o interna", gerar: simplesCalculos },
  { id: "dem-tabela", assunto: "Pagina\xE7\xE3o por demanda", nome: "Tabela de p\xE1ginas (quadro e bit V/I)", gerar: demandaTabela },
  ...["FIFO", "HISTORICO", "SEGUNDA_CHANCE"].map((a) => ({
    id: `dem-${a}`,
    assunto: "Pagina\xE7\xE3o por demanda",
    nome: `P\xE1gina v\xEDtima: ${NOME_VITIMA[a]}`,
    gerar: (rnd) => demandaVitima(a, rnd)
  })),
  { id: "sc-SC", assunto: "Pagina\xE7\xE3o por demanda", nome: "Segunda Chance em sequ\xEAncia", gerar: (rnd) => segundaChanceSequencia("SC", rnd) },
  { id: "sc-SCM", assunto: "Pagina\xE7\xE3o por demanda", nome: "Segunda Chance Melhorada em sequ\xEAncia", gerar: (rnd) => segundaChanceSequencia("SCM", rnd) }
];

// src/app/features/segmentacao/models/segmentacao.ts
var TAMANHO_MEMORIA = 32;
var BITS_FISICO = 5;
var BITS_SEGMENTO = 2;
var BITS_DESLOCAMENTO2 = 4;
var SEGMENTOS = [
  { tipo: "C", numero: 0, nome: "C\xF3digo" },
  { tipo: "D", numero: 1, nome: "Dados" },
  { tipo: "P", numero: 2, nome: "Pilha" }
];
function binario2(valor, bits) {
  return valor.toString(2).padStart(bits, "0");
}
function nomeByte(tipo, deslocamento) {
  return `${tipo}${deslocamento}`;
}
function ocupacao(processos) {
  const mem = Array.from({ length: TAMANHO_MEMORIA }, (_, endereco) => ({
    endereco,
    processo: null,
    segmento: null,
    deslocamento: null,
    conteudo: null
  }));
  processos.forEach((p) => p.segmentos.forEach((s) => {
    for (let d = 0; d < s.tamanho; d++) {
      mem[s.base + d] = { endereco: s.base + d, processo: p, segmento: s, deslocamento: d, conteudo: nomeByte(s.tipo, d) };
    }
  }));
  return mem;
}
function lacunas2(ocupado) {
  const out = [];
  let inicio = -1;
  for (let i = 0; i <= ocupado.length; i++) {
    const livre = i < ocupado.length && !ocupado[i];
    if (livre && inicio < 0) inicio = i;
    if (!livre && inicio >= 0) {
      out.push({ inicio, tamanho: i - inicio });
      inicio = -1;
    }
  }
  return out;
}
function melhorLacuna(lista, tamanho) {
  return lista.filter((l) => l.tamanho >= tamanho).sort((a, b) => a.tamanho - b.tamanho || a.inicio - b.inicio)[0] ?? null;
}
var ORDEM_ALOCACAO = ["C", "D", "P"];
function alocar(processos, nome, cor, tamanhos) {
  const ocupado = ocupacao(processos).map((b) => b.processo !== null);
  const livreTotal = ocupado.filter((o) => !o).length;
  const necessario = tamanhos.C + tamanhos.D + tamanhos.P;
  const passos = [];
  const segmentos = [];
  for (const tipo of ORDEM_ALOCACAO) {
    const info = SEGMENTOS.find((s) => s.tipo === tipo);
    const lista = lacunas2(ocupado);
    const escolhida = melhorLacuna(lista, tamanhos[tipo]);
    passos.push({
      segmento: tipo,
      nome: info.nome,
      tamanho: tamanhos[tipo],
      lacunas: lista,
      escolhida,
      sobra: escolhida ? escolhida.tamanho - tamanhos[tipo] : 0
    });
    if (!escolhida) {
      return {
        ok: false,
        processo: null,
        passos,
        motivo: livreTotal >= necessario ? "fragmentacao" : "insuficiente",
        livreTotal,
        necessario
      };
    }
    for (let i = 0; i < tamanhos[tipo]; i++) ocupado[escolhida.inicio + i] = true;
    segmentos.push({ tipo, numero: info.numero, nome: info.nome, tamanho: tamanhos[tipo], base: escolhida.inicio });
  }
  segmentos.sort((a, b) => a.numero - b.numero);
  return { ok: true, processo: { nome, cor, segmentos }, passos, motivo: null, livreTotal, necessario };
}
function traduzir(p, numeroSegmento, deslocamento) {
  const s = p.segmentos.find((x) => x.numero === numeroSegmento);
  if (!s) {
    return { ok: false, fisico: null, erro: `Segmento ${binario2(numeroSegmento, BITS_SEGMENTO)} n\xE3o existe: interrup\xE7\xE3o de prote\xE7\xE3o.` };
  }
  if (deslocamento >= s.tamanho) {
    return {
      ok: false,
      fisico: null,
      erro: `Deslocamento ${deslocamento} \u2265 limite ${s.tamanho} do segmento ${binario2(s.numero, BITS_SEGMENTO)}: interrup\xE7\xE3o (endere\xE7o fora do segmento).`
    };
  }
  return { ok: true, fisico: s.base + deslocamento, erro: null };
}

// src/app/features/segmentacao/models/exercicio-segmentacao.ts
var NOMES_EX_SEG = ["A", "B", "C"];
var QTD_PERGUNTAS_TRADUCAO = 4;
function tamanhosAleatorios(rnd, max = 4) {
  return { C: inteiro(rnd, 1, max), D: inteiro(rnd, 1, max), P: inteiro(rnd, 1, max) };
}
function montarCenario(rnd, minLivre) {
  let processos = [];
  const ordem = ["A", "X", "B", "Y", "C"];
  for (const nome of ordem) {
    const temporario = nome === "X" || nome === "Y";
    const r = alocar(processos, nome, temporario ? "#000000" : "", tamanhosAleatorios(rnd, temporario ? 3 : 4));
    if (!r.ok) return null;
    processos = [...processos, r.processo];
  }
  processos = processos.filter((p) => NOMES_EX_SEG.includes(p.nome));
  const livre = ocupacao(processos).filter((b) => !b.processo).length;
  return livre >= minLivre ? processos : null;
}
function gerarSegmentacao(tipo, rnd = Math.random) {
  let processos = null;
  let novo = null;
  let gabarito = null;
  let querFragmentacao = rnd() < 0.3;
  for (let tentativa = 0; tentativa < 2e3; tentativa++) {
    if (tentativa === 1500) querFragmentacao = false;
    processos = montarCenario(rnd, tipo === "MEMORIA_FISICA" ? 6 : 3);
    if (!processos) continue;
    if (tipo !== "ALOCACAO") break;
    const tamanhos = tamanhosAleatorios(rnd, querFragmentacao ? 6 : 4);
    const r = alocar(processos, "D", "", tamanhos);
    const serve = querFragmentacao ? !r.ok && r.motivo === "fragmentacao" : r.ok;
    if (serve) {
      novo = { nome: "D", cor: "", tamanhos };
      gabarito = r;
      break;
    }
    processos = null;
  }
  if (!processos) throw new Error("N\xE3o foi poss\xEDvel gerar o exerc\xEDcio de segmenta\xE7\xE3o.");
  return {
    processos,
    alvo: tipo === "TABELA" ? 0 : inteiro(rnd, 0, processos.length - 1),
    perguntas: sortearPerguntas2(rnd, processos),
    novo,
    gabaritoAlocacao: gabarito
  };
}
function sortearPerguntas2(rnd, processos) {
  const embaralhar2 = (l) => embaralhar(rnd, l);
  const validas = [];
  processos.forEach((p2) => p2.segmentos.forEach((s2) => {
    for (let d = 0; d < s2.tamanho; d++) validas.push({ processo: p2, segmento: s2.numero, deslocamento: d });
  }));
  const escolhidas = [];
  for (const p2 of embaralhar2(processos)) {
    if (escolhidas.length >= QTD_PERGUNTAS_TRADUCAO - 1) break;
    const c = embaralhar2(validas.filter((v) => v.processo === p2))[0];
    if (c) escolhidas.push(c);
  }
  const p = embaralhar2(processos)[0];
  const s = embaralhar2(p.segmentos)[0];
  escolhidas.push({ processo: p, segmento: s.numero, deslocamento: inteiro(rnd, s.tamanho, Math.min(15, s.tamanho + 3)) });
  return embaralhar2(escolhidas);
}

// src/app/features/avaliacoes/questoes/segmentacao.ts
var MODELO = `Mem\xF3ria f\xEDsica de ${TAMANHO_MEMORIA} bytes (endere\xE7o f\xEDsico de ${BITS_FISICO} bits). Endere\xE7o l\xF3gico = segmento (${BITS_SEGMENTO} bits: 00 c\xF3digo, 01 dados, 10 pilha) + deslocamento (${BITS_DESLOCAMENTO2} bits).`;
function tabelaSegmentos(p) {
  return {
    titulo: `Tabela de segmentos de ${p.nome}`,
    cabecalho: ["Segmento", "Base", "Limite"],
    linhas: p.segmentos.map((s) => [
      `${binario2(s.numero, BITS_SEGMENTO)} \xB7 ${s.nome}`,
      `${binario2(s.base, BITS_FISICO)} (${s.base})`,
      String(s.tamanho)
    ])
  };
}
function memoriaFisica(processos) {
  const mem = ocupacao(processos);
  const linhas = [];
  for (let i = 0; i < TAMANHO_MEMORIA; i += 8) {
    linhas.push([`${i}\u2013${i + 7}`, ...mem.slice(i, i + 8).map((b) => b.processo ? `${b.processo.nome}:${b.conteudo}` : "\xB7")]);
  }
  return {
    titulo: "Mem\xF3ria f\xEDsica (A:C0 = byte 0 do c\xF3digo de A; \xB7 = livre)",
    cabecalho: ["Endere\xE7os", "+0", "+1", "+2", "+3", "+4", "+5", "+6", "+7"],
    linhas
  };
}
function traducao(rnd) {
  const ex = gerarSegmentacao("TRADUCAO", rnd);
  const m = new Montador();
  return {
    publica: {
      tipo: "seg-traducao",
      titulo: "Segmenta\xE7\xE3o \u2014 tradu\xE7\xE3o de endere\xE7os",
      enunciado: `${MODELO} Traduza cada endere\xE7o l\xF3gico em f\xEDsico (${BITS_FISICO} bits). Se o deslocamento n\xE3o for menor que o limite (ou o segmento n\xE3o existir), responda "erro": ocorre uma interrup\xE7\xE3o.`,
      dados: ex.processos.map(tabelaSegmentos),
      respostas: [{
        titulo: "Endere\xE7os",
        cabecalho: ["Processo", "Endere\xE7o l\xF3gico (seg \xB7 desloc.)", 'Endere\xE7o f\xEDsico ou "erro"'],
        linhas: ex.perguntas.map((q, i) => {
          const r = traduzir(q.processo, q.segmento, q.deslocamento);
          return [
            q.processo.nome,
            `${binario2(q.segmento, BITS_SEGMENTO)} ${binario2(q.deslocamento, BITS_DESLOCAMENTO2)}`,
            m.campo(
              { id: `trad${i}`, tipo: "texto", rotulo: `Endere\xE7o f\xEDsico ${i + 1}`, dica: "5 bits ou erro" },
              r.ok ? binario2(r.fisico, BITS_FISICO) : "ERRO"
            )
          ];
        })
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function tabela(rnd) {
  const ex = gerarSegmentacao("TABELA", rnd);
  const m = new Montador();
  const alvo = ex.processos[0];
  return {
    publica: {
      tipo: "seg-tabela",
      titulo: "Segmenta\xE7\xE3o \u2014 tabela de segmentos",
      enunciado: `${MODELO} Observe a mem\xF3ria f\xEDsica e complete a base (${BITS_FISICO} bits) e o limite de cada segmento do processo ${alvo.nome}.`,
      dados: [memoriaFisica(ex.processos)],
      respostas: [{
        titulo: `Tabela de segmentos de ${alvo.nome}`,
        cabecalho: ["Segmento", "Base (5 bits)", "Limite"],
        linhas: ["C", "D", "P"].map((t) => {
          const s = alvo.segmentos.find((x) => x.tipo === t);
          return [
            `${binario2(s.numero, BITS_SEGMENTO)} \xB7 ${s.nome}`,
            m.campo({ id: `${t}-base`, tipo: "binario", rotulo: `Base de ${s.nome}`, dica: "5 bits" }, binario2(s.base, BITS_FISICO)),
            m.campo({ id: `${t}-limite`, tipo: "numero", rotulo: `Limite de ${s.nome}` }, s.tamanho)
          ];
        })
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function alocacao2(rnd) {
  const ex = gerarSegmentacao("ALOCACAO", rnd);
  const m = new Montador();
  const novo = ex.novo;
  const g = ex.gabaritoAlocacao;
  return {
    publica: {
      tipo: "seg-alocacao",
      titulo: "Segmenta\xE7\xE3o \u2014 aloca\xE7\xE3o best-fit",
      enunciado: `${MODELO} O processo ${novo.nome} vai ser criado com c\xF3digo de ${novo.tamanhos.C}, dados de ${novo.tamanhos.D} e pilha de ${novo.tamanhos.P} bytes. Aloque segmento a segmento por best-fit, na ordem c\xF3digo \u2192 dados \u2192 pilha (menor lacuna que comporta; empate: menor endere\xE7o). \xC9 tudo ou nada: se um segmento n\xE3o couber, o processo n\xE3o \xE9 criado. Diga se o processo \xE9 criado e a base de cada segmento ("-" se n\xE3o for criado).`,
      dados: [memoriaFisica(ex.processos)],
      respostas: [
        {
          cabecalho: ["O processo \xE9 criado?"],
          linhas: [[m.campo({
            id: "cabe",
            tipo: "opcao",
            rotulo: "O processo \xE9 criado?",
            opcoes: [
              { valor: "sim", rotulo: "Sim" },
              { valor: "fragmentacao", rotulo: "N\xE3o: fragmenta\xE7\xE3o externa" },
              { valor: "insuficiente", rotulo: "N\xE3o: mem\xF3ria insuficiente" }
            ]
          }, g.ok ? "sim" : g.motivo)]]
        },
        {
          titulo: `Tabela de segmentos de ${novo.nome}`,
          cabecalho: ["Segmento", "Limite", "Base (5 bits)"],
          linhas: SEGMENTOS.map((info) => {
            const base = g.processo?.segmentos.find((s) => s.tipo === info.tipo)?.base;
            return [
              `${binario2(info.numero, BITS_SEGMENTO)} \xB7 ${info.nome}`,
              String(novo.tamanhos[info.tipo]),
              m.campo(
                { id: `${info.tipo}-base`, tipo: "binario", rotulo: `Base de ${info.nome}`, dica: "5 bits ou -" },
                base === void 0 ? null : binario2(base, BITS_FISICO)
              )
            ];
          })
        }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var QUESTOES_SEGMENTACAO = [
  { id: "seg-traducao", assunto: "Segmenta\xE7\xE3o", nome: "Tradu\xE7\xE3o de endere\xE7os", gerar: traducao },
  { id: "seg-tabela", assunto: "Segmenta\xE7\xE3o", nome: "Tabela de segmentos", gerar: tabela },
  { id: "seg-alocacao", assunto: "Segmenta\xE7\xE3o", nome: "Aloca\xE7\xE3o best-fit", gerar: alocacao2 }
];

// src/app/features/avaliacoes/questoes/catalogo.ts
var CATALOGO = [
  ...QUESTOES_PROCESSOS,
  ...QUESTOES_ESCALONAMENTO,
  ...QUESTOES_PARTICOES,
  ...QUESTOES_PAGINACAO,
  ...QUESTOES_SEGMENTACAO
];
var MAX_QUESTOES = 20;
function tipoQuestao(id) {
  return CATALOGO.find((t) => t.id === id);
}
function validarModelo(modelo) {
  if (!Array.isArray(modelo) || modelo.length < 1 || modelo.length > MAX_QUESTOES) {
    throw new Error(`A prova deve ter de 1 a ${MAX_QUESTOES} quest\xF5es.`);
  }
  return modelo.map((item) => {
    const tipo = item?.tipo;
    if (typeof tipo !== "string" || !tipoQuestao(tipo)) throw new Error(`Tipo de quest\xE3o desconhecido: ${String(tipo)}`);
    return { tipo };
  });
}
function gerarProva(modelo, semente) {
  return modelo.map((item, i) => tipoQuestao(item.tipo).gerar(criarAleatorio(`${semente}:${i}`)));
}
export {
  corrigirProva,
  gerarProva,
  validarModelo
};
