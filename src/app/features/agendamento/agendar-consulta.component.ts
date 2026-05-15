import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { buildMockSchedules, PROFESSIONALS, localIsoDate } from '../agenda/agenda-mock.data';
import type { Professional } from '../agenda/agenda.types';
import { PacienteService } from '../../core/services/paciente.service';
import {
  PROCEDIMENTOS_MOCK,
  opcoesHorarioClinica,
  type ProcedimentoOption
} from './agendar-consulta.data';

interface AgendamentoRegistrado {
  profissionalId: string;
  pacienteId: string;
  data: string;
  hora: string;
}

@Component({
  selector: 'app-agendar-consulta',
  imports: [ReactiveFormsModule],
  templateUrl: './agendar-consulta.component.html',
  styleUrl: './agendar-consulta.component.scss'
})
export class AgendarConsultaComponent {
  private readonly fb      = inject(FormBuilder);
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);
  private readonly pacienteService = inject(PacienteService);

  readonly professionals: Professional[] = PROFESSIONALS;
  readonly pacientes = computed(() =>
    this.pacienteService.ativos().map((p) => ({ id: p.id, nome: p.nome }))
  );
  readonly procedimentos: ProcedimentoOption[] = PROCEDIMENTOS_MOCK;
  readonly horarios: string[] = opcoesHorarioClinica();
  readonly agendamentos = signal<AgendamentoRegistrado[]>([
    { profissionalId: 'p1', pacienteId: 'c1', data: localIsoDate(new Date()), hora: '09:00' },
    { profissionalId: 'p2', pacienteId: 'c2', data: localIsoDate(new Date()), hora: '10:30' }
  ]);

  readonly salvoComSucesso = signal(false);
  readonly erroConflito = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    profissionalId: ['', [Validators.required]],
    pacienteId: ['', [Validators.required]],
    data: [localIsoDate(new Date()), [Validators.required]],
    hora: ['', [Validators.required]],
    procedimentoId: ['', [Validators.required]],
    valor: [0, [Validators.required, Validators.min(0.01)]]
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const profissionalId = params.get('profissionalId') ?? '';
    const data = params.get('data') ?? localIsoDate(new Date());
    const hora = params.get('hora') ?? '';
    this.form.patchValue({
      profissionalId,
      data,
      hora
    });
  }

  aoEscolherProcedimento(): void {
    const id = this.form.controls.procedimentoId.value;
    const proc = this.procedimentos.find((p) => p.id === id);
    if (proc) {
      this.form.patchValue({ valor: proc.valor }, { emitEvent: false });
    }
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  onSubmit(): void {
    this.salvoComSucesso.set(false);
    this.erroConflito.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados = this.form.getRawValue();
    const conflito = this.validarConflito(dados.profissionalId, dados.pacienteId, dados.data, dados.hora);
    if (conflito) {
      this.erroConflito.set(conflito);
      return;
    }

    this.agendamentos.update((items) => [
      ...items,
      {
        profissionalId: dados.profissionalId,
        pacienteId: dados.pacienteId,
        data: dados.data,
        hora: dados.hora
      }
    ]);
    // TODO: POST para API de agendamentos
    console.warn('Agendamento:', dados);
    this.salvoComSucesso.set(true);
  }

  limpar(): void {
    this.salvoComSucesso.set(false);
    this.erroConflito.set(null);
    this.form.reset({
      profissionalId: '',
      pacienteId: '',
      data: localIsoDate(new Date()),
      hora: '',
      procedimentoId: '',
      valor: 0
    });
  }

  private validarConflito(
    profissionalId: string,
    pacienteId: string,
    data: string,
    hora: string
  ): string | null {
    const itens = this.agendamentos();
    const conflitoProfissional = itens.some(
      (item) => item.data === data && item.hora === hora && item.profissionalId === profissionalId
    );
    if (conflitoProfissional) {
      return 'Este profissional já possui um agendamento na mesma data e horário.';
    }

    const conflitoPaciente = itens.some(
      (item) => item.data === data && item.hora === hora && item.pacienteId === pacienteId
    );
    if (conflitoPaciente) {
      return 'Este paciente já possui um agendamento na mesma data e horário.';
    }

    return null;
  }

  onContextoAgendaChange(): void {
    this.salvoComSucesso.set(false);
    this.erroConflito.set(null);
    const horaSelecionada = this.form.controls.hora.value;
    if (horaSelecionada && this.isHorarioIndisponivel(horaSelecionada)) {
      this.form.patchValue({ hora: '' }, { emitEvent: false });
    }
  }

  isHorarioIndisponivel(hora: string): boolean {
    const { profissionalId, pacienteId, data } = this.form.getRawValue();
    if (!profissionalId || !data) {
      return true;
    }

    const bloqueados = this.horariosBloqueadosProfissional(profissionalId, data);
    if (bloqueados.has(hora)) {
      return true;
    }

    if (!pacienteId) {
      return false;
    }
    return this.agendamentos().some(
      (item) => item.data === data && item.hora === hora && item.pacienteId === pacienteId
    );
  }

  private horariosBloqueadosProfissional(profissionalId: string, data: string): Set<string> {
    const bloqueados = new Set<string>();

    for (const item of this.agendamentos()) {
      if (item.data === data && item.profissionalId === profissionalId) {
        bloqueados.add(item.hora);
      }
    }

    for (const row of buildMockSchedules(data)) {
      if (row.professionalId !== profissionalId || row.date !== data) {
        continue;
      }
      for (const slot of row.slots) {
        if (slot.status !== 'livre') {
          bloqueados.add(slot.start);
        }
      }
    }

    return bloqueados;
  }
}
