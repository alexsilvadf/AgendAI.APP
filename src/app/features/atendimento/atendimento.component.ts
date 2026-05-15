import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { AtendimentoService } from '../../core/services/atendimento.service';
import type { AtendimentoConcluido } from '../../core/services/atendimento.service';
import { ApiAgendaService } from '../../core/services/api-agenda.service';
import { ApiCatalogoService, type ProcedimentoApi } from '../../core/services/api-catalogo.service';
import { localIsoDate, addDaysIso } from '../agenda/agenda-mock.data';
import type { AgendaSlot, DaySchedule, Professional } from '../agenda/agenda.types';
import type { Paciente } from '../../core/models/paciente.model';

export type EtapaAtendimento = 'agenda' | 'ficha' | 'procedimento' | 'finalizado';

interface AgendamentoSelecionado {
  professionalId: string;
  date: string;
  slot: AgendaSlot;
}

@Component({
  selector: 'app-atendimento',
  imports: [ReactiveFormsModule],
  templateUrl: './atendimento.component.html',
  styleUrl: './atendimento.component.scss'
})
export class AtendimentoComponent {
  private readonly fb              = inject(FormBuilder);
  private readonly router          = inject(Router);
  private readonly auth            = inject(AuthService);
  private readonly pacienteService = inject(PacienteService);
  private readonly atendimentoSvc  = inject(AtendimentoService);
  private readonly apiAgenda       = inject(ApiAgendaService);
  private readonly apiCatalogo     = inject(ApiCatalogoService);

  // ─── Estado do fluxo ──────────────────────────────────────────────────
  readonly etapa = signal<EtapaAtendimento>('agenda');

  // ─── Usuário logado ───────────────────────────────────────────────────
  readonly usuarioLogado = computed(() => this.auth.currentUser() ?? 'Profissional');
  readonly isDentista    = computed(() => this.auth.currentRole() === 'dentista');

  /**
   * Para dentistas: professionalId fixo mapeado pelo login.
   * Para admin: null (sem restrição — pode ver todos).
   */
  readonly professionalIdFixo = computed<string | null>(() => {
    if (!this.isDentista()) return null;
    return this.auth.currentProfessionalId();
  });

  readonly professionals = signal<Professional[]>([]);
  readonly procedimentos = signal<ProcedimentoApi[]>([]);

  readonly selectedDate           = signal(localIsoDate(new Date()));
  readonly selectedProfId         = signal<string>('all');
  readonly agendamentoSelecionado = signal<AgendamentoSelecionado | null>(null);

  private readonly allSchedules = signal<DaySchedule[]>([]);

  constructor() {
    this.carregarProfissionais();
    this.carregarProcedimentos();
    this.carregarGrade();
  }

  readonly atendimentosPorSlot = computed(() => {
    const map = new Map<string, AtendimentoConcluido>();
    for (const a of this.atendimentoSvc.atendimentos()) {
      map.set(AtendimentoService.slotKey(a.professionalId, a.data, a.hora), a);
    }
    return map;
  });

  readonly visibleSchedules = computed(() => {
    const date = this.selectedDate();
    const pid  = this.professionalIdFixo() ?? this.selectedProfId();
    const atendimentos = this.atendimentosPorSlot();
    return this.allSchedules()
      .filter((row) => row.date === date && (pid === 'all' || row.professionalId === pid))
      .map((row) => ({
        ...row,
        slots: row.slots.map((slot) => {
          const key = AtendimentoService.slotKey(row.professionalId, row.date, slot.start);
          const atendimento = atendimentos.get(key) ?? null;
          return { ...slot, atendimento };
        })
      }));
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
    return { livre, ocupado, indisponivel };
  });

  // ─── Etapa 2 — Ficha do paciente ──────────────────────────────────────
  readonly pacientes           = computed(() => this.pacienteService.ativos());
  readonly pacienteSelecionado = signal<Paciente | null>(null);
  readonly buscaPaciente       = signal('');

  readonly pacientesFiltrados = computed(() => {
    const termo = this.buscaPaciente().trim().toLowerCase();
    if (!termo) return this.pacientes();
    return this.pacientes().filter(
      (p) => p.nome.toLowerCase().includes(termo) || p.cpf.includes(termo)
    );
  });

  readonly form = this.fb.nonNullable.group({
    procedimentoId: ['',  [Validators.required]],
    valor:          [0,   [Validators.required, Validators.min(0.01)]],
    observacoes:    [''],
    dentes:         [''],
    retorno:        [false]
  });

  // ─── Etapa 4 — Finalizado ─────────────────────────────────────────────
  readonly atendimentoFinalizado = signal<{
    paciente:     string;
    procedimento: string;
    profissional: string;
    data:         string;
    hora:         string;
    valor:        number;
    observacoes:  string;
    dentes:       string;
    retorno:      boolean;
  } | null>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────
  profById(id: string): Professional | undefined {
    return this.professionals().find((p) => p.id === id);
  }

  private carregarProfissionais(): void {
    this.apiAgenda.listarProfissionais().subscribe({
      next: (items) => {
        this.professionals.set(items);
        const profId = this.auth.currentProfessionalId();
        if (profId) this.selectedProfId.set(profId);
      }
    });
  }

  private carregarProcedimentos(): void {
    this.apiCatalogo.listarProcedimentosAtivos().subscribe({
      next: (items) => this.procedimentos.set(items)
    });
  }

  private carregarGrade(): void {
    const date = this.selectedDate();
    const pid = this.professionalIdFixo() ?? this.selectedProfId();
    const profissionalId = pid === 'all' ? undefined : pid;
    this.apiAgenda.obterGrade(date, profissionalId).subscribe({
      next: (rows) => this.allSchedules.set(rows)
    });
    this.atendimentoSvc.sincronizar({ data: date, profissionalId });
  }

  formatDisplayDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  formatarData(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  }

  formatarMoeda(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  calcularIdade(dataNasc: string): number {
    const [y, m, d] = dataNasc.split('-').map(Number);
    const hoje = new Date();
    let idade = hoje.getFullYear() - y;
    if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
    return idade;
  }

  nomeProcedimento(id: string): string {
    return this.procedimentos().find((p) => p.id === id)?.nome ?? id;
  }

  sim(v: boolean): string { return v ? 'Sim' : 'Não'; }

  // ─── Etapa 1: ações da agenda ─────────────────────────────────────────
  onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.carregarGrade();
  }

  shiftDate(delta: number): void {
    this.onDateChange(addDaysIso(this.selectedDate(), delta));
  }

  selecionarSlot(row: DaySchedule, slot: AgendaSlot): void {
    if (slot.status !== 'ocupado') return;
    this.agendamentoSelecionado.set({ professionalId: row.professionalId, date: row.date, slot });
    this.etapa.set('ficha');
    this.pacienteSelecionado.set(null);
    this.buscaPaciente.set('');
  }

  // ─── Etapa 2: ações da ficha ──────────────────────────────────────────
  selecionarPaciente(p: Paciente): void {
    this.pacienteSelecionado.set(p);
  }

  confirmarPaciente(): void {
    if (!this.pacienteSelecionado()) return;
    this.etapa.set('procedimento');
    this.form.reset({ procedimentoId: '', valor: 0, observacoes: '', dentes: '', retorno: false });
  }

  // ─── Etapa 3: ações do procedimento ──────────────────────────────────
  aoEscolherProcedimento(): void {
    const id   = this.form.controls.procedimentoId.value;
    const proc = this.procedimentos().find((p) => p.id === id);
    if (proc) this.form.patchValue({ valor: proc.valor }, { emitEvent: false });
  }

  finalizarAtendimento(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const ag      = this.agendamentoSelecionado()!;
    const paciente = this.pacienteSelecionado()!;
    const dados   = this.form.getRawValue();
    const proc = this.procedimentos().find((p) => p.id === dados.procedimentoId);
    const prof = this.profById(ag.professionalId);

    this.atendimentoSvc.registrar({
      profissionalId: ag.professionalId,
      pacienteId: paciente.id,
      procedimentoId: dados.procedimentoId,
      data: ag.date,
      hora: ag.slot.start,
      valor: dados.valor,
      observacoes: dados.observacoes,
      dentes: dados.dentes,
      retorno: dados.retorno,
      agendamentoId: ag.slot.agendamentoId
    });

    this.atendimentoFinalizado.set({
      paciente:     paciente.nome,
      procedimento: proc?.nome ?? dados.procedimentoId,
      profissional: prof?.name ?? this.usuarioLogado(),
      data:         ag.date,
      hora:         ag.slot.start,
      valor:        dados.valor,
      observacoes:  dados.observacoes,
      dentes:       dados.dentes,
      retorno:      dados.retorno
    });

    this.etapa.set('finalizado');
  }

  // ─── Navegação ────────────────────────────────────────────────────────
  voltarEtapa(): void {
    const atual = this.etapa();
    if (atual === 'ficha')        this.etapa.set('agenda');
    if (atual === 'procedimento') this.etapa.set('ficha');
  }

  novoAtendimento(): void {
    this.etapa.set('agenda');
    this.agendamentoSelecionado.set(null);
    this.pacienteSelecionado.set(null);
    this.atendimentoFinalizado.set(null);
    this.form.reset({ procedimentoId: '', valor: 0, observacoes: '', dentes: '', retorno: false });
    this.carregarGrade();
  }

  irParaAgenda(): void {
    void this.router.navigate(['/agenda']);
  }

  irParaFicha(): void {
    const p = this.pacienteSelecionado();
    if (p) void this.router.navigate(['/pacientes', p.id]);
  }
}
