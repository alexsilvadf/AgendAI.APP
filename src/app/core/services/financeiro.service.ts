import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiFinanceiroService } from './api-financeiro.service';
import type { FormaPagamento } from './atendimento.service';

export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado';
export type CategoriaDespesa =
  | 'aluguel'
  | 'salario'
  | 'material'
  | 'equipamento'
  | 'servico'
  | 'imposto'
  | 'outros';

export const CATEGORIAS_DESPESA: { value: CategoriaDespesa; label: string }[] = [
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'salario', label: 'Salário / Pró-labore' },
  { value: 'material', label: 'Material odontológico' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'servico', label: 'Serviço terceirizado' },
  { value: 'imposto', label: 'Imposto / Taxa' },
  { value: 'outros', label: 'Outros' }
];

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  vencimento: string;
  status: StatusLancamento;
  categoria: CategoriaDespesa | 'atendimento';
  formaPagamento?: FormaPagamento;
  atendimentoId?: string;
  paciente?: string;
  profissional?: string;
  procedimento?: string;
  observacoes?: string;
  criadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private readonly api = inject(ApiFinanceiroService);
  private readonly _lancamentos = signal<Lancamento[]>([]);

  readonly lancamentos = this._lancamentos.asReadonly();

  readonly receitas = computed(() => this._lancamentos().filter((l) => l.tipo === 'receita'));
  readonly despesas = computed(() => this._lancamentos().filter((l) => l.tipo === 'despesa'));
  readonly pendentes = computed(() => this._lancamentos().filter((l) => l.status === 'pendente'));

  readonly totalReceitas = computed(() =>
    this.receitas().filter((l) => l.status === 'pago').reduce((s, l) => s + l.valor, 0)
  );
  readonly totalDespesas = computed(() =>
    this.despesas().filter((l) => l.status === 'pago').reduce((s, l) => s + l.valor, 0)
  );
  readonly saldoLiquido = computed(() => this.totalReceitas() - this.totalDespesas());
  readonly totalPendente = computed(() => this.pendentes().reduce((s, l) => s + l.valor, 0));

  carregar(filtros?: {
    dataInicio?: string;
    dataFim?: string;
    tipo?: TipoLancamento;
    status?: StatusLancamento;
  }): void {
    this.api.listar(filtros).subscribe({
      next: (items) =>
        this._lancamentos.set(items.map(ApiFinanceiroService.toLancamento))
    });
  }

  /** Mantido para compatibilidade — receitas de atendimento vêm da API ao pagar. */
  sincronizarAtendimentos(_atendimentos: unknown): void {
    // no-op: backend cria lançamento ao registrar pagamento
  }

  caixaDiario(data: string): { receitas: number; despesas: number; saldo: number } {
    const doDia = this._lancamentos().filter((l) => l.data === data && l.status === 'pago');
    const receitas = doDia.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesas = doDia.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }

  porPeriodo(inicio: string, fim: string): Lancamento[] {
    return this._lancamentos().filter((l) => l.data >= inicio && l.data <= fim);
  }

  criar(lancamento: Omit<Lancamento, 'id' | 'criadoEm'>): void {
    this.salvar(lancamento);
  }

  quitarLancamento(id: string, formaPagamento: FormaPagamento): void {
    this.api.atualizarStatus(id, 'pago').subscribe({
      next: (atualizado) => {
        const item = ApiFinanceiroService.toLancamento(atualizado);
        this._lancamentos.update((list) =>
          list.map((l) =>
            l.id === id ? { ...item, formaPagamento, status: 'pago' as const } : l
          )
        );
      }
    });
  }

  porFormaPagamento(): { forma: FormaPagamento; total: number; quantidade: number }[] {
    const map = new Map<FormaPagamento, { total: number; quantidade: number }>();
    for (const l of this._lancamentos()) {
      if (l.status !== 'pago' || !l.formaPagamento || l.tipo !== 'receita') continue;
      const atual = map.get(l.formaPagamento) ?? { total: 0, quantidade: 0 };
      map.set(l.formaPagamento, {
        total: atual.total + l.valor,
        quantidade: atual.quantidade + 1
      });
    }
    return [...map.entries()].map(([forma, v]) => ({ forma, ...v }));
  }

  salvar(lancamento: Omit<Lancamento, 'id' | 'criadoEm'>): void {
    this.api
      .criar({
        tipo: lancamento.tipo,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        data: lancamento.data,
        vencimento: lancamento.vencimento,
        status: lancamento.status,
        categoria: lancamento.categoria,
        formaPagamento: lancamento.formaPagamento,
        observacoes: lancamento.observacoes
      })
      .subscribe({
        next: (criado) => {
          const item = ApiFinanceiroService.toLancamento(criado);
          this._lancamentos.update((list) => [...list, item]);
        }
      });
  }

  atualizar(id: string, dados: Partial<Lancamento>): void {
    if (dados.status) {
      this.api.atualizarStatus(id, dados.status).subscribe({
        next: (atualizado) => {
          const item = ApiFinanceiroService.toLancamento(atualizado);
          this._lancamentos.update((list) =>
            list.map((l) => (l.id === item.id ? item : l))
          );
        }
      });
    }
  }

  excluir(id: string): void {
    this.atualizar(id, { status: 'cancelado' });
  }
}
