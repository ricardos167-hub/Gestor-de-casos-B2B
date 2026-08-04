export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'email';

export interface CustomField {
  id: string; // unique identifier key
  label: string; // display name
  type: FieldType;
  options?: string[]; // options for 'select' type
  defaultValue?: any;
  required?: boolean;
  showInTable?: boolean;
  isSystem?: boolean; // system fields cannot be deleted
  hidden?: boolean; // hidden fields are skipped (and never required) in the case creation form
  order: number;
}

export interface CaseComment {
  id: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

export interface CaseHistoryLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
}

export interface CaseRecord {
  id: string; // e.g., "CAS-1001"
  titulo: string;
  solicitanteEmail?: string;
  creadoPor: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  estado: string; // e.g. "Nuevo", "En Proceso", "En Espera", "Resuelto", "Cerrado"
  prioridad: string; // e.g. "Baja", "Media", "Alta", "Crítica"
  comentarios?: CaseComment[];
  historial?: CaseHistoryLog[];
  // Dynamic fields storage: key is customField.id -> value
  customValues: Record<string, any>;
}

export interface FilterConfig {
  searchQuery: string;
  estado: string;
  prioridad: string;
  solicitante: string;
  customFilters: Record<string, string>;
}

export interface SortConfig {
  fieldId: string; // system field or customField.id
  direction: 'asc' | 'desc';
}

export interface AppSettings {
  appTitle: string;
  appSubtitle: string;
}

export interface HierarchyNode {
  id: string;
  name: string;
  children?: HierarchyNode[];
  // Optional preset field values if applicable
  presetValues?: Record<string, any>;
}

export interface HierarchyPresetConfig {
  levels: string[]; // Column names e.g. ["Categoría", "Subcategoría", "Tipo de Solicitud"]
  tree: HierarchyNode[];
  updatedAt?: string;
  order?: number; // Position of the hierarchy button block among the other custom fields
}
