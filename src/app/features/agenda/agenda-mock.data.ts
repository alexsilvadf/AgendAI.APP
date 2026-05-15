import type { DaySchedule, Professional } from './agenda.types';

/** Horários de exemplo (30 min) — substituir por API real */
const hours = (): { start: string; end: string }[] => {
  const blocks: { start: string; end: string }[] = [];
  for (let h = 8; h < 18; h++) {
    blocks.push(
      { start: `${String(h).padStart(2, '0')}:00`, end: `${String(h).padStart(2, '0')}:30` },
      { start: `${String(h).padStart(2, '0')}:30`, end: `${String(h + 1).padStart(2, '0')}:00` }
    );
  }
  return blocks;
};

function patternFor(
  date: string,
  professionalId: string,
  seed: number
): DaySchedule {
  const slots = hours().map((b, i) => {
    const v = (i + seed + date.length) % 5;
    if (v === 0) {
      return {
        ...b,
        status: 'livre' as const
      };
    }
    if (v === 1 || v === 2) {
      return {
        ...b,
        status: 'ocupado' as const,
        patientName: ['Maria S.', 'João P.', 'Ana L.', 'Carlos R.'][(i + seed) % 4],
        detail: 'Consulta'
      };
    }
    if (v === 3) {
      return {
        ...b,
        status: 'indisponivel' as const,
        detail: i === 8 || i === 9 ? 'Almoço' : 'Bloqueio administrativo'
      };
    }
    return { ...b, status: 'livre' as const };
  });
  return { date, professionalId, slots };
}

export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysIso(base: string, days: number): string {
  const [y, mo, da] = base.split('-').map(Number);
  const dt = new Date(y, mo - 1, da + days);
  return localIsoDate(dt);
}

export const PROFESSIONALS: Professional[] = [
  { id: 'p1', name: 'Dra. Ana Martins', specialty: 'Clínica geral' },
  { id: 'p2', name: 'Dr. Bruno Costa', specialty: 'Cardiologia' },
  { id: 'p3', name: 'Dra. Carla Dias', specialty: 'Dermatologia' }
];

/**
 * Mapeamento login → professionalId.
 * Usado para restringir a agenda do dentista ao próprio profissional.
 */
export const USUARIO_PROFESSIONAL_MAP: Record<string, string> = {
  'ana.martins': 'p1',
  'bruno.costa': 'p2',
  'carla.dias':  'p3'
};

export function buildMockSchedules(anchor: string): DaySchedule[] {
  const d0 = anchor;
  const d1 = addDaysIso(anchor, 1);
  const d2 = addDaysIso(anchor, 2);
  const out: DaySchedule[] = [];
  for (const pro of PROFESSIONALS) {
    let s = 1;
    for (const d of [d0, d1, d2]) {
      out.push(patternFor(d, pro.id, s));
      s += 3;
    }
  }
  return out;
}
