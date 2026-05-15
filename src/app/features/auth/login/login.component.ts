import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiAuthService } from '../../../core/services/api-auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb   = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly apiAuth = inject(ApiAuthService);

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

    this.apiAuth.login(usuario, senha).subscribe({
      next: (res) => {
        const destino = res.role === 'dentista' ? '/atendimento' : '/agenda';
        void this.router.navigate([destino]);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 0) {
          this.erroLogin.set(
            'Não foi possível conectar à API. Confirme se o backend está rodando na porta 5137 e reinicie o frontend com npm start.'
          );
        } else if (err.status === 401) {
          this.erroLogin.set('Usuário ou senha inválidos. Verifique seus dados e tente novamente.');
        } else {
          this.erroLogin.set(`Erro ao autenticar (${err.status}). Tente novamente em instantes.`);
        }
      }
    });
  }

  recuperarSenha(): void {
    void this.router.navigate(['/recuperar-senha']);
  }
}
