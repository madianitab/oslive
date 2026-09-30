import { CPU } from 'src/app/features/escalonamento/models/cpu';
import { Processo } from 'src/app/features/escalonamento/models/processo';

describe('CPU', () => {
  let cpu: CPU;

  beforeEach(() => {
    cpu = new CPU();
  });

  it('deve iniciar livre', () => {
    expect(cpu.ocupado).toBeFalse();
    expect(cpu.processo).toBeNull();
  });

  it('alocaProcesso deve ocupar a CPU', () => {
    const p = new Processo('P1', 0, 3, null, '#fff');
    expect(cpu.alocaProcesso(p)).toBeTrue();
    expect(cpu.ocupado).toBeTrue();
    expect(cpu.processo).toBe(p);
  });

  it('alocaProcesso com undefined deve retornar false e deixar CPU livre', () => {
    expect(cpu.alocaProcesso(undefined)).toBeFalse();
    expect(cpu.ocupado).toBeFalse();
  });

  it('retiraProcesso deve liberar a CPU e retornar o processo', () => {
    const p = new Processo('P1', 0, 3, null, '#fff');
    cpu.alocaProcesso(p);
    const retirado = cpu.retiraProcesso();
    expect(retirado).toBe(p);
    expect(cpu.ocupado).toBeFalse();
    expect(cpu.processo).toBeNull();
  });

  it('act em CPU livre deve retornar null', () => {
    expect(cpu.act()).toBeNull();
  });

  it('act deve retornar null enquanto processo nao terminou', () => {
    const p = new Processo('P1', 0, 3, null, '#fff');
    cpu.alocaProcesso(p);
    expect(cpu.act()).toBeNull();
    expect(cpu.act()).toBeNull();
    expect(cpu.ocupado).toBeTrue();
  });

  it('act deve retornar processo e liberar CPU quando terminar', () => {
    const p = new Processo('P1', 0, 2, null, '#fff');
    cpu.alocaProcesso(p);
    cpu.act();
    const finalizado = cpu.act();
    expect(finalizado).toBe(p);
    expect(cpu.ocupado).toBeFalse();
    expect(cpu.processo).toBeNull();
  });
});
