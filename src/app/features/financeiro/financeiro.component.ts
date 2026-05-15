import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinanceiroService, type Lancamento, type TipoLancamento, type StatusLancamento, type CategoriaDespesa, CATEGORIAS_DESPESA } from '../../core/services/financeiro.service';
import { AtendimentoService, FORMAS_PAGAMENTO, type FormaPagamento } from '../../core/services/atendimento.service';
import { localIsoDate } from '../agenda/agenda-mock.data';

type AbaFinanceiro = 'caixa' | 'lancamentos' | 'formas' | 'relatorio';

@Component({
  selector: 'app-financeiro',
  imports: [ReactiveFormsModule],
  templateUrl: './financeiro.component.html',
  styleUrl: './financeiro.component.scss'
})
export class FinanceiroComponent {
  private readonly fb              = inject(FormBuilder);
  private readonly finSvc          = inject(FinanceiroService);
  private readonly atendimentoSvc  = inject(AtendimentoService);

  readonly formasPagamento   = FORMAS_PAGAMENTO;
  readonly categoriasDespesa = CATEGORIAS_DESPESA;

  // ─── Aba ativa ────────────────────────────────────────────────────────
  readonly abaAtiva = signal<AbaFinanceiro>('caixa');

  // ─── Sincroniza atendimentos pagos como receitas ───────────────────────
  constructor() {
    effect(() => {
      this.finSvc.sincronizarAtendimentos(this.atendimentoSvc.atendimentos());
    });
  }

  // ─── Caixa diário ─────────────────────────────────────────────────────
  readonly dataCaixa = signal(localIsoDate(new Date()));

  readonly caixaDiario = computed(() => this.finSvc.caixaDiario(this.dataCaixa()));

  readonly lancamentosDoDia = computed(() =>
    this.finSvc.porPeriodo(this.dataCaixa(), this.dataCaixa())
      .sort((a, b) => a.data.localeCompare(b.data))
  );

  // ─── Lançamentos ──────────────────────────────────────────────────────
  readonly filtroTipo   = signal<TipoLancamento | 'todos'>('todos');
  readonly filtroStatus = signal<StatusLancamento | 'todos'>('todos');
  readonly filtroPeriodoInicio = signal(localIsoDate(new Date()).slice(0, 7) + '-01');
  readonly filtroPeriodoFim    = signal(localIsoDate(new Date()));

  readonly lancamentosFiltrados = computed(() => {
    const tipo   = this.filtroTipo();
    const status = this.filtroStatus();
    const ini    = this.filtroPeriodoInicio();
    const fim    = this.filtroPeriodoFim();
    return this.finSvc.lancamentos()
      .filter((l) =>
        (tipo   === 'todos' || l.tipo   === tipo)   &&
        (status === 'todos' || l.status === status) &&
        l.data >= ini && l.data <= fim
      )
      .sort((a, b) => b.data.localeCompare(a.data));
  });

  readonly totalFiltrado = computed(() =>
    this.lancamentosFiltrados().reduce((s, l) => {
      if (l.status === 'cancelado') return s;
      return l.tipo === 'receita' ? s + l.valor : s - l.valor;
    }, 0)
  );

  // ─── Formulário de lançamento ─────────────────────────────────────────
  readonly mostrarFormLancamento = signal(false);
  readonly editandoId            = signal<string | null>(null);
  readonly mensagem              = signal<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  readonly formLancamento = this.fb.nonNullable.group({
    tipo:          ['despesa' as TipoLancamento, [Validators.required]],
    descricao:     ['', [Validators.required, Validators.minLength(3)]],
    valor:         [0, [Validators.required, Validators.min(0.01)]],
    data:          [localIsoDate(new Date()), [Validators.required]],
    vencimento:    [localIsoDate(new Date()), [Validators.required]],
    categoria:     ['outros' as CategoriaDespesa, [Validators.required]],
    formaPagamento: ['' as FormaPagamento | ''],
    observacoes:   [''],
  });

  readonly tipoAtual = computed(() => this.formLancamento.controls.tipo.value);

  salvarLancamento(): void {
    this.mensagem.set(null);
    if (this.formLancamento.invalid) {
      this.formLancamento.markAllAsTouched();
      return;
    }
    const dados = this.formLancamento.getRawValue();
    const id = this.editandoId();

    if (id) {
      this.finSvc.atualizar(id, {
        ...dados,
        status: 'pendente',
        formaPagamento: dados.formaPagamento as FormaPagamento | undefined || undefined,
      });
      this.mensagem.set({ tipo: 'sucesso', texto: 'Lançamento atualizado.' });
    } else {
      this.finSvc.criar({
        ...dados,
        status: 'pendente',
        formaPagamento: dados.formaPagamento as FormaPagamento | undefined || undefined,
        criadoEm: localIsoDate(new Date()),
      } as Omit<Lancamento, 'id' | 'criadoEm'>);
      this.mensagem.set({ tipo: 'sucesso', texto: 'Lançamento criado com sucesso.' });
    }
    this.cancelarFormLancamento();
  }

