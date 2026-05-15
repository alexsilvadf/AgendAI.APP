export type SlotStatus = 'livre' | 'ocupado' | 'indisponivel';

export interface Professional {
  id: string;
  name: string;
  specialty: string;
}

export interface AgendaSlot {
  start: string;
  end: string;
  status: SlotStatus;
  patientName?: string;
  detail?: string;
}

export interface DaySchedule {
  date: string;
  professionalId: string;
  slots: AgendaSlot[];
}
