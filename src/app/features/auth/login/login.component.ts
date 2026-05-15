import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import type { UserRole } from '../../../core/models/user.model';

// ─── Credenciais fixas (substituir por API futuramente) ───────────────────
const CREDENCIAIS: Record<string, { senha: string; role: UserRole }> = {
  'admin':       { senha: 'admin123', role: 'administrador' },
  'ana.martins': { senha: 'senha123', role: 'dentista'      },
  'bruno.costa': { senha: 'senha123', role: 'dentista'      },
  'carla':       { senha: 'senha123', role: 'recepcionista' },
  'carla.dias':  { senha: 'senha123', role: 'dentista'      },
  'joao':        { senha: 'senha123', role: 'recepcionista' },
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb   = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);

  readonly erroLogin = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    usuario: ['', [Validators.required]],
    senha:   ['', [Validators.required, Validators.minLength(4)]]
  });

  onSubmit(): void {
    this.erroLogin.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { usuario, senha } = this.form.getRawValue();
    const credencial = CREDENCIAIS[usuario];

    if (!credencial || credencial.senha !== senha) {
      this.erroLogin.set('Usuário ou senha inválidos. Verifique seus dados e tente novamente.');
      return;
    }

    this.auth.login(usuario, credencial.role);
    // Dentista vai direto para atendimento; demais roles para a agenda
    const destino = credencial.role === 'dentista' ? '/atendimento' : '/agenda';
    void this.router.navigate([destino]);
  }

  recuperarSenha(): void {
    void this.router.navigate(['/recuperar-senha']);
  }
}
