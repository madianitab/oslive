import { criarAleatorio, embaralhar, escolher, hashTexto, inteiro } from './aleatorio';

describe('aleatorio com semente', () => {
  it('a mesma semente gera a mesma sequência', () => {
    const a = criarAleatorio('prova-1:aluno@x.com');
    const b = criarAleatorio('prova-1:aluno@x.com');
    const sa = Array.from({ length: 20 }, () => a());
    const sb = Array.from({ length: 20 }, () => b());
    expect(sa).toEqual(sb);
  });

  it('sementes diferentes geram sequências diferentes', () => {
    const a = criarAleatorio(1);
    const b = criarAleatorio(2);
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()));
  });

  it('valores em [0, 1) e inteiros dentro do intervalo', () => {
    const r = criarAleatorio(42);
    for (let i = 0; i < 2000; i++) {
      const x = r();
      expect(x >= 0 && x < 1).toBeTrue();
      const n = inteiro(r, 3, 7);
      expect(n >= 3 && n <= 7 && Number.isInteger(n)).toBeTrue();
    }
  });

  it('escolher e embaralhar usam só itens da lista', () => {
    const r = criarAleatorio(7);
    const lista = ['A', 'B', 'C', 'D'];
    expect(lista).toContain(escolher(r, lista));
    expect(embaralhar(r, lista).sort()).toEqual(lista);
  });

  it('hashTexto é estável', () => {
    expect(hashTexto('oslive')).toBe(hashTexto('oslive'));
    expect(hashTexto('a')).not.toBe(hashTexto('b'));
  });
});
