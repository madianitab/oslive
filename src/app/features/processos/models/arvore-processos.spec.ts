import { LIMITE_PROCESSOS, PID_INICIAL, PID_INIT, Resultado, simular } from './arvore-processos';
import { EXEMPLOS_FORK } from './exemplos-fork';

const exemplo = (id: string) => EXEMPLOS_FORK.find(e => e.id === id)!.codigo;
const textos = (r: Resultado) => r.saida.map(s => s.texto);
const filhosDe = (r: Resultado) => {
  const m: Record<number, number[]> = {};
  r.processos.forEach(p => (m[p.ppidOrig] ??= []).push(p.pid));
  return m;
};

describe('árvore de processos (fork)', () => {
  it('todos os exemplos executam sem erro e todos os processos terminam', () => {
    for (const ordem of ['pai', 'filho', 'aleatoria'] as const) {
      EXEMPLOS_FORK.forEach(ex => {
        const r = simular(ex.codigo, { ordem, semente: 7 });
        expect(r.erro).withContext(`${ex.id}/${ordem}`).toBeNull();
        const ultima = r.fotos[r.fotos.length - 1];
        r.processos.forEach(p => expect(ultima.procs[p.pid].estado).withContext(`${ex.id}/${ordem}/${p.pid}`).toBe('terminado'));
        // no máximo um processo executando em cada momento
        r.fotos.forEach(f => expect(Object.values(f.procs).filter(s => s.estado === 'executando').length).toBeLessThanOrEqual(1));
      });
    }
  });

  it('pai com dois filhos: 3 processos e 4 linhas de cada um', () => {
    const r = simular(exemplo('dois-filhos'));
    expect(r.processos.length).toBe(3);
    expect(filhosDe(r)[PID_INICIAL]).toEqual([101, 102]);
    expect(textos(r).slice(0, 4)).toEqual(['Pai - i: 0', 'Pai - i: 1', 'Pai - i: 2', 'Pai - i: 3']);
    expect(textos(r).filter(t => t.startsWith('Filho 1')).length).toBe(4);
    expect(textos(r).filter(t => t.startsWith('Filho 2')).length).toBe(4);
  });

  it('com o filho primeiro, a saída começa pelo filho', () => {
    const r = simular(exemplo('dois-filhos'), { ordem: 'filho' });
    expect(textos(r)[0]).toBe('Filho 1 - i: 0');
    expect(r.processos.length).toBe(3);
  });

  it('quatro fork() com if: 10 processos com a mesma árvore em qualquer ordem', () => {
    const forma = (r: Resultado) => {
      const m = filhosDe(r);
      const grau = (pid: number): string => `(${(m[pid] ?? []).map(grau).sort().join('')})`;
      return grau(PID_INICIAL);
    };
    const base = simular(exemplo('quatro-forks'));
    expect(base.processos.length).toBe(10);
    expect(filhosDe(base)[PID_INICIAL].length).toBe(4);
    for (let s = 1; s <= 20; s++) {
      const r = simular(exemplo('quatro-forks'), { ordem: 'aleatoria', semente: s });
      expect(forma(r)).toBe(forma(base));
      expect(r.saida.length).toBe(40);
    }
  });

  it('fork() em laço de 3 voltas cria 8 processos', () => {
    const r = simular(exemplo('laco'));
    expect(r.processos.length).toBe(8);
    expect(r.saida.length).toBe(8);
    expect(textos(r)).toContain(`PID ${PID_INICIAL}, pai 99`);
  });

  it('wait(&status) bloqueia o pai e devolve o status de exit', () => {
    const r = simular(exemplo('wait'));
    expect(textos(r)).toEqual(['Filho 101 trabalhando', 'Pai: o filho 101 terminou com 7']);
    expect(r.fotos.some(f => f.procs[PID_INICIAL].estado === 'bloqueado')).toBeTrue();
  });

  it('waitpid espera o filho indicado e sleep avança o tempo', () => {
    const r = simular(exemplo('waitpid-sleep'));
    expect(textos(r)).toEqual(['Filho 2 acordou', 'Filho 1 acordou', 'Pai: filho 1 terminou', 'Pai: filho 2 terminou']);
    expect(r.tempoFinal).toBe(3);
  });

  it('órfão é adotado pelo init e getppid() passa a retornar 1', () => {
    const r = simular(exemplo('orfao'));
    expect(textos(r)).toContain(`Filho: meu pai é ${PID_INICIAL}`);
    expect(textos(r)).toContain(`Filho: agora meu pai é ${PID_INIT}`);
    expect(r.orfaos).toBe(1);
  });

  it('filho que termina antes do wait do pai vira zumbi', () => {
    const r = simular(exemplo('zumbi'));
    expect(r.fotos.some(f => f.procs[101]?.estado === 'zumbi')).toBeTrue();
    expect(r.fotos[r.fotos.length - 1].procs[101].estado).toBe('terminado');
  });

  it('cada processo tem sua cópia das variáveis', () => {
    expect(textos(simular(exemplo('memoria')))).toEqual(['Filho: x = 15', 'Pai: x = 10']);
  });

  it('wait sem filhos retorna -1 e WNOHANG não bloqueia', () => {
    const r = simular(`int main() { int p = fork(); if (p == 0) { sleep(1); return 0; }
      printf("%d\\n", waitpid(p, NULL, WNOHANG)); wait(NULL); printf("%d\\n", wait(NULL)); }`);
    expect(textos(r)).toEqual(['0', '-1']);
  });

  it('vetores, #define e funções', () => {
    const r = simular(`#define N 3
      int criar(int i) { int p = fork(); if (p == 0) exit(i + 1); return p; }
      int main() { int pids[N], st;
        for (int i = 0; i < N; i++) pids[i] = criar(i);
        for (int i = N - 1; i >= 0; i--) { waitpid(pids[i], &st, 0); printf("%d ", WEXITSTATUS(st)); }
      }`);
    expect(r.erro).toBeNull();
    expect(textos(r)).toEqual(['3 ', '2 ', '1 ']);
  });

  it('avisa quando uma variável é usada sem valor inicial', () => {
    const r = simular(`int main() { int a; if (fork() == 0) printf("%d", a); }`);
    expect(r.avisos.length).toBe(1);
    expect(r.avisos[0].linha).toBe(1);
  });

  it(`limita a ${LIMITE_PROCESSOS} processos: o fork() seguinte retorna -1`, () => {
    const r = simular(`int main() { for (int i = 0; i < 10; i++) fork(); }`);
    expect(r.erro).toBeNull();
    expect(r.processos.length).toBe(LIMITE_PROCESSOS);
    expect(r.avisos.some(a => a.texto.includes('Limite'))).toBeTrue();
  });

  it('erros de compilação informam a linha', () => {
    const r = simular(`int main() {\n  int x = 1\n  fork();\n}`);
    expect(r.erro?.linha).toBe(3);
    expect(simular(`int main() { sched_yield(); }`).erro?.texto).toContain('não é suportada');
    expect(simular(`int main() { while (1) ; }`).erro?.texto).toContain('laço infinito');
  });

  it('a mesma semente repete a mesma execução aleatória', () => {
    const a = simular(exemplo('dois-filhos'), { ordem: 'aleatoria', semente: 42 });
    const b = simular(exemplo('dois-filhos'), { ordem: 'aleatoria', semente: 42 });
    expect(textos(a)).toEqual(textos(b));
  });
});
