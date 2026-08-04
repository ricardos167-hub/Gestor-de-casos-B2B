import React, { useState } from 'react';
import { X, Plus, AlertCircle, FileText, Check, Tag, Sparkles } from 'lucide-react';
import { CaseRecord, CustomField, HierarchyPresetConfig } from '../types';
import { HierarchyButtonSelector } from './HierarchyButtonSelector';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCase: CaseRecord) => void;
  customFields: CustomField[];
  currentUserEmail: string;
  hierarchyConfig?: HierarchyPresetConfig | null;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customFields,
  currentUserEmail,
  hierarchyConfig,
}) => {
  // System required fields
  const [titulo, setTitulo] = useState('');
  const [estado, setEstado] = useState('Nuevo');
  const [prioridad, setPrioridad] = useState('Media');

  // Custom values state
  const [customValues, setCustomValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    customFields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initial[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        initial[field.id] = false;
      } else if (field.type === 'select' && field.options && field.options.length > 0) {
        initial[field.id] = field.options[0];
      } else {
        initial[field.id] = '';
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleCustomValueChange = (fieldId: string, value: any) => {
    setCustomValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  const handleTituloChange = (val: string) => {
    setTitulo(val);
    if (errors.titulo) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.titulo;
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!titulo.trim()) {
      newErrors.titulo = 'El título del caso es obligatorio.';
    }

    // Validate required custom fields (only non-system fields)
    customFields
      .filter((field) => !field.isSystem)
      .forEach((field) => {
        if (field.required) {
          const val = customValues[field.id];
          if (val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === '')) {
            newErrors[field.id] = `El campo "${field.label}" es obligatorio.`;
          }
        }
      });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Generate unique ID like CAS-1006
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const caseId = `CAS-${randomSuffix}`;

    const now = new Date().toISOString();

    const newCaseRecord: CaseRecord = {
      id: caseId,
      titulo: titulo.trim(),
      creadoPor: currentUserEmail,
      fechaCreacion: now,
      fechaActualizacion: now,
      estado,
      prioridad,
      customValues,
      comentarios: [],
      historial: [
        {
          id: `h-${Date.now()}`,
          timestamp: now,
          userEmail: currentUserEmail,
          action: `Caso registrado con estado inicial "${estado}" y prioridad "${prioridad}".`,
        },
      ],
    };

    onSave(newCaseRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 transform transition-all">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center border border-slate-700">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Registrar Nuevo Caso</h3>
              <p className="text-[11px] text-slate-300">Completa los datos del ticket para iniciar su gestión</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Datos Principales */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-700" />
              Información Básica del Caso
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Titulo */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título o Asunto del Caso <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ej: Problema con el sistema de facturación electrónica"
                  value={titulo}
                  onChange={(e) => handleTituloChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all ${
                    errors.titulo
                      ? 'border-rose-400 bg-rose-50/50 focus:ring-1 focus:ring-rose-200'
                      : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                  }`}
                />
                {errors.titulo && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    {errors.titulo}
                  </p>
                )}
              </div>

              {/* Agente creador (readonly badge) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registrado por (Agente Actual)
                </label>
                <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 truncate">
                  {currentUserEmail}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Inicial</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none bg-white"
                >
                  <option value="Nuevo">Nuevo</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="En Espera">En Espera</option>
                  <option value="Resuelto">Resuelto</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nivel de Prioridad</label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none bg-white"
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 2: Todos los campos del sistema y personalizados */}
          {(customFields.filter((f) => !f.isSystem).length > 0 || (hierarchyConfig && hierarchyConfig.tree && hierarchyConfig.tree.length > 0)) && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-slate-700" />
                Todos los Campos del Sistema y Personalizados
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Other Custom Fields + Hierarchy block, interleaved by position */}
                {(() => {
                  const hasHierarchy = Boolean(hierarchyConfig && hierarchyConfig.tree && hierarchyConfig.tree.length > 0);
                  // Default the hierarchy block before other fields until an admin
                  // explicitly repositions it via the Fields Config drag-and-drop.
                  const hierarchyOrder = hierarchyConfig?.order ?? -1;

                  type Row = { kind: 'field'; field: CustomField } | { kind: 'hierarchy' };

                  const fieldRows: Row[] = customFields
                    .filter((f) => !f.isSystem)
                    .filter((f) => {
                      if (!hierarchyConfig?.levels) return true;
                      const isHierarchyLevel = hierarchyConfig.levels.some(
                        (lvl) => lvl.toLowerCase().trim() === f.label.toLowerCase().trim()
                      );
                      return !isHierarchyLevel;
                    })
                    .map((field) => ({ kind: 'field', field }));

                  const rows: Row[] = [
                    ...fieldRows,
                    ...(hasHierarchy ? [{ kind: 'hierarchy' as const }] : []),
                  ].sort((a, b) => {
                    const orderA = a.kind === 'field' ? a.field.order : hierarchyOrder;
                    const orderB = b.kind === 'field' ? b.field.order : hierarchyOrder;
                    return orderA - orderB;
                  });

                  return rows.map((row) => {
                    if (row.kind === 'hierarchy') {
                      return (
                        <div key="__hierarchy__" className="md:col-span-2">
                          <HierarchyButtonSelector
                            config={hierarchyConfig!}
                            variant="clean"
                            onSelectFinalPreset={(selectedPath, titleSuggestion) => {
                              if (!titulo) {
                                setTitulo(titleSuggestion);
                              }
                              if (errors.titulo) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.titulo;
                                  return next;
                                });
                              }

                              // Auto-fill matching custom fields
                              if (hierarchyConfig!.levels && hierarchyConfig!.levels.length > 0) {
                                const newCustomVals = { ...customValues };
                                hierarchyConfig!.levels.forEach((lvlName, idx) => {
                                  if (selectedPath[idx]) {
                                    const matchedField = customFields.find(
                                      (f) => f.label.toLowerCase().trim() === lvlName.toLowerCase().trim()
                                    );
                                    if (matchedField) {
                                      newCustomVals[matchedField.id] = selectedPath[idx];
                                    }
                                  }
                                });
                                setCustomValues(newCustomVals);
                              }
                            }}
                          />
                        </div>
                      );
                    }

                    const field = row.field;
                    const val = customValues[field.id];
                    const fieldError = errors[field.id];

                    return (
                      <div
                        key={field.id}
                        className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                      >
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {field.label} {field.required && <span className="text-rose-600">*</span>}
                      </label>

                      {/* Text input */}
                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={val || ''}
                          onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none"
                        />
                      )}

                      {/* Textarea */}
                      {field.type === 'textarea' && (
                        <textarea
                          rows={3}
                          value={val || ''}
                          onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none resize-none"
                        />
                      )}

                      {/* Number */}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={val !== undefined ? val : ''}
                          onChange={(e) =>
                            handleCustomValueChange(field.id, e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none"
                        />
                      )}

                      {/* Select */}
                      {field.type === 'select' && (
                        <select
                          value={val || ''}
                          onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none bg-white"
                        >
                          <option value="">-- Seleccionar --</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Date */}
                      {field.type === 'date' && (
                        <input
                          type="date"
                          value={val || ''}
                          onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none"
                        />
                      )}

                      {/* Email */}
                      {field.type === 'email' && (
                        <input
                          type="email"
                          value={val || ''}
                          onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs outline-none"
                        />
                      )}

                      {/* Checkbox */}
                      {field.type === 'checkbox' && (
                        <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleCustomValueChange(field.id, e.target.checked)}
                            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                          />
                          <span className="text-xs text-slate-700 font-medium">Marcar como activado</span>
                        </label>
                      )}

                      {fieldError && (
                        <p className="text-rose-600 text-xs mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {fieldError}
                        </p>
                      )}
                    </div>
                  );
                });
              })()}
              </div>
            </div>
        )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Registrar Caso</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
