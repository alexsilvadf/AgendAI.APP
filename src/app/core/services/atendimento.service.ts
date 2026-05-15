import { Injectable, signal, computed, NgZone, inject, OnDestroy } from '@angular/core';

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'cartao_credito_parcelado'
  | 'convenio';

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'dinheiro',                 label: 'Dinheiro' },
  { value: 'pix',                      label: 'PIX' },
  { value: 'cartao_debito',            label: 'Cartão de débito' },
  { value: 'cartao_credito',           label: 'Cartão de crédito (à vista)' },
  { value: 'cartao_credito_parcelado', label: 'Cartão de crédito (parcelado)' },
  { value: 'convenio',                 label: 'Convênio / Plano de saúde' },
];

export interface AtendimentoConcluido {
  /** Chave única: professionalId + date + hora */
  id:             string;
  professionalId: string;
  profissional:   string;
  paciente:       string;
  procedimento:   string;
  data:           string;   // ISO date
  hora:           string;
  valor:          number;
  observacoes:    string;
  dentes:         string;
  retorno:        boolean;
  /** Preenchido pela recepcionista ao registrar o pagamento */
  pago:           boolean;
  formaPagamento?: FormaPagamento;
  parcelas?:      number;
}

const STORAGE_KEY = 'agendai_atendimentos_concluidos';

@Injectable({ providedIn: 'root' })
export class AtendimentoService implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly _atendimentos = signal<AtendimentoConcluido[]>(this.load());

  readonly atendimentos   = this._atendimentos.asReadonly();
  readonly pendentes      = computed(() => this._atendimentos().filter((a) => !a.pago));
  readonly totalPendentes = computed(() => this.pendentes().length);

  private pollingId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Evento storage: funciona entre abas do MESMO browser
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      this.zone.run(() => this._atendimentos.set(this.load()));
    });

    // Polling a cada 1s: detecta mudanças no localStorage.
    // Funciona entre abas do mesmo browser (junto com o storage event).
    // NOTA: localStorage é isolado por browser — Chrome e Edge não compartilham.
    // Para testes entre browsers diferentes, use abas do mesmo browser.
    this.zone.runOutsideAngular(() => {
      this.pollingId = setInterval(() => {
        const fresh = this.load();
        const atual = this._atendimentos();
        if (JSON.stringify(fresh) !== JSON.stringify(atual)) {
          this.zone.run(() => this._atendimentos.set(fresh));
        }
      }, 1000);
    });
  }

  ngOnDestroy(): void {
    if (this.pollingId !== null) {
      clearInterval(this.pollingId);
    }
  }

  // ─── Persistência ──────────────────────────────────────────────────────
  private load(): AtendimentoConcluido[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as AtendimentoConcluido[];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._atendimentos()));
  }

  // ─── Ações ────────────────────────────────────────────────────────────
  registrar(dados: Omit<AtendimentoConcluido, 'id' | 'pago'>): void {
    const id = `${dados.professionalId}_${dados.data}_${dados.hora}`;
    if (this._atendimentos().some((a) => a.id === id)) return;
    this._atendimentos.update((list) => [...list, { ...dados, id, pago: false }]);
    this.persist();
  }

  registrarPagamento(id: string, formaPagamento: FormaPagamento, parcelas?: number): void {
    this._atendimentos.update((list) =>
      list.map((a) => a.id === id ? { ...a, pago: true, formaPagamento, parcelas } : a)
    );
    this.persist();
  }

  buscarPorSlot(professionalId: string, data: string, hora: string): AtendimentoConcluido | undefined {
    const id = `${professionalId}_${data}_${hora}`;
    return this._atendimentos().find((a) => a.id === id);
  }

  /** Força releitura do localStorage — útil ao navegar para a agenda */
  sincronizar(): void {
    this._atendimentos.set(this.load());
  }
}
