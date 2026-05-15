import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { addDaysIso, localIsoDate } from './agenda-mock.data';
import { ApiAgendaService } from '../../core/services/api-agenda.service';
import { ApiAgendamentoService } from '../../core/services/api-agendamento.service';
import { AuthService } from '../../core/services/auth.service';
import type { AgendaSlot, Professional } from './agenda.types';
import {
  AtendimentoService,
  FORMAS_PAGAMENTO,
  type AtendimentoConcluido,
  type FormaPagamento
} from '../../core/services/atendimento.service';
import { RbacService } from '../../core/services/rbac.service';

interface AgendamentoSelecionado {
  professionalId: string;
  date: string;
  start: string;
}

@Component({
  selector: 'app-agenda',
  imports: [ReactiveFormsModule],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss'
})
export class AgendaComponent {
  private readonly router         = inject(Router);
  private readonly fb             = inject(FormBuilder);
  private readonly atendimentoSvc = inject(AtendimentoService);
  private readonly rbac = inject(RbacService);
  private readonly apiAgenda = inject(ApiAgendaService);
  private readonly apiAgendamento = inject(ApiAgendamentoService);
  private readonly auth = inject(AuthService);

  readonly professionals = signal<Professional[]>([]);
  readonly formasPagamento = FORMAS_PAGAMENTO;

  // ─── Permissões ───────────────────────────────────────────────────────
  readonly podeRegistrarPagamento = computed(() =>
    this.rbac.canAny('agenda:edit', 'agendamento:cancel')
  );

  // ─── Sincronização manual ─────────────────────────────────────────────
  readonly ultimaAtualizacao = signal(new Date());
  readonly sincronizando     = signal(false);

  constructor() {
    this.carregarProfissionais();
    this.carregarGrade();
  }

  sincronizar(): void {
    this.sincronizando.set(true);
    this.carregarGrade();
    this.ultimaAtualizacao.set(new Date());
    setTimeout(() => this.sincronizando.set(false), 800);
  }

