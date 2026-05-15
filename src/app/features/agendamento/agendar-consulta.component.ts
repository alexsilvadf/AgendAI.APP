import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { localIsoDate } from '../agenda/agenda-mock.data';
import type { Professional } from '../agenda/agenda.types';
import { ApiAgendaService } from '../../core/services/api-agenda.service';
import { ApiAgendamentoService } from '../../core/services/api-agendamento.service';
import { ApiCatalogoService } from '../../core/services/api-catalogo.service';
import {
  opcoesHorarioClinica,
  type ProcedimentoOption
} from './agendar-consulta.data';

import type { DaySchedule } from '../agenda/agenda.types';

@Component({
  selector: 'app-agendar-consulta',
  imports: [ReactiveFormsModule],
  templateUrl: './agendar-consulta.component.html',
  styleUrl: './agendar-consulta.component.scss'
})
export class AgendarConsultaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly apiAgenda = inject(ApiAgendaService);
  private readonly apiAgendamento = inject(ApiAgendamentoService);
  private readonly apiCatalogo = inject(ApiCatalogoService);

  readonly professionals = signal<Professional[]>([]);
  readonly pacientes = signal<{ id: string; nome: string }[]>([]);
  readonly procedimentos = signal<ProcedimentoOption[]>([]);
  readonly horarios: string[] = opcoesHorarioClinica();

  readonly salvoComSucesso = signal(false);
  readonly erroConflito = signal<string | null>(null);
  readonly gradeDia = signal<DaySchedule | null>(null);

  readonly form = this.fb.nonNullable.group({
    profissionalId: ['', [Validators.required]],
    pacienteId: ['', [Validators.required]],
    data: [localIsoDate(new Date()), [Validators.required]],
    hora: ['', [Validators.required]],
    procedimentoId: ['', [Validators.required]],
    valor: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    this.apiAgenda.listarProfissionais().subscribe({
      next: (items) => this.professionals.set(items)
    });
    this.apiCatalogo.listarPacientes().subscribe({
      next: (items) => this.pacientes.set(items.map((p) => ({ id: p.id, nome: p.nome })))
    });
    this.apiCatalogo.listarProcedimentosAtivos().subscribe({
      next: (items) =>
        this.procedimentos.set(items.map((p) => ({ id: p.id, nome: p.nome, valor: p.valor })))
    });

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
    const proc = this.procedimentos().find((p) => p.id === id);
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

    this.apiAgendamento
      .criar({
        profissionalId: dados.profissionalId,
        pacienteId: dados.pacienteId,
        procedimentoId: dados.procedimentoId,
        data: dados.data,
        hora: dados.hora,
        valor: dados.valor
      })
      .subscribe({
        next: () => this.salvoComSucesso.set(true),
        error: (err) => {
          const detail = err?.error?.detail ?? err?.error?.title;
          this.erroConflito.set(detail ?? 'Não foi possível criar o agendamento.');
        }
      });
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

  onContextoAgendaChange(): void {
    this.salvoComSucesso.set(false);
    this.erroConflito.set(null);

    const { profissionalId, data } = this.form.getRawValue();
    if (!profissionalId || !data) {
      this.gradeDia.set(null);
      return;
    }

    this.apiAgenda.obterGrade(data, profissionalId).subscribe({
      next: (rows) => this.gradeDia.set(rows[0] ?? null),
      error: () => this.gradeDia.set(null)
    });

    const horaSelecionada = this.form.controls.hora.value;
    if (horaSelecionada && this.isHorarioIndisponivel(horaSelecionada)) {
      this.form.patchValue({ hora: '' }, { emitEvent: false });
    }
  }

  isHorarioIndisponivel(hora: string): boolean {
    const row = this.gradeDia();
    if (!row) {
      return false;
    }

    const slot = row.slots.find((s) => s.start === hora);
    return !slot || slot.status !== 'livre';
  }
}
