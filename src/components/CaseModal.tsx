import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Clock, 
  MessageSquare, 
  User, 
  History, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Tag, 
  Calendar, 
  Building2, 
  Edit3
} from 'lucide-react';
import { CaseRecord, CustomField, CaseComment, HierarchyPresetConfig, FieldArea } from '../types';
import { HierarchyButtonSelector } from './HierarchyButtonSelector';
import { confirmTripleDelete } from '../utils/confirmDelete';
import { GENERAL_AREA_ID } from '../data/initialData';

interface CaseModalProps {
  caseRecord: CaseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedCase: CaseRecord) => void;
  onDelete: (caseId: string) => void;
  customFields: CustomField[];
  currentUserEmail: string;
  hierarchyConfig?: HierarchyPresetConfig | null;
  fieldAreas: FieldArea[];
}

export const CaseModal: React.FC<CaseModalProps> = ({
  caseRecord,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  customFields,
  currentUserEmail,
  hierarchyConfig,
  fieldAreas,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const isAdmin = currentUserEmail?.trim().toLowerCase() === 'ricardo.s167@gmail.com';

  // Base system fields are configurable (label, options) from Configurar Campos,
  // so their live label/options are read from customFields instead of being hardcoded.
  const tituloField = customFields.find((f) => f.id === 'titulo');
  const estadoField = customFields.find((f) => f.id === 'estado');
  const prioridadField = customFields.find((f) => f.id === 'prioridad');

  const estadoOptions = estadoField?.options && estadoField.options.length > 0
    ? estadoField.options
    : ['Nuevo', 'En Proceso', 'En Espera', 'Resuelto', 'Cerrado'];
  const prioridadOptions = prioridadField?.options && prioridadField.options.length > 0
    ? prioridadField.options
    : ['Baja', 'Media', 'Alta', 'Crítica'];

  const sortedAreas = [...fieldAreas].sort((a, b) => a.order - b.order);
  const defaultAreaId = sortedAreas[0]?.id || GENERAL_AREA_ID;

  // Editable Form State
  const [titulo, setTitulo] = useState(caseRecord?.titulo ?? '');
  const [estado, setEstado] = useState(caseRecord?.estado ?? '');
  const [prioridad, setPrioridad] = useState(caseRecord?.prioridad ?? '');
  const [customValues, setCustomValues] = useState<Record<string, any>>({ ...caseRecord?.customValues });
  const [closeError, setCloseError] = useState<string | null>(null);

  // Comment input
  const [newComment, setNewComment] = useState('');

  if (!isOpen || !caseRecord) return null;

  // While editing and the selected (not-yet-saved) Estado is "Cerrado", fields
  // marked "requiredToClose" must be filled — they were allowed to stay empty
  // up to now, but the case can't move to Cerrado until they're completed.
  const isClosing = isEditing && estado.trim().toLowerCase() === 'cerrado';
  const isEmptyValue = (val: any) => val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === '');
  const tituloBlocksClose = isClosing && tituloField?.requiredToClose && isEmptyValue(titulo);

  const handleCustomChange = (fieldId: string, value: any) => {
    setCustomValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    if (closeError) setCloseError(null);
  };

  const handleSaveEdits = () => {
    if (isClosing) {
      const missingLabels: string[] = [];
      if (tituloBlocksClose) missingLabels.push(tituloField?.label || 'Título');
      customFields
        .filter((f) => !f.isSystem && f.requiredToClose && isEmptyValue(customValues[f.id]))
        .forEach((f) => missingLabels.push(f.label));

      if (missingLabels.length > 0) {
        setCloseError(`Completa estos campos obligatorios antes de cerrar el caso: ${missingLabels.join(', ')}.`);
        return;
      }
    }
    setCloseError(null);

    const now = new Date().toISOString();
    const updatedHistory = [
      ...(caseRecord.historial || []),
      {
        id: `h-${Date.now()}`,
        timestamp: now,
        userEmail: currentUserEmail,
        action: `Información modificada por ${currentUserEmail}.`,
      },
    ];

    const updatedCase: CaseRecord = {
      ...caseRecord,
      titulo,
      estado,
      prioridad,
      customValues,
      fechaActualizacion: now,
      historial: updatedHistory,
    };

    onUpdate(updatedCase);
    setIsEditing(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const now = new Date().toISOString();
    const commentObj: CaseComment = {
      id: `c-${Date.now()}`,
      authorEmail: currentUserEmail,
      text: newComment.trim(),
      createdAt: now,
    };

    const updatedComments = [...(caseRecord.comentarios || []), commentObj];
    const updatedHistory = [
      ...(caseRecord.historial || []),
      {
        id: `h-${Date.now()}`,
        timestamp: now,
        userEmail: currentUserEmail,
        action: `Comentario agregado por ${currentUserEmail}.`,
      },
    ];

    const updatedCase: CaseRecord = {
      ...caseRecord,
      comentarios: updatedComments,
      historial: updatedHistory,
      fechaActualizacion: now,
    };

    onUpdate(updatedCase);
    setNewComment('');
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'Crítica':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Alta':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Media':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'Nuevo':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'En Proceso':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'En Espera':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Resuelto':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cerrado':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 transform transition-all">
        
        {/* Top Title Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
              {caseRecord.id}
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white line-clamp-1">
                {caseRecord.titulo}
              </h3>
              <p className="text-[11px] text-slate-300">
                Creado por {caseRecord.creadoPor} el {new Date(caseRecord.fechaCreacion).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Caso</span>
              </button>
            ) : (
              <button
                onClick={handleSaveEdits}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {closeError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 text-rose-700 text-xs font-medium">
            {closeError}
          </div>
        )}

        {/* Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500">{estadoField?.label || 'Estado'}:</span>
            {!isEditing ? (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(caseRecord.estado)}`}>
                {caseRecord.estado}
              </span>
            ) : (
              <select
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value);
                  if (closeError) setCloseError(null);
                }}
                className="px-2 py-1 rounded-md border border-slate-200 text-xs font-medium bg-white outline-none"
              >
                {estadoOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            <span className="font-semibold text-slate-500 ml-2">{prioridadField?.label || 'Prioridad'}:</span>
            {!isEditing ? (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getPriorityBadgeClass(caseRecord.prioridad)}`}>
                {caseRecord.prioridad}
              </span>
            ) : (
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-200 text-xs font-medium bg-white outline-none"
              >
                {prioridadOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>Última actualización: {new Date(caseRecord.fechaActualizacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-white gap-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-3 font-medium text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Detalles del Caso</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-2.5 px-3 font-medium text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comentarios ({caseRecord.comentarios?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3 font-medium text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial de Actividad</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-6">

              {/* System Main Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {tituloField?.label || 'Título del Caso'}
                    {tituloBlocksClose && (
                      <span className="text-rose-600 text-[10px] font-bold ml-1.5">● Obligatorio para cerrar</span>
                    )}
                  </label>
                  {!isEditing ? (
                    <div className="text-xs font-semibold text-slate-900 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80">
                      {caseRecord.titulo}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => {
                        setTitulo(e.target.value);
                        if (closeError) setCloseError(null);
                      }}
                      className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold outline-none focus:ring-1 ${
                        tituloBlocksClose
                          ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900 bg-white'
                      }`}
                    />
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Creado por (Agente)</label>
                  <div className="text-xs text-slate-600 bg-slate-100/70 p-2.5 rounded-lg border border-slate-200/80 font-mono">
                    {caseRecord.creadoPor}
                  </div>
                </div>
              </div>

              {/* Custom Dynamic Fields Display / Editing, agrupados por Área */}
              {(() => {
                const hasHierarchy = Boolean(
                  isEditing && hierarchyConfig && hierarchyConfig.tree && hierarchyConfig.tree.length > 0
                );
                const hierarchyAreaId = hierarchyConfig?.areaId || defaultAreaId;
                // Default the hierarchy block before other fields until an admin
                // explicitly repositions it via the Fields Config drag-and-drop.
                const hierarchyOrder = hierarchyConfig?.order ?? -1;

                type Row = { kind: 'field'; field: CustomField } | { kind: 'hierarchy' };

                const renderHierarchyRow = () => (
                  <div key="__hierarchy__" className="md:col-span-2">
                    <HierarchyButtonSelector
                      config={hierarchyConfig!}
                      variant="clean"
                      onSelectFinalPreset={(selectedPath, titleSuggestion) => {
                        setTitulo(titleSuggestion);
                        if (hierarchyConfig!.levels && hierarchyConfig!.levels.length > 0) {
                          const newCustomVals = { ...customValues };
                          hierarchyConfig!.levels.forEach((lvlName, idx) => {
                            if (selectedPath[idx]) {
                              const matchedField = customFields.find(
                                f => f.label.toLowerCase().trim() === lvlName.toLowerCase().trim()
                              );
                              if (matchedField) {
                                newCustomVals[matchedField.id] = selectedPath[idx];
                              }
                            }
                          });
                          setCustomValues(newCustomVals);
                        }
                      }}
                      compact
                    />
                  </div>
                );

                const renderFieldRow = (field: CustomField) => {
                  const value = isEditing ? customValues[field.id] : (caseRecord.customValues ? caseRecord.customValues[field.id] : '');
                  const blocksClose = isClosing && field.requiredToClose && isEmptyValue(value);

                  return (
                    <div
                      key={field.id}
                      className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                    >
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        {field.label}
                        {blocksClose && (
                          <span className="text-rose-600 text-[10px] font-bold ml-1.5">● Obligatorio para cerrar</span>
                        )}
                      </label>

                      {!isEditing ? (
                        <div className="text-xs text-slate-800 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 min-h-[38px] flex items-center">
                          {field.type === 'checkbox' ? (
                            <span className={`inline-flex items-center gap-1 font-medium ${value ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {value ? '✓ Sí / Activado' : '✗ No / Desactivado'}
                            </span>
                          ) : field.type === 'textarea' ? (
                            <p className="whitespace-pre-wrap">{value || <span className="text-slate-400 italic">Sin información</span>}</p>
                          ) : (
                            <span>{value !== undefined && value !== '' ? String(value) : <span className="text-slate-400 italic">Sin información</span>}</span>
                          )}
                        </div>
                      ) : (
                        <div>
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={value || ''}
                              onChange={(e) => handleCustomChange(field.id, e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs outline-none focus:ring-1 ${blocksClose ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900'}`}
                            />
                          )}

                          {field.type === 'textarea' && (
                            <textarea
                              rows={3}
                              value={value || ''}
                              onChange={(e) => handleCustomChange(field.id, e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs outline-none focus:ring-1 resize-none ${blocksClose ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900'}`}
                            />
                          )}

                          {field.type === 'number' && (
                            <input
                              type="number"
                              value={value !== undefined ? value : ''}
                              onChange={(e) => handleCustomChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full px-3 py-2 rounded-lg border text-xs outline-none focus:ring-1 ${blocksClose ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900'}`}
                            />
                          )}

                          {field.type === 'select' && (
                            <select
                              value={value || ''}
                              onChange={(e) => handleCustomChange(field.id, e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs outline-none focus:ring-1 bg-white ${blocksClose ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900'}`}
                            >
                              <option value="">-- Seleccionar --</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          )}

                          {field.type === 'date' && (
                            <input
                              type="date"
                              value={value || ''}
                              onChange={(e) => handleCustomChange(field.id, e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs outline-none focus:ring-1 ${blocksClose ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900'}`}
                            />
                          )}

                          {field.type === 'checkbox' && (
                            <label className="inline-flex items-center gap-2 mt-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
                                onChange={(e) => handleCustomChange(field.id, e.target.checked)}
                                className="w-4 h-4 rounded text-slate-900 border-slate-300"
                              />
                              <span className="text-xs text-slate-700">Activado</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  );
                };

                const areaGroups = sortedAreas
                  .map((area) => {
                    const fieldRows: Row[] = customFields
                      .filter((f) => !f.isSystem && !f.hidden)
                      .filter((f) => (f.areaId || defaultAreaId) === area.id)
                      .map((field) => ({ kind: 'field' as const, field }));

                    const rows: Row[] = [
                      ...fieldRows,
                      ...(hasHierarchy && hierarchyAreaId === area.id ? [{ kind: 'hierarchy' as const }] : []),
                    ].sort((a, b) => {
                      const orderA = a.kind === 'field' ? a.field.order : hierarchyOrder;
                      const orderB = b.kind === 'field' ? b.field.order : hierarchyOrder;
                      return orderA - orderB;
                    });

                    return { area, rows };
                  })
                  .filter(({ rows }) => rows.length > 0);

                return areaGroups.map(({ area, rows }) => (
                  <div key={area.id} className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      {area.label}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rows.map((row) => (row.kind === 'hierarchy' ? renderHierarchyRow() : renderFieldRow(row.field)))}
                    </div>
                  </div>
                ));
              })()}

            </div>
          )}

          {/* TAB 2: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              
              {/* Comment Thread List */}
              <div className="space-y-3">
                {(!caseRecord.comentarios || caseRecord.comentarios.length === 0) ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">No hay comentarios aún en este caso.</p>
                  </div>
                ) : (
                  caseRecord.comentarios.map((c) => (
                    <div key={c.id} className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-600" />
                          {c.authorEmail}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* New Comment Input Box */}
              <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder={`Agregar comentario como ${currentUserEmail}...`}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-900 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>

            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {(!caseRecord.historial || caseRecord.historial.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-6">Sin registros de cambios registrados.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-slate-300 space-y-4">
                  {caseRecord.historial.slice().reverse().map((log) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 ring-4 ring-white" />
                      <div className="text-xs font-medium text-slate-800">{log.action}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{log.userEmail}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {currentUserEmail?.trim().toLowerCase() === 'ricardo.s167@gmail.com' && (
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center">
            <button
              onClick={() => {
                if (confirmTripleDelete(`el caso ${caseRecord.id}`)) {
                  onDelete(caseRecord.id);
                  onClose();
                }
              }}
              className="text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Caso</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
