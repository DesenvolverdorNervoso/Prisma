export interface Label {
  id: string;
  name: string;
  color: string;
  entityType: 'candidate' | 'company' | 'person_client';
}

export const DEFAULT_LABELS: Label[] = [
  { id: 'l1', name: 'VIP', color: '#fef08a', entityType: 'candidate' }, // yellow
  { id: 'l2', name: 'Blacklist', color: '#fecaca', entityType: 'candidate' }, // red
  { id: 'l3', name: 'Parceiro', color: '#bbf7d0', entityType: 'company' }, // green
];