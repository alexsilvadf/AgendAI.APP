# AgendAi — Agent Initialization File

## Visão Geral

**AgendAi** é uma aplicação web de agendamento clínico desenvolvida em **Angular 21** (standalone components). O sistema permite que clínicas gerenciem a agenda de profissionais de saúde, realizem agendamentos de consultas e cadastrem procedimentos clínicos.

---

## Stack Tecnológica

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Framework     | Angular 21.2 (standalone components) |
| Linguagem     | TypeScript 5.9                      |
| Estilização   | SCSS                                |
| Formulários   | Angular Reactive Forms              |
| Roteamento    | Angular Router (lazy loading)       |
| Testes        | Vitest 4                            |
| Formatação    | Prettier 3                          |
| Build         | Angular CLI / Vite                  |

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── app.ts                        # Componente raiz
│   ├── app.html                      # Template raiz
│   ├── app.scss                      # Estilos globais do componente raiz
│   ├── app.routes.ts                 # Definição de rotas (lazy loading)
│   ├── app.config.ts                 # Configuração da aplicação (providers)
│   │
│   ├── core/
│   │   ├── guards/
│   │   │   └── auth.guard.ts         # Guard de autenticação (CanActivateFn)
│   │   └── services/
│   │       └── auth.service.ts       # Serviço de autenticação via sessionStorage
│   │
│   └── features/
│       ├── auth/
│       │   ├── login/                # Tela de login
│       │   └── recuperar-senha/      # Tela de recuperação de senha
│       │
│       ├── agenda/                   # Visualização e gestão da agenda
│       │   ├── agenda.component.*
│       │   ├── agenda.types.ts       # Tipos: SlotStatus, AgendaSlot, DaySchedule, Professional
│       │   └── agenda-mock.data.ts   # Dados mock de profissionais e horários
│       │
│       ├── agendamento/              # Formulário de agendamento de consulta
│       │   ├── agendar-consulta.component.*
│       │   └── agendar-consulta.data.ts  # Mock de pacientes, procedimentos e horários
│       │
│       └── procedimentos/            # CRUD de procedimentos clínicos
│           └── procedimentos.component.*
│
├── index.html
├── main.ts
└── styles.scss                       # Estilos globais da aplicação
```

---

## Rotas

| Rota                | Componente                  | Protegida |
|---------------------|-----------------------------|-----------|
| `/`                 | Redireciona para `/login`   | Não       |
| `/login`            | `LoginComponent`            | Não       |
| `/recuperar-senha`  | `RecuperarSenhaComponent`   | Não       |
| `/agenda`           | `AgendaComponent`           | Sim       |
| `/agendar-consulta` | `AgendarConsultaComponent`  | Sim       |
| `/procedimentos`    | `ProcedimentosComponent`    | Sim       |
| `**`                | Redireciona para `/login`   | Não       |

Todas as rotas protegidas utilizam o `authGuard`.

---

## Módulos e Responsabilidades

### `core/services/auth.service.ts`
Gerencia a sessão do usuário via `sessionStorage`. Chaves utilizadas:
- `agendai_sessao` — flag de autenticação (`'1'`)
- `agendai_usuario` — nome do usuário logado

Métodos: `isAuthenticated()`, `login(usuario)`, `currentUser()`, `logout()`

> **Nota:** A validação de credenciais contra uma API ainda não está implementada (TODO no `LoginComponent`).

### `core/guards/auth.guard.ts`
`CanActivateFn` que redireciona para `/login` caso o usuário não esteja autenticado.

### `features/auth`
- **Login:** Formulário reativo com campos `usuario` e `senha` (mínimo 4 caracteres). Ao submeter, chama `AuthService.login()` e navega para `/agenda`.
- **Recuperar Senha:** Tela de recuperação de senha (fluxo a ser implementado).

### `features/agenda`
Visualização da agenda diária por profissional. Funcionalidades:
- Filtro por data (navegação por dia) e por profissional
- Slots com status: `livre`, `ocupado`, `indisponivel`
- Clique em slot livre → navega para `/agendar-consulta` com query params pré-preenchidos
- Clique em slot ocupado → abre modal com detalhes, opções de **cancelar** ou **remarcar** consulta
- Resumo de slots por status no topo

### `features/agendamento`
Formulário reativo para agendamento de consulta. Funcionalidades:
- Campos: profissional, paciente, data, horário, procedimento, valor
- Pré-preenchimento via query params vindos da agenda
- Validação de conflito de horário (por profissional e por paciente)
- Horários indisponíveis são desabilitados no select
- Ao escolher procedimento, o valor é preenchido automaticamente

### `features/procedimentos`
CRUD de procedimentos clínicos. Funcionalidades:
- Listagem com filtro por nome e status (`ativo` / `inativo`)
- Cadastro e edição via formulário reativo inline
- Exclusão e alternância de status
- Resumo: total, ativos e inativos

---

## Padrões e Convenções

- **Standalone Components** — sem NgModules; imports declarados diretamente no decorator `@Component`
- **Signals** — estado local gerenciado com `signal()` e `computed()` do Angular
- **Injeção de dependência** — via `inject()` (sem construtor explícito, exceto quando necessário)
- **Reactive Forms** — `FormBuilder.nonNullable` para garantir tipagem estrita
- **Lazy Loading** — todos os componentes de feature são carregados sob demanda via `loadComponent`
- **Dados mock** — toda a camada de dados é simulada localmente; não há integração com backend ainda

---

## Comandos Úteis

```bash
# Iniciar servidor de desenvolvimento
ng serve

# Build de produção
ng build

# Executar testes
ng test
```

---

## Estado Atual e Próximos Passos

- [ ] Integrar `AuthService` com API real de autenticação
- [ ] Substituir dados mock por chamadas HTTP (`HttpClient`)
- [ ] Implementar fluxo de recuperação de senha
- [ ] Adicionar testes unitários para serviços e componentes
- [ ] Implementar feedback visual de loading/erro nas operações assíncronas