  formatarHora(d: Date): string {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ─── Filtros ──────────────────────────────────────────────────────────
  readonly selectedDate           = signal(localIsoDate(new Date()));
  readonly selectedProfessionalId = signal<string>('all');
  readonly agendamentoSelecionado = signal<AgendamentoSelecionado | null>(null);
  readonly novoHorario            = signal('');

  private readonly allSchedules = signal<import('./agenda.types').DaySchedule[]>([]);

  readonly visibleSchedules = computed(() => {
    const date = this.selectedDate();
    const pid  = this.selectedProfessionalId();
    return this.allSchedules().filter(
      (row) => row.date === date && (pid === 'all' || row.professionalId === pid)
    );
  });

  readonly summary = computed(() => {
    let livre = 0, ocupado = 0, indisponivel = 0;
    for (const row of this.visibleSchedules()) {
      for (const s of row.slots) {
        if (s.status === 'livre') livre++;
        else if (s.status === 'ocupado') ocupado++;
        else indisponivel++;
      }
    }
    return { livre, ocupado, indisponivel, total: livre + ocupado + indisponivel };
  });

  readonly horariosDisponiveisRemarcacao = computed(() => {
    const selected = this.agendamentoSelecionado();
    if (!selected) return [];
    const row = this.findRow(selected.professionalId, selected.date);
    if (!row) return [];
    return row.slots
      .filter((slot) => slot.status === 'livre')
      .map((slot) => ({ start: slot.start, end: slot.end }));
  });

  // ─── Mapa reativo de atendimentos pendentes ───────────────────────────
  readonly pendentesMap = computed(() => {
    const map = new Map<string, AtendimentoConcluido>();
    for (const a of this.atendimentoSvc.atendimentos()) {
      if (!a.pago) map.set(a.id, a);
    }
    return map;
  });

  // Mapa de TODOS os atendimentos (pendentes + pagos) para bloquear slots
  readonly todosAtendimentosMap = computed(() => {
    const map = new Map<string, AtendimentoConcluido>();
    for (const a of this.atendimentoSvc.atendimentos()) {
      map.set(a.id, a);
    }
    return map;
  });

  readonly scheduleComPendentes = computed(() => {
    const pendentes = this.pendentesMap();
    const todos     = this.todosAtendimentosMap();
    return this.visibleSchedules().map((row) => ({
      ...row,
      slots: row.slots.map((slot) => {
        const key       = `${row.professionalId}_${row.date}_${slot.start}`;
        const atendimento = todos.get(key) ?? null;
        return {
          ...slot,
          pendente:   pendentes.get(key) ?? null,   // aguarda pagamento
          atendimento                                // qualquer registro (pago ou não)
        };
      })
    }));
  });

  // ─── Modal de cobrança ────────────────────────────────────────────────
  readonly atendimentoCobranca  = signal<AtendimentoConcluido | null>(null);
  readonly pagamentoRegistrado  = signal(false);

  readonly formPagamento = this.fb.nonNullable.group({
    formaPagamento: ['' as FormaPagamento | '', [Validators.required]],
    parcelas:       [1]
  });

  readonly mostrarParcelas = computed(() =>
    this.formPagamento.controls.formaPagamento.value === 'cartao_credito_parcelado'
  );

  // ─── Helpers ──────────────────────────────────────────────────────────
  profById(id: string): Professional | undefined {
    return this.professionals().find((p) => p.id === id);
  }

  private carregarProfissionais(): void {
    this.apiAgenda.listarProfissionais().subscribe({
      next: (items) => {
        this.professionals.set(items);
        const profId = this.auth.currentProfessionalId();
        if (profId) {
          this.selectedProfessionalId.set(profId);
        }
      }
    });
  }

  private carregarGrade(): void {
    const date = this.selectedDate();
    const pid = this.selectedProfessionalId();
    const profissionalId = pid === 'all' ? undefined : pid;

    this.apiAgenda.obterGrade(date, profissionalId).subscribe({
      next: (rows) => this.allSchedules.set(rows)
    });

    this.atendimentoSvc.sincronizar({ data: date, profissionalId });
  }

  formatarMoeda(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  formatDisplayDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.carregarGrade();
  }

  onProfessionalChange(value: string): void {
    this.selectedProfessionalId.set(value);
    this.carregarGrade();
  }

  shiftDate(delta: number): void {
    this.onDateChange(addDaysIso(this.selectedDate(), delta));
  }

  // ─── Modal de agendamento (remarcar/cancelar) ─────────────────────────
  abrirDetalhesAgendamento(professionalId: string, date: string, slot: AgendaSlot): void {
    if (slot.status !== 'ocupado') return;
    this.agendamentoSelecionado.set({ professionalId, date, start: slot.start });
    this.novoHorario.set('');
  }

  onSlotClick(professionalId: string, date: string, slot: AgendaSlot): void {
    if (slot.status === 'ocupado') {
      this.abrirDetalhesAgendamento(professionalId, date, slot);
      return;
    }
    if (slot.status === 'livre') {
      void this.router.navigate(['/agendar-consulta'], {
        queryParams: { profissionalId: professionalId, data: date, hora: slot.start }
      });
    }
  }

  fecharModalAgendamento(): void {
    this.agendamentoSelecionado.set(null);
    this.novoHorario.set('');
  }

  selecionarNovoHorario(value: string): void {
    this.novoHorario.set(value);
  }

  cancelarConsulta(): void {
    const selected = this.agendamentoSelecionado();
    const slot = this.detalheAgendamentoSelecionado();
    if (!selected || !slot?.agendamentoId) return;

    this.apiAgendamento.cancelar(slot.agendamentoId).subscribe({
      next: () => {
        this.carregarGrade();
        this.fecharModalAgendamento();
      }
    });
  }

  remarcarConsulta(): void {
    const selected = this.agendamentoSelecionado();
    const novoInicio = this.novoHorario();
    const slot = this.detalheAgendamentoSelecionado();
    if (!selected || !novoInicio || !slot?.agendamentoId) return;

    this.apiAgendamento.remarcar(slot.agendamentoId, novoInicio).subscribe({
      next: () => {
        this.carregarGrade();
        this.fecharModalAgendamento();
      }
    });
  }

  detalheAgendamentoSelecionado(): AgendaSlot | undefined {
    const selected = this.agendamentoSelecionado();
    if (!selected) return undefined;
    return this.findRow(selected.professionalId, selected.date)?.slots.find(
      (slot) => slot.start === selected.start
    );
  }

  profissionalSelecionado(): Professional | undefined {
    return this.profById(this.agendamentoSelecionado()?.professionalId ?? '');
  }

  // ─── Modal de cobrança ────────────────────────────────────────────────
  abrirCobranca(atendimento: AtendimentoConcluido, event: Event): void {
    event.stopPropagation();
    this.atendimentoCobranca.set(atendimento);
    this.pagamentoRegistrado.set(false);
    this.formPagamento.reset({ formaPagamento: '', parcelas: 1 });
  }

  fecharCobranca(): void {
    this.atendimentoCobranca.set(null);
    this.pagamentoRegistrado.set(false);
  }

  confirmarPagamento(): void {
    if (this.formPagamento.invalid) {
      this.formPagamento.markAllAsTouched();
      return;
    }
    const atendimento = this.atendimentoCobranca();
    if (!atendimento) return;

    const { formaPagamento, parcelas } = this.formPagamento.getRawValue();
    this.atendimentoSvc.registrarPagamento(
      atendimento.id,
      formaPagamento as FormaPagamento,
      this.mostrarParcelas() ? parcelas : undefined
    );
    this.pagamentoRegistrado.set(true);
    this.carregarGrade();
  }

  private findRow(professionalId: string, date: string) {
    return this.allSchedules().find(
      (row) => row.professionalId === professionalId && row.date === date
    );
  }
}
