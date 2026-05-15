import { Injectable, signal, computed } from '@angular/core';
import type { AppUser } from '../models/user.model';

const STORAGE_KEY    = 'agendai_usuarios';
const SCHEMA_VERSION = 'v2'; // incrementar aqui força reset do localStorage
const VERSION_KEY    = 'agendai_usuarios_version';

// ─── Usuários iniciais (mock) ──────────────────────────────────────────────
export const USUARIOS_INICIAIS: AppUser[] = [
  {
    id: 'u1',
    nome: 'Admin Sistema',
    usuario: 'admin',
    senha: 'admin123',
    role: 'administrador',
    ativo: true,
    criadoEm: '2025-01-01'
  },
  {
    id: 'u2',
    nome: 'Dra. Ana Martins',
    usuario: 'ana.martins',
    senha: 'senha123',
    role: 'dentista',
    especialidade: 'Clínica geral',
    ativo: true,
    criadoEm: '2025-01-10'
  },
  {
    id: 'u3',
    nome: 'Dr. Bruno Costa',
    usuario: 'bruno.costa',
    senha: 'senha123',
    role: 'dentista',
    especialidade: 'Cardiologia',
    ativo: true,
    criadoEm: '2025-01-10'
  },
  {
    id: 'u4',
    nome: 'Carla Recepção',
    usuario: 'carla',
    senha: 'senha123',
    role: 'recepcionista',
    ativo: true,
    criadoEm: '2025-02-01'
  },
  {
    id: 'u5',
    nome: 'Dra. Carla Dias',
    usuario: 'carla.dias',
    senha: 'senha123',
    role: 'dentista',
    especialidade: 'Dermatologia',
    ativo: false,
    criadoEm: '2025-03-15'
  }
];

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _usuarios = signal<AppUser[]>(this.loadFromStorage());

  readonly usuarios = this._usuarios.asReadonly();
  readonly ativos   = computed(() => this._usuarios().filter((u) => u.ativo));

  // ─── Persistência ──────────────────────────────────────────────────────
  private loadFromStorage(): AppUser[] {
    try {
      // Se a versão do schema mudou, descarta dados antigos
      if (localStorage.getItem(VERSION_KEY) !== SCHEMA_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
        return USUARIOS_INICIAIS;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return USUARIOS_INICIAIS;

      const parsed = JSON.parse(raw) as AppUser[];

      // Valida que é um array com pelo menos os campos obrigatórios
      if (!Array.isArray(parsed) || parsed.length === 0) return USUARIOS_INICIAIS;

      // Garante que os usuários mock sempre existam (merge por id)
      const ids = new Set(parsed.map((u) => u.id));
      const faltando = USUARIOS_INICIAIS.filter((u) => !ids.has(u.id));
      return faltando.length > 0 ? [...parsed, ...faltando] : parsed;

    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return USUARIOS_INICIAIS;
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._usuarios()));
    localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
  }

  // ─── Autenticação ──────────────────────────────────────────────────────
  autenticar(usuario: string, senha: string): AppUser | null {
    return (
      this._usuarios().find(
        (u) => u.usuario === usuario && u.senha === senha && u.ativo
      ) ?? null
    );
  }

  buscarPorUsuario(usuario: string): AppUser | undefined {
    return this._usuarios().find((u) => u.usuario === usuario);
  }

  buscarPorId(id: string): AppUser | undefined {
    return this._usuarios().find((u) => u.id === id);
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────
  criar(dados: Omit<AppUser, 'id' | 'criadoEm'>): AppUser {
    const novo: AppUser = {
      ...dados,
      id: `u${Date.now()}`,
      criadoEm: new Date().toISOString().slice(0, 10)
    };
    this._usuarios.update((list) => [...list, novo]);
    this.persist();
    return novo;
  }

  atualizar(id: string, dados: Partial<Omit<AppUser, 'id' | 'criadoEm'>>): void {
    this._usuarios.update((list) =>
      list.map((u) => (u.id === id ? { ...u, ...dados } : u))
    );
    this.persist();
  }

  alternarAtivo(id: string): void {
    this._usuarios.update((list) =>
      list.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u))
    );
    this.persist();
  }

  excluir(id: string): void {
    this._usuarios.update((list) => list.filter((u) => u.id !== id));
    this.persist();
  }

  usuarioExiste(usuario: string, ignorarId?: string): boolean {
    return this._usuarios().some(
      (u) => u.usuario === usuario && u.id !== ignorarId
    );
  }
}
