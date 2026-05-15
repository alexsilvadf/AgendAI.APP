import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PacienteService } from '../../core/services/paciente.service';
import {
  ESTADO_CIVIL_LABELS,
  SEXO_LABELS,
} from '../../core/models/paciente.model';

@Component({
  selector: 'app-ficha-paciente',
  imports: [],
  templateUrl: './ficha-paciente.component.html',
  styleUrl: './ficha-paciente.component.scss'
})
export class FichaPacienteComponent {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly service = inject(PacienteService);

  readonly sexoLabels        = SEXO_LABELS;
  readonly estadoCivilLabels = ESTADO_CIVIL_LABELS;

  readonly paciente = computed(() => {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    return this.service.buscarPorId(id) ?? null;
  });

  voltar(): void {
    void this.router.navigate(['/pacientes']);
  }

  editar(): void {
    void this.router.navigate(['/pacientes'], {
      queryParams: { editar: this.paciente()?.id }
    });
  }

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

  formatarMoeda(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  sim(v: boolean): string { return v ? 'Sim' : 'Não'; }
}
