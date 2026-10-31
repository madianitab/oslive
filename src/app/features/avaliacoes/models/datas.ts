/**
 * Datas das avaliações sempre no horário de Brasília, qualquer que seja o fuso
 * do computador. O Brasil não tem horário de verão desde 2019: o deslocamento é -03:00.
 */
export const FUSO = 'America/Sao_Paulo';
const DESLOCAMENTO = '-03:00';

/** Valor de <input type="datetime-local"> (AAAA-MM-DDTHH:mm, em Brasília) → ISO com fuso. */
export function deCampoData(valor: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) throw new Error('Data inválida.');
  return `${valor}:00${DESLOCAMENTO}`;
}

/** ISO → valor para <input type="datetime-local">, em Brasília. */
export function paraCampoData(iso: string | Date): string {
  const p = partes(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** "31/10/2026 19:30" em Brasília. */
export function dataHora(iso: string | Date): string {
  const p = partes(new Date(iso));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

interface Partes { year: string; month: string; day: string; hour: string; minute: string; }

function partes(d: Date): Partes {
  const r: Partes = { year: '', month: '', day: '', hour: '', minute: '' };
  new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).forEach(x => { if (x.type in r) r[x.type as keyof Partes] = x.value; });
  return r;
}

/** "mm:ss" ou "h:mm:ss" para o relógio da prova. */
export function tempoRestante(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
