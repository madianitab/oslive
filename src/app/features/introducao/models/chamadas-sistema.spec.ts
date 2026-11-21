import { CAMADA_DO_BLOCO, CENARIOS, TIPOS_CHAMADAS, bitDeModo, montarPassos } from './chamadas-sistema';

describe('O que é um SO: chamadas de sistema', () => {
  it('todo cenário começa no programa, em modo usuário', () => {
    CENARIOS.forEach(c => {
      expect(c.passos[0].bloco).withContext(c.id).toBe('aplicacao');
      expect(c.passos[0].modo).withContext(c.id).toBe('USUARIO');
    });
  });

  it('o modo só muda com trap, exceção, interrupção de hardware ou retorno', () => {
    CENARIOS.forEach(c => c.passos.forEach((p, i) => {
      const antes = i === 0 ? 'USUARIO' : c.passos[i - 1].modo;
      if (p.modo !== antes) expect(p.evento).withContext(`${c.id} passo ${i}`).not.toBeNull();
      if (p.evento === 'TRAP' || p.evento === 'EXCECAO' || p.evento === 'INT_HW') expect(p.modo).withContext(`${c.id} passo ${i}`).toBe('KERNEL');
      if (p.evento === 'RETORNO') expect(p.modo).withContext(`${c.id} passo ${i}`).toBe('USUARIO');
    }));
  });

  it('o SO só executa em modo kernel e programas e biblioteca só em modo usuário', () => {
    CENARIOS.forEach(c => c.passos.forEach((p, i) => {
      const camada = CAMADA_DO_BLOCO[p.bloco];
      if (camada === 'SO') expect(p.modo).withContext(`${c.id} passo ${i}`).toBe('KERNEL');
      if (camada === 'PROGRAMAS' || camada === 'BIBLIOTECA') expect(p.modo).withContext(`${c.id} passo ${i}`).toBe('USUARIO');
    }));
  });

  it('chamadas de sistema passam pela biblioteca, pelo trap e pela tabela de chamadas', () => {
    CENARIOS.filter(c => c.chamada).forEach(c => {
      const blocos = c.passos.map(p => p.bloco);
      const iBib = blocos.indexOf('biblioteca');
      const iTrap = c.passos.findIndex(p => p.evento === 'TRAP');
      const iTab = blocos.indexOf('tratador');
      expect(iBib).withContext(c.id).toBeGreaterThan(0);
      expect(iTrap).withContext(c.id).toBeGreaterThan(iBib);
      expect(iTab).withContext(c.id).toBeGreaterThan(iTrap);
      expect(c.passos[iBib].regs.rax).withContext(c.id).toContain(String(c.chamada!.numero));
      expect(c.passos[c.passos.length - 1].modo).withContext(c.id).toBe('USUARIO');
      expect(c.passos.some(p => p.evento === 'RETORNO')).withContext(c.id).toBeTrue();
    });
  });

  it('valores de retorno conferem com o material', () => {
    const ret = (id: string) => {
      const c = CENARIOS.find(x => x.id === id)!;
      return c.passos.find(p => p.evento === 'RETORNO')!.regs.rax;
    };
    expect(ret('write')).toBe('3');
    expect(ret('read')).toBe('3');
    expect(ret('getpid')).toBe('1877');
    expect(ret('fork')).toBe('1878');
    expect(ret('open-erro')).toContain('ENOENT');
  });

  it('a leitura do teclado bloqueia o processo e termina com interrupção de hardware', () => {
    const c = CENARIOS.find(x => x.id === 'read')!;
    const iBloq = c.passos.findIndex(p => p.estado === 'Bloqueado');
    const iInt = c.passos.findIndex(p => p.evento === 'INT_HW');
    expect(iBloq).toBeGreaterThan(0);
    expect(iInt).toBeGreaterThan(iBloq);
    expect(c.passos[iInt].bloco).toBe('controladores');
    expect(c.passos[c.passos.length - 1].estado).toBe('Executando');
  });

  it('instrução privilegiada em modo usuário gera exceção e o processo é destruído', () => {
    const c = CENARIOS.find(x => x.id === 'privilegiada')!;
    expect(c.chamada).toBeNull();
    expect(c.passos[1].evento).toBe('EXCECAO');
    expect(c.passos[c.passos.length - 1].estado).toBe('Destruição');
    expect(c.passos.slice(2).some(p => p.bloco === 'aplicacao')).toBeFalse();
  });

  it('montarPassos repete o que não mudou', () => {
    const p = montarPassos([
      { titulo: 'a', texto: '', bloco: 'aplicacao', modo: 'USUARIO', regs: { rax: '1' } },
      { titulo: 'b', texto: '', bloco: 'cpu', modo: 'KERNEL', evento: 'TRAP', tela: 'x' },
      { titulo: 'c', texto: '', bloco: 'tratador', modo: 'KERNEL', linha: 4 },
    ], 2);
    expect(p[1].regs.rax).toBe('1');
    expect(p[2].tela).toBe('x');
    expect(p[1].linha).toBe(2);
    expect(p[2].linha).toBe(4);
    expect(p[0].evento).toBeNull();
  });

  it('bit de modo: kernel = 0, usuário = 1 (Silberschatz)', () => {
    expect(bitDeModo('KERNEL')).toBe(0);
    expect(bitDeModo('USUARIO')).toBe(1);
  });

  it('a chamada de cada cenário aparece na tabela de tipos', () => {
    CENARIOS.filter(c => c.chamada).forEach(c => {
      const linha = TIPOS_CHAMADAS.find(t => t.tipo === c.chamada!.tipo)!;
      expect(linha.pares.some(([u, w]) => u === c.chamada!.unix && w === c.chamada!.windows)).withContext(c.id).toBeTrue();
    });
  });
});
