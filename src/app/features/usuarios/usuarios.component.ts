import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RbacService } from '../../core/services/rbac.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type AppUser,
  type Permission,
  type UserRole
} from '../../core/models/user.model';

type FiltroRole = UserRole | 'todos';
type FiltroAtivo = 'todos' | 'ativo' | 'inativo';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent {
  private readonly fb = inject(FormBuilder);
  readonly userService = inject(UserService);
  readonly rbac = inject(RbacService);
  private readonly auth = inject(AuthService);

  constructor() {
    this.userService.carregar();
  }

  // ─── Dados de referência ──────────────────────────────────────────────
  readonly roleLabels = ROLE_LABELS;
  readonly rolePermissions = ROLE_PERMISSIONS;
  readonly roles: UserRole[] = ['administrador', 'dentista', 'recepcionista'];

  readonly permissaoLabels: Record<Permission, string> = {
    'agenda:view':          'Ver agenda',
    'agenda:edit':          'Editar agenda',
    'agendamento:create':   'Criar agendamento',
    'agendamento:cancel':   'Cancelar agendamento',
    'pacientes:view':       'Ver pacientes',
    'pacientes:edit':       'Editar pacientes',
    'procedimentos:view':   'Ver procedimentos',
    'procedimentos:edit':   'Editar procedimentos',
    'financeiro:view':      'Ver financeiro',
    'financeiro:edit':      'Editar financeiro',
    'usuarios:view':        'Ver usuários',
    'usuarios:edit':        'Editar usuários',
    'atendimento:create':   'Registrar atendimento'
  };

  // ─── Estado ───────────────────────────────────────────────────────────
  readonly filtroNome   = signal('');
  readonly filtroRole   = signal<FiltroRole>('todos');
  readonly filtroAtivo  = signal<FiltroAtivo>('todos');
  readonly editandoId   = signal<string | null>(null);
  readonly mensagem     = signal<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  readonly mostrarSenha = signal(false);
  readonly detalheId    = signal<string | null>(null);

  // ─── Lista filtrada ───────────────────────────────────────────────────
  readonly listaFiltrada = computed(() => {
    const nome  = this.filtroNome().trim().toLowerCase();
    const role  = this.filtroRole();
    const ativo = this.filtroAtivo();

    return this.userService.usuarios().filter((u) => {
      const okNome  = !nome || u.nome.toLowerCase().includes(nome) || u.usuario.toLowerCase().includes(nome);
      const okRole  = role === 'todos' || u.role === role;
      const okAtivo = ativo === 'todos' || (ativo === 'ativo' ? u.ativo : !u.ativo);
      return okNome && okRole && okAtivo;
    });
  });

  readonly resumo = computed(() => {
    const todos = this.userService.usuarios();
    return {
      total:          todos.length,
      ativos:         todos.filter((u) => u.ativo).length,
      administradores: todos.filter((u) => u.role === 'administrador').length,
      dentistas:      todos.filter((u) => u.role === 'dentista').length,
      recepcionistas: todos.filter((u) => u.role === 'recepcionista').length
    };
  });

  readonly usuarioDetalhe = computed(() => {
    const id = this.detalheId();
    return id ? this.userService.buscarPorId(id) : null;
  });

  // ─── Formulário ───────────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    nome:          ['', [Validators.required, Validators.minLength(3)]],
    usuario:       ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^\S+$/)]],
    senha:         ['', [Validators.required, Validators.minLength(4)]],
    role:          ['dentista' as UserRole, [Validators.required]],
    especialidade: [''],
    ativo:         [true]
  });

  readonly mostrarEspecialidade = computed(
    () => this.form.controls.role.value === 'dentista'
  );

  // ─── Ações de filtro ──────────────────────────────────────────────────
  onFiltroNome(v: string):  void { this.filtroNome.set(v); }
  onFiltroRole(v: string):  void { this.filtroRole.set(v as FiltroRole); }
  onFiltroAtivo(v: string): void { this.filtroAtivo.set(v as FiltroAtivo); }

  // ─── CRUD ─────────────────────────────────────────────────────────────
  salvar(): void {
    this.mensagem.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados = this.form.getRawValue();
    const idEditando = this.editandoId();

    if (this.userService.usuarioExiste(dados.usuario, idEditando ?? undefined)) {
      this.mensagem.set({ tipo: 'erro', texto: `O login "${dados.usuario}" já está em uso.` });
      return;
    }

    if (idEditando) {
      // Na edição, senha vazia = manter a atual
      const update: Partial<Omit<AppUser, 'id' | 'criadoEm'>> = {
        nome:          dados.nome,
        usuario:       dados.usuario,
        role:          dados.role,
        especialidade: dados.especialidade || undefined,
        ativo:         dados.ativo
      };
      if (dados.senha) update.senha = dados.senha;
      this.userService.atualizar(idEditando, update);
      this.mensagem.set({ tipo: 'sucesso', texto: 'Usuário atualizado com sucesso.' });
    } else {
      this.userService.criar({
        nome:          dados.nome,
        usuario:       dados.usuario,
        senha:         dados.senha,
        role:          dados.role,
        especialidade: dados.especialidade || undefined,
        ativo:         dados.ativo
      });
      this.mensagem.set({ tipo: 'sucesso', texto: 'Usuário cadastrado com sucesso.' });
    }

    this.cancelarEdicao();
  }

  editar(user: AppUser): void {
    this.editandoId.set(user.id);
    this.detalheId.set(null);
    this.mensagem.set(null);
    this.form.setValue({
      nome:          user.nome,
      usuario:       user.usuario,
      senha:         '',           // não exibe senha atual
      role:          user.role,
      especialidade: user.especialidade ?? '',
      ativo:         user.ativo
    });
    // Senha não obrigatória na edição
    this.form.controls.senha.setValidators([Validators.minLength(4)]);
    this.form.controls.senha.updateValueAndValidity();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.mostrarSenha.set(false);
    this.form.reset({ role: 'dentista', ativo: true });
    this.form.controls.senha.setValidators([Validators.required, Validators.minLength(4)]);
    this.form.controls.senha.updateValueAndValidity();
  }

  alternarAtivo(id: string): void {
    this.userService.alternarAtivo(id);
    this.mensagem.set({ tipo: 'sucesso', texto: 'Status do usuário atualizado.' });
  }

  excluir(user: AppUser): void {
    // Impede excluir o próprio usuário logado
    if (user.usuario === this.auth.currentUser()) {
      this.mensagem.set({ tipo: 'erro', texto: 'Você não pode excluir seu próprio usuário.' });
      return;
    }
    this.userService.excluir(user.id);
    if (this.editandoId() === user.id) this.cancelarEdicao();
    if (this.detalheId() === user.id) this.detalheId.set(null);
    this.mensagem.set({ tipo: 'sucesso', texto: 'Usuário removido.' });
  }

  abrirDetalhe(id: string): void {
    this.detalheId.set(this.detalheId() === id ? null : id);
  }

  fecharDetalhe(): void {
    this.detalheId.set(null);
  }

  // ─── Helpers de exibição ──────────────────────────────────────────────
  permissoesDoRole(role: UserRole): string[] {
    return ROLE_PERMISSIONS[role].map((p) => this.permissaoLabels[p]);
  }

  formatarData(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  }

  trackById(_: number, u: AppUser): string { return u.id; }
}
