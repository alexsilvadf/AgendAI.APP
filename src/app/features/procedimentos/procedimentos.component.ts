import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

type StatusProcedimento = 'ativo' | 'inativo';
type FiltroStatus = 'todos' | StatusProcedimento;

interface ProcedimentoClinico {
  id: number;
  nome: string;
  valor: number;
  status: StatusProcedimento;
}

@Component({
  selector: 'app-procedimentos',
  imports: [ReactiveFormsModule],
  templateUrl: './procedimentos.component.html',
  styleUrl: './procedimentos.component.scss'
})
export class ProcedimentosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly filtroNome = signal('');
  readonly filtroStatus = signal<FiltroStatus>('todos');
  readonly editandoId = signal<number | null>(null);
  readonly mensagem = signal<string | null>(null);

  readonly procedimentos = signal<ProcedimentoClinico[]>([
    { id: 1, nome: 'Consulta clínica geral', valor: 180, status: 'ativo' },
    { id: 2, nome: 'Retorno cardiológico', valor: 130, status: 'ativo' },
    { id: 3, nome: 'Ultrassonografia', valor: 260, status: 'inativo' }
  ]);

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    status: ['ativo' as StatusProcedimento, [Validators.required]]
  });

  readonly listaFiltrada = computed(() => {
    const termo = this.filtroNome().trim().toLowerCase();
    const status = this.filtroStatus();
    return this.procedimentos().filter((p) => {
      const okNome = !termo || p.nome.toLowerCase().includes(termo);
      const okStatus = status === 'todos' || p.status === status;
      return okNome && okStatus;
    });
  });

  readonly resumo = computed(() => {
    const todos = this.procedimentos();
    const ativos = todos.filter((p) => p.status === 'ativo').length;
    const inativos = todos.length - ativos;
    return { total: todos.length, ativos, inativos };
  });

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  onFiltroNomeChange(value: string): void {
    this.filtroNome.set(value);
  }

  onFiltroStatusChange(value: string): void {
    this.filtroStatus.set((value as FiltroStatus) ?? 'todos');
  }

  salvar(): void {
    this.mensagem.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados = this.form.getRawValue();
    const idEditando = this.editandoId();

    if (idEditando === null) {
      const nextId =
        this.procedimentos().length === 0
          ? 1
          : Math.max(...this.procedimentos().map((p) => p.id)) + 1;
      this.procedimentos.update((items) => [...items, { id: nextId, ...dados }]);
      this.mensagem.set('Procedimento cadastrado com sucesso.');
    } else {
      this.procedimentos.update((items) =>
        items.map((item) => (item.id === idEditando ? { ...item, ...dados } : item))
      );
      this.mensagem.set('Procedimento atualizado com sucesso.');
    }

    this.cancelarEdicao();
  }

  editar(item: ProcedimentoClinico): void {
    this.editandoId.set(item.id);
    this.form.setValue({
      nome: item.nome,
      valor: item.valor,
      status: item.status
    });
    this.mensagem.set(null);
  }

  excluir(id: number): void {
    this.procedimentos.update((items) => items.filter((item) => item.id !== id));
    if (this.editandoId() === id) {
      this.cancelarEdicao();
    }
    this.mensagem.set('Procedimento removido.');
  }

  trocarStatus(id: number): void {
    this.procedimentos.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: item.status === 'ativo' ? 'inativo' : 'ativo' } : item
      )
    );
    this.mensagem.set('Status atualizado.');
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.form.reset({
      nome: '',
      valor: 0,
      status: 'ativo'
    });
  }
}
