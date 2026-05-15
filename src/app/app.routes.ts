import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'recuperar-senha',
    loadComponent: () =>
      import('./features/auth/recuperar-senha/recuperar-senha.component').then(
        (m) => m.RecuperarSenhaComponent
      )
  },
  {
    path: 'agenda',
    loadComponent: () =>
      import('./features/agenda/agenda.component').then((m) => m.AgendaComponent),
    canActivate: [authGuard, permissionGuard('agenda:view')]
  },
  {
    path: 'agendar-consulta',
    loadComponent: () =>
      import('./features/agendamento/agendar-consulta.component').then(
        (m) => m.AgendarConsultaComponent
      ),
    canActivate: [authGuard, permissionGuard('agendamento:create')]
  },
  {
    path: 'pacientes',
    loadComponent: () =>
      import('./features/pacientes/pacientes.component').then((m) => m.PacientesComponent),
    canActivate: [authGuard, permissionGuard('pacientes:view')]
  },
  {
    path: 'pacientes/:id',
    loadComponent: () =>
      import('./features/pacientes/ficha-paciente.component').then((m) => m.FichaPacienteComponent),
    canActivate: [authGuard, permissionGuard('pacientes:view')]
  },
  {
    path: 'procedimentos',
    loadComponent: () =>
      import('./features/procedimentos/procedimentos.component').then(
        (m) => m.ProcedimentosComponent
      ),
    canActivate: [authGuard, permissionGuard('procedimentos:view')]
  },
  {
    path: 'atendimento',
    loadComponent: () =>
      import('./features/atendimento/atendimento.component').then(
        (m) => m.AtendimentoComponent
      ),
    canActivate: [authGuard, permissionGuard('atendimento:create')]
  },
  {
    path: 'financeiro',
    loadComponent: () =>
      import('./features/financeiro/financeiro.component').then(
        (m) => m.FinanceiroComponent
      ),
    canActivate: [authGuard, permissionGuard('financeiro:view')]
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
    canActivate: [authGuard, permissionGuard('usuarios:view')]
  },
  { path: '**', redirectTo: 'login' }
];
