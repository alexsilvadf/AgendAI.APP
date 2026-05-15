import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import {
  ApiAtendimentoService,
  type AtendimentoApi,
  type CriarAtendimentoApiRequest
} from './api-atendimento.service';

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'cartao_credito_parcelado'
  | 'convenio';

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Cartão de crédito (à vista)' },
  { value: 'cartao_credito_parcelado', label: 'Cartão de crédito (parcelado)' },
  { value: 'convenio', label: 'Convênio / Plano de saúde' }
];

export interface AtendimentoConcluido {
  id: string;
  professionalId: string;
  profissional: string;
  paciente: string;
  procedimento: string;
  data: string;
  hora: string;
  valor: number;
  observacoes: string;
  dentes: string;
  retorno: boolean;
  pago: boolean;
  formaPagamento?: FormaPagamento;
  parcelas?: number;
  agendamentoId?: string;
}

@Injectable({ providedIn: 'root' })
export class AtendimentoService {
  private readonly api = inject(ApiAtendimentoService);
  private readonly _atendimentos = signal<AtendimentoConcluido[]>([]);

  readonly atendimentos = this._atendimentos.asReadonly();
  readonly pendentes = computed(() => this._atendimentos().filter((a) => !a.pago));
  readonly totalPendentes = computed(() => this.pendentes().length);

  static slotKey(professionalId: string, data: string, hora: string): string {
    return `${professionalId}_${data}_${hora}`;
  }

  static fromApi(api: AtendimentoApi): AtendimentoConcluido {
    return {
      id: api.id,
      professionalId: api.professionalId,
      profissional: api.profissional,
      paciente: api.paciente,
      procedimento: api.procedimento,
      data: api.data,
      hora: api.hora,
      valor: api.valor,
      observacoes: api.observacoes,
      dentes: api.dentes,
      retorno: api.retorno,
      pago: api.pago,
      formaPagamento: api.formaPagamento,
      parcelas: api.parcelas,
      agendamentoId: api.agendamentoId
    };
  }

  carregar(filtros?: { data?: string; profissionalId?: string; pago?: boolean }): void {
    this.api.listar(filtros).subscribe({
      next: (items) => this._atendimentos.set(items.map(AtendimentoService.fromApi))
    });
  }

  registrar(dados: CriarAtendimentoApiRequest): void {
    this.api.criar(dados).subscribe({
      next: (criado) => {
        const item = AtendimentoService.fromApi(criado);
        this._atendimentos.update((list) => [...list.filter((a) => a.id !== item.id), item]);
      }
    });
  }

  registrarPagamento(id: string, formaPagamento: FormaPagamento, parcelas?: number): void {
    this.api
      .registrarPagamento(id, formaPagamento, parcelas)
      .pipe(
        tap((atualizado) => {
          const item = AtendimentoService.fromApi(atualizado);
          this._atendimentos.update((list) =>
            list.map((a) => (a.id === item.id ? item : a))
          );
        })
      )
      .subscribe();
  }

  buscarPorSlot(professionalId: string, data: string, hora: string): AtendimentoConcluido | undefined {
    const key = AtendimentoService.slotKey(professionalId, data, hora);
    return this._atendimentos().find(
      (a) => AtendimentoService.slotKey(a.professionalId, a.data, a.hora) === key
    );
  }

  /** Recarrega atendimentos da API (substitui sincronizar do localStorage). */
  sincronizar(filtros?: { data?: string; profissionalId?: string }): void {
    this.carregar(filtros);
  }
}
