import { Injectable, signal, computed } from '@angular/core';
import { type AtendimentoConcluido, type FormaPagamento, FORMAS_PAGAMENTO } from './atendimento.service';

export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado';
export type CategoriaDespesa =
  | 'aluguel' | 'salario' | 'material' | 'equipamento'
  | 'servico' | 'imposto' | 'outros';

export const CATEGORIAS_DESPESA: { value: CategoriaDespesa; label: string }[] = [
  { value: 'aluguel',      label: 'Aluguel' },
  { value: 'salario',      label: 'Salário / Pró-labore' },
  { value: 'material',     label: 'Material odontológico' },
  { value: 'equipamento',  label: 'Equipamento' },
  { value: 'servico',      label: 'Serviço terceirizado' },
  { value: 'imposto',      label: 'Imposto / Taxa' },
  { value: 'outros',       label: 'Outros' },
];

export interface Lancamento {
  id:           string;
  tipo:         TipoLancamento;
  descricao:    string;
  valor:        number;
  data:         string;         // ISO date
  vencimento:   string;         // ISO date
  status:       StatusLancamento;
  categoria:    CategoriaDespesa | 'atendimento';
  formaPagamento?: FormaPagamento;
  /** Vinculado a um atendimento concluído */
  atendimentoId?: string;
  paciente?:    string;
  profissional?: string;
  procedimento?: string;
  observacoes?: string;
  criadoEm:     string;
}

const STORAGE_KEY = 'agendai_financeiro';

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private readonly _lancamentos = signal<Lancamento[]>(this.load());

  readonly lancamentos = this._lancamentos.asReadonly();

  readonly receitas  = computed(() => this._lancamentos().filter((l) => l.tipo === 'receita'));
  readonly despesas  = computed(() => this._lancamentos().filter((l) => l.tipo === 'despesa'));
  readonly pendentes = computed(() => this._lancamentos().filter((l) => l.status === 'pendente'));

  readonly totalReceitas  = computed(() => this.receitas().filter(l => l.status === 'pago').reduce((s, l) => s + l.valor, 0));
  readonly totalDespesas  = computed(() => this.despesas().filter(l => l.status === 'pago').reduce((s, l) => s + l.valor, 0));
  readonly saldoLiquido   = computed(() => this.totalReceitas() - this.totalDespesas());
  readonly totalPendente  = computed(() => this.pendentes().reduce((s, l) => s + l.valor, 0));

  // ─── Persistência ──────────────────────────────────────────────────────
  private load(): Lancamento[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Lancamento[]) : [];
    } catch { return []; }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._lancamentos()));
  }

  // ─── Sincroniza receitas dos atendimentos pagos ────────────────────────
  sincronizarAtendimentos(atendimentos: AtendimentoConcluido[]): void {
    const pagos = atendimentos.filter((a) => a.pago);
    let alterou = false;

    for (const a of pagos) {
      const jaExiste = this._lancamentos().some((l) => l.atendimentoId === a.id);
      if (jaExiste) continue;

      const novo: Lancamento = {
        id:            `fin_${a.id}`,
        tipo:          'receita',
        descricao:     `${a.procedimento} — ${a.paciente}`,
        valor:         a.valor,
        data:          a.data,
        vencimento:    a.data,
        status:        'pago',
        categoria:     'atendimento',
        formaPagamento: a.formaPagamento,
        atendimentoId: a.id,
        paciente:      a.paciente,
        profissional:  a.profissional,
        procedimento:  a.procedimento,
        criadoEm:      new Date().toISOString().slice(0, 10),
      };
      this._lancamentos.update((list) => [...list, novo]);
      alterou = true;
    }
    if (alterou) this.persist();
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────
  criar(dados: Omit<Lancamento, 'id' | 'criadoEm'>): void {
    const novo: Lancamento = {
      ...dados,
      id:       `l${Date.now()}`,
      criadoEm: new Date().toISOString().slice(0, 10),
    };
    this._lancamentos.update((list) => [...list, novo]);
    this.persist();
  }

  atualizar(id: string, dados: Partial<Omit<Lancamento, 'id' | 'criadoEm'>>): void {
    this._lancamentos.update((list) =>
      list.map((l) => (l.id === id ? { ...l, ...dados } : l))
    );
    this.persist();
  }

  excluir(id: string): void {
    this._lancamentos.update((list) => list.filter((l) => l.id !== id));
    this.persist();
  }

  quitarLancamento(id: string, formaPagamento: FormaPagamento): void {
    this._lancamentos.update((list) =>
      list.map((l) => l.id === id ? { ...l, status: 'pago' as StatusLancamento, formaPagamento } : l)
    );
    this.persist();
  }

  // ─── Helpers de consulta ───────────────────────────────────────────────
  porPeriodo(inicio: string, fim: string): Lancamento[] {
    return this._lancamentos().filter((l) => l.data >= inicio && l.data <= fim);
  }

  caixaDiario(data: string): { receitas: number; despesas: number; saldo: number } {
    const do_dia = this.porPeriodo(data, data).filter((l) => l.status === 'pago');
    const receitas = do_dia.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesas = do_dia.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }

  porFormaPagamento(): { forma: string; total: number; quantidade: number }[] {
    const map = new Map<string, { total: number; quantidade: number }>();
    for (const l of this._lancamentos().filter((l) => l.tipo === 'receita' && l.status === 'pago')) {
      const label = FORMAS_PAGAMENTO.find((f) => f.value === l.formaPagamento)?.label ?? 'Não informado';
      const atual = map.get(label) ?? { total: 0, quantidade: 0 };
      map.set(label, { total: atual.total + l.valor, quantidade: atual.quantidade + 1 });
    }
    return [...map.entries()]
      .map(([forma, v]) => ({ forma, ...v }))
      .sort((a, b) => b.total - a.total);
  }
}
