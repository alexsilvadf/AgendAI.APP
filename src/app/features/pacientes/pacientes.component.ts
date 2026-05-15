import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PacienteService } from '../../core/services/paciente.service';
import {
  ESTADO_CIVIL_LABELS,
  SEXO_LABELS,
  TIPO_SANGUINEO_OPTIONS,
  anamneseVazia,
  type EstadoCivil,
  type Paciente,
  type Sexo,
  type TipoSanguineo
} from '../../core/models/paciente.model';

type FiltroAtivo = 'todos' | 'ativo' | 'inativo';

@Component({
  selector: 'app-pacientes',
  imports: [ReactiveFormsModule],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss'
})
export class PacientesComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly service        = inject(PacienteService);

  // ─── Referências ──────────────────────────────────────────────────────
  readonly sexoLabels        = SEXO_LABELS;
  readonly estadoCivilLabels = ESTADO_CIVIL_LABELS;
  readonly tipoSanguineo     = TIPO_SANGUINEO_OPTIONS;
  readonly sexos             = Object.keys(SEXO_LABELS) as Sexo[];
  readonly estadosCivis      = Object.keys(ESTADO_CIVIL_LABELS) as EstadoCivil[];
  readonly ufs               = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
    'SP','SE','TO'
  ];

  // ─── Estado ───────────────────────────────────────────────────────────
  readonly filtroNome  = signal('');
  readonly filtroAtivo = signal<FiltroAtivo>('todos');
  readonly editandoId  = signal<string | null>(null);
  readonly abaAtiva    = signal<'dados' | 'anamnese'>('dados');
  readonly mensagem    = signal<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // ─── Lista filtrada ───────────────────────────────────────────────────
  readonly listaFiltrada = computed(() => {
    const nome  = this.filtroNome().trim().toLowerCase();
    const ativo = this.filtroAtivo();
    return this.service.pacientes().filter((p) => {
      const okNome  = !nome || p.nome.toLowerCase().includes(nome)
                            || p.cpf.includes(nome)
                            || p.telefone.includes(nome);
      const okAtivo = ativo === 'todos' || (ativo === 'ativo' ? p.ativo : !p.ativo);
      return okNome && okAtivo;
    });
  });

  readonly resumo = computed(() => {
    const todos = this.service.pacientes();
    return { total: todos.length, ativos: todos.filter((p) => p.ativo).length };
  });

  // ─── Formulário — dados pessoais ──────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    // Dados pessoais
    nome:           ['', [Validators.required, Validators.minLength(3)]],
    cpf:            ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
    dataNascimento: ['', [Validators.required]],
    sexo:           ['nao_informado' as Sexo],
    estadoCivil:    ['solteiro' as EstadoCivil],
    telefone:       ['', [Validators.required, Validators.minLength(10)]],
    email:          ['', [Validators.email]],
    // Endereço
    cep:            [''],
    logradouro:     [''],
    numero:         [''],
    complemento:    [''],
    bairro:         [''],
    cidade:         [''],
    uf:             ['SP'],
    // Saúde
    tipoSanguineo:  ['nao_informado' as TipoSanguineo],
    ativo:          [true]
  });

  // ─── Formulário — anamnese ────────────────────────────────────────────
  readonly formAnamnese = this.fb.nonNullable.group({
    temDoencaCardiaca:       [false],
    temDiabetes:             [false],
    temHipertensao:          [false],
    temCoagulopatia:         [false],
    temAlergiaMedicamento:   [false],
    alergiaMedicamentoDesc:  [''],
    temAlergiaMaterial:      [false],
    alergiaMaterialDesc:     [''],
    usaMedicamentoContinuo:  [false],
    medicamentoContinuoDesc: [''],
    estaGravida:             [false],
    fumante:                 [false],
    observacoesGerais:       ['']
  });

  // ─── Ações de filtro ──────────────────────────────────────────────────
  onFiltroNome(v: string):  void { this.filtroNome.set(v); }
  onFiltroAtivo(v: string): void { this.filtroAtivo.set(v as FiltroAtivo); }

  // ─── Navegação de abas ────────────────────────────────────────────────
  irParaAba(aba: 'dados' | 'anamnese'): void { this.abaAtiva.set(aba); }

  // ─── CRUD ─────────────────────────────────────────────────────────────
  salvar(): void {
    this.mensagem.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.abaAtiva.set('dados');
      return;
    }

    const dados  = this.form.getRawValue();
    const anamnese = this.formAnamnese.getRawValue();
    const idEditando = this.editandoId();

    if (this.service.cpfExiste(dados.cpf, idEditando ?? undefined)) {
      this.mensagem.set({ tipo: 'erro', texto: `CPF ${dados.cpf} já cadastrado.` });
      this.abaAtiva.set('dados');
      return;
    }

    if (idEditando) {
      this.service.atualizar(idEditando, { ...dados, anamnese });
      this.mensagem.set({ tipo: 'sucesso', texto: 'Paciente atualizado com sucesso.' });
    } else {
      this.service.criar({ ...dados, anamnese });
      this.mensagem.set({ tipo: 'sucesso', texto: 'Paciente cadastrado com sucesso.' });
    }

    this.cancelarEdicao();
  }

  editar(p: Paciente): void {
    this.editandoId.set(p.id);
    this.mensagem.set(null);
    this.abaAtiva.set('dados');

    this.form.setValue({
      nome: p.nome, cpf: p.cpf, dataNascimento: p.dataNascimento,
      sexo: p.sexo, estadoCivil: p.estadoCivil,
      telefone: p.telefone, email: p.email,
      cep: p.cep, logradouro: p.logradouro, numero: p.numero,
      complemento: p.complemento, bairro: p.bairro,
      cidade: p.cidade, uf: p.uf,
      tipoSanguineo: p.tipoSanguineo, ativo: p.ativo
    });

    this.formAnamnese.setValue({ ...p.anamnese });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.abaAtiva.set('dados');
    this.form.reset({
      sexo: 'nao_informado', estadoCivil: 'solteiro',
      tipoSanguineo: 'nao_informado', uf: 'SP', ativo: true
    });
    this.formAnamnese.reset(anamneseVazia());
  }

  alternarAtivo(id: string): void {
    this.service.alternarAtivo(id);
    this.mensagem.set({ tipo: 'sucesso', texto: 'Status atualizado.' });
  }

  verFicha(id: string): void {
    void this.router.navigate(['/pacientes', id]);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────
  calcularIdade(dataNasc: string): number {
    const [y, m, d] = dataNasc.split('-').map(Number);
    const hoje = new Date();
    let idade = hoje.getFullYear() - y;
    if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
    return idade;
  }

  formatarData(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  }

  mascaraCpf(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9)      v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
    else if (v.length > 6) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    else if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
    this.form.controls.cpf.setValue(v, { emitEvent: false });
    input.value = v;
  }

  mascaraTelefone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10)     v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    this.form.controls.telefone.setValue(v, { emitEvent: false });
    input.value = v;
  }
}
