import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiUsuarioService } from './api-usuario.service';
import type { AppUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiUsuarioService);
  private readonly _usuarios = signal<AppUser[]>([]);

  readonly usuarios = this._usuarios.asReadonly();
  readonly ativos = computed(() => this._usuarios().filter((u) => u.ativo));

  carregar(): void {
    this.api.listar().subscribe({
      next: (items) =>
        this._usuarios.set(
          items.map((u) => ({
            id: u.id,
            nome: u.nome,
            usuario: u.usuario,
            senha: '',
            role: u.role,
            especialidade: u.especialidade,
            ativo: u.ativo,
            criadoEm: u.criadoEm
          }))
        )
    });
  }

  buscarPorId(id: string): AppUser | undefined {
    return this._usuarios().find((u) => u.id === id);
  }

  usuarioExiste(usuario: string, ignorarId?: string): boolean {
    const norm = usuario.trim().toLowerCase();
    return this._usuarios().some(
      (u) => u.usuario.toLowerCase() === norm && u.id !== ignorarId
    );
  }

  excluir(id: string): void {
    this._usuarios.update((list) => list.filter((u) => u.id !== id));
  }

  criar(dados: Omit<AppUser, 'id' | 'criadoEm'>): AppUser {
    const novo: AppUser = {
      ...dados,
      id: `local_${Date.now()}`,
      criadoEm: new Date().toISOString().slice(0, 10)
    };
    this._usuarios.update((list) => [...list, novo]);
    return novo;
  }

  atualizar(id: string, dados: Partial<Omit<AppUser, 'id' | 'criadoEm'>>): void {
    this._usuarios.update((list) =>
      list.map((u) => (u.id === id ? { ...u, ...dados } : u))
    );
  }

  alternarAtivo(id: string): void {
    this._usuarios.update((list) =>
      list.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u))
    );
  }
}