  editarLancamento(l: Lancamento): void {
    this.editandoId.set(l.id);
    this.mostrarFormLancamento.set(true);
    this.formLancamento.setValue({
      tipo:          l.tipo,
      descricao:     l.descricao,
      valor:         l.valor,
      data:          l.data,
      vencimento:    l.vencimento,
      categoria:     l.categoria === 'atendimento' ? 'outros' : l.categoria,
      formaPagamento: l.formaPagamento ?? '',
      observacoes:   l.observacoes ?? '',
    });
  }

  excluirLancamento(id: string): void {
    this.finSvc.excluir(id);
    this.mensagem.set({ tipo: 'sucesso', texto: 'Lançamento removido.' });
  }

  quitarLancamento(l: Lancamento): void {
    this.lancamentoParaQuitar.set(l);
    this.formQuitar.reset({ formaPagamento: '' });
  }

  cancelarFormLancamento(): void {
    this.editandoId.set(null);
    this.mostrarFormLancamento.set(false);
    this.formLancamento.reset({
      tipo: 'despesa', descricao: '', valor: 0,
      data: localIsoDate(new Date()), vencimento: localIsoDate(new Date()),
      categoria: 'outros', formaPagamento: '', observacoes: '',
    });
  }

  // ─── Modal quitar lançamento ──────────────────────────────────────────
  readonly lancamentoParaQuitar = signal<Lancamento | null>(null);

  readonly formQuitar = this.fb.nonNullable.group({
    formaPagamento: ['' as FormaPagamento | '', [Validators.required]],
  });

  confirmarQuitacao(): void {
    if (this.formQuitar.invalid) { this.formQuitar.markAllAsTouched(); return; }
    const l = this.lancamentoParaQuitar();
    if (!l) return;
    this.finSvc.quitarLancamento(l.id, this.formQuitar.getRawValue().formaPagamento as FormaPagamento);
    this.lancamentoParaQuitar.set(null);
    this.mensagem.set({ tipo: 'sucesso', texto: 'Pagamento registrado.' });
  }

  // ─── Formas de pagamento ──────────────────────────────────────────────
  readonly distribuicaoFormas = computed(() => this.finSvc.porFormaPagamento());

  readonly totalFormas = computed(() =>
    this.distribuicaoFormas().reduce((s, f) => s + f.total, 0)
  );

  // ─── Relatório ────────────────────────────────────────────────────────
  readonly relatorioInicio = signal(localIsoDate(new Date()).slice(0, 7) + '-01');
  readonly relatorioFim    = signal(localIsoDate(new Date()));

  readonly dadosRelatorio = computed(() => {
    const lancamentos = this.finSvc.porPeriodo(this.relatorioInicio(), this.relatorioFim())
      .filter((l) => l.status !== 'cancelado');

    const receitas  = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesas  = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const pendentes = lancamentos.filter((l) => l.status === 'pendente').reduce((s, l) => s + l.valor, 0);

    // Receitas por profissional
    const porProfissional = new Map<string, number>();
    for (const l of lancamentos.filter((l) => l.tipo === 'receita' && l.profissional)) {
      const k = l.profissional!;
      porProfissional.set(k, (porProfissional.get(k) ?? 0) + l.valor);
    }

    // Despesas por categoria
    const porCategoria = new Map<string, number>();
    for (const l of lancamentos.filter((l) => l.tipo === 'despesa')) {
      const label = CATEGORIAS_DESPESA.find((c) => c.value === l.categoria)?.label ?? l.categoria;
      porCategoria.set(label, (porCategoria.get(label) ?? 0) + l.valor);
    }

    return {
      receitas, despesas, saldo: receitas - despesas, pendentes,
      porProfissional: [...porProfissional.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total),
      porCategoria:    [...porCategoria.entries()].map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total),
      totalLancamentos: lancamentos.length,
    };
  });

  // ─── Helpers ──────────────────────────────────────────────────────────
  readonly resumoGeral = computed(() => ({
    totalReceitas:  this.finSvc.totalReceitas(),
    totalDespesas:  this.finSvc.totalDespesas(),
    saldoLiquido:   this.finSvc.saldoLiquido(),
    totalPendente:  this.finSvc.totalPendente(),
  }));

  formatarMoeda(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  formatarData(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  }

  labelFormaPagamento(v?: FormaPagamento): string {
    return FORMAS_PAGAMENTO.find((f) => f.value === v)?.label ?? '—';
  }

  labelCategoria(v: string): string {
    return CATEGORIAS_DESPESA.find((c) => c.value === v)?.label ?? v;
  }

  porcentagem(valor: number, total: number): string {
    if (!total) return '0%';
    return ((valor / total) * 100).toFixed(1) + '%';
  }
}
