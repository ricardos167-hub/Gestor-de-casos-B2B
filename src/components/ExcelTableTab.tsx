import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  SlidersHorizontal, 
  Check, 
  X, 
  Trash2, 
  CheckSquare,
  Square, 
  FileSpreadsheet, 
  Search, 
  Plus,
  RefreshCw,
  Edit2,
  GripVertical
} from 'lucide-react';
import { CaseRecord, CustomField, SortConfig } from '../types';
import { confirmTripleDelete } from '../utils/confirmDelete';

interface ExcelTableTabProps {
  cases: CaseRecord[];
  customFields: CustomField[];
  onUpdateCase: (updatedCase: CaseRecord) => void;
  onSelectCase: (caseRecord: CaseRecord) => void;
  onOpenNewCaseModal: () => void;
  onDeleteCases: (caseIds: string[]) => void;
  onReorderFields?: (newFields: CustomField[]) => void;
  currentUserEmail: string;
}

export const ExcelTableTab: React.FC<ExcelTableTabProps> = ({
  cases,
  customFields,
  onUpdateCase,
  onSelectCase,
  onOpenNewCaseModal,
  onDeleteCases,
  onReorderFields,
  currentUserEmail,
}) => {
  // Editing state: { caseId, fieldId } or null
  const [editingCell, setEditingCell] = useState<{ caseId: string; fieldId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');

  // Column Filters state: map of fieldId -> filter text
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilterBar, setShowFilterBar] = useState(true);

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ fieldId: 'fechaCreacion', direction: 'desc' });

  // Column Visibility: array of field IDs that are currently visible
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() => {
    return customFields.filter((f) => f.showInTable !== false).map((f) => f.id);
  });

  // Keep visible columns synchronized with customFields when fields load or change
  React.useEffect(() => {
    if (customFields && customFields.length > 0) {
      setVisibleColumnIds((prev) => {
        if (prev.length === 0) {
          return customFields.filter((f) => f.showInTable !== false).map((f) => f.id);
        }
        const prevSet = new Set(prev);
        const validIds = new Set(customFields.map((f) => f.id));
        const updated = prev.filter((id) => validIds.has(id));
        customFields.forEach((f) => {
          if (!prevSet.has(f.id) && f.showInTable !== false && !updated.includes(f.id)) {
            updated.push(f.id);
          }
        });
        return updated.length > 0 ? updated : customFields.filter((f) => f.showInTable !== false).map((f) => f.id);
      });
    }
  }, [customFields]);

  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Column Drag & Drop State
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const handleDragStartCol = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCol = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDropCol = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const sourceColId = draggedColId || e.dataTransfer.getData('text/plain');
    setDraggedColId(null);
    setDragOverColId(null);

    if (!sourceColId || sourceColId === targetColId) return;

    const fieldsCopy = [...customFields];
    const sourceIdx = fieldsCopy.findIndex((f) => f.id === sourceColId);
    const targetIdx = fieldsCopy.findIndex((f) => f.id === targetColId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const [moved] = fieldsCopy.splice(sourceIdx, 1);
      fieldsCopy.splice(targetIdx, 0, moved);

      const reordered = fieldsCopy.map((f, idx) => ({
        ...f,
        order: idx + 1,
      }));

      if (onReorderFields) {
        onReorderFields(reordered);
      }
    }
  };

  // Bulk Selection
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // Toggle selection for single case
  const toggleSelectCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const toggleSelectAll = (filteredIds: string[]) => {
    if (selectedCaseIds.length === filteredIds.length && filteredIds.length > 0) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(filteredIds);
    }
  };

  // All available columns (derived directly from customFields so system + custom labels/order are unified)
  // Hidden fields are excluded entirely from the table, regardless of showInTable/visibleColumnIds.
  const allColumns = useMemo(() => {
    return customFields.filter((f) => !f.hidden);
  }, [customFields]);

  // Handle Sort Toggle
  const handleSort = (fieldId: string) => {
    setSortConfig((prev) => {
      if (prev?.fieldId === fieldId) {
        if (prev.direction === 'asc') return { fieldId, direction: 'desc' };
        return null;
      }
      return { fieldId, direction: 'asc' };
    });
  };

  // Filtered and Sorted cases
  const processedCases = useMemo(() => {
    let result = [...cases];

    // Apply column filters
    Object.entries(columnFilters).forEach(([fieldId, filterText]) => {
      const filterStr = String(filterText || '');
      if (!filterStr.trim()) return;
      const lower = filterStr.toLowerCase().trim();

      result = result.filter((c) => {
        let val: any = '';
        if (['id', 'titulo', 'solicitanteEmail', 'estado', 'prioridad', 'creadoPor', 'fechaCreacion'].includes(fieldId)) {
          val = (c as any)[fieldId];
        } else {
          val = c.customValues[fieldId];
        }

        if (val === undefined || val === null) return false;
        if (typeof val === 'boolean') {
          if ('sí'.includes(lower) || 'si'.includes(lower) || 'true'.includes(lower) || 'activado'.includes(lower)) return val;
          if ('no'.includes(lower) || 'false'.includes(lower)) return !val;
        }
        return String(val).toLowerCase().includes(lower);
      });
    });

    // Apply Sorting
    if (sortConfig) {
      const { fieldId, direction } = sortConfig;
      result.sort((a, b) => {
        let valA: any = ['id', 'titulo', 'solicitanteEmail', 'estado', 'prioridad', 'creadoPor', 'fechaCreacion'].includes(fieldId)
          ? (a as any)[fieldId]
          : a.customValues[fieldId];
        let valB: any = ['id', 'titulo', 'solicitanteEmail', 'estado', 'prioridad', 'creadoPor', 'fechaCreacion'].includes(fieldId)
          ? (b as any)[fieldId]
          : b.customValues[fieldId];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [cases, columnFilters, sortConfig]);

  // Drop any selected ids that are no longer visible after a filter change,
  // so the "select all" checkbox and bulk actions never act on hidden rows.
  useEffect(() => {
    setSelectedCaseIds((prev) => {
      const visibleIds = new Set(processedCases.map((c) => c.id));
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [processedCases]);

  // Start Cell Editing — only "estado" is editable directly from the table;
  // every other cell click opens the full case detail instead.
  const startEditing = (caseRecord: CaseRecord, fieldId: string) => {
    if (fieldId !== 'estado') return;

    setEditingCell({ caseId: caseRecord.id, fieldId });
    setEditValue(caseRecord.estado !== undefined ? caseRecord.estado : '');
  };

  // Save Cell Edit
  const saveCellEdit = (caseRecord: CaseRecord, fieldId: string, newValue: any) => {
    const now = new Date().toISOString();
    let updated: CaseRecord = { ...caseRecord, fechaActualizacion: now };

    if (['titulo', 'estado', 'prioridad'].includes(fieldId)) {
      (updated as any)[fieldId] = newValue;
    } else {
      updated.customValues = {
        ...updated.customValues,
        [fieldId]: newValue,
      };
    }

    // Add log entry
    updated.historial = [
      ...(updated.historial || []),
      {
        id: `h-${Date.now()}`,
        timestamp: now,
        userEmail: currentUserEmail,
        action: `Campo "${fieldId}" actualizado en celda por ${currentUserEmail}.`,
      },
    ];

    onUpdateCase(updated);
    setEditingCell(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = visibleColumnIds.map((id) => {
      const col = allColumns.find((c) => c.id === id);
      return `"${col ? col.label : id}"`;
    });

    const rows = processedCases.map((c) => {
      return visibleColumnIds
        .map((id) => {
          let val: any = '';
          if (['id', 'titulo', 'estado', 'prioridad', 'creadoPor', 'fechaCreacion'].includes(id)) {
            val = (c as any)[id];
          } else {
            val = c.customValues[id];
          }
          if (val === undefined || val === null) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `casos_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Status Update
  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedCaseIds.length === 0) return;
    selectedCaseIds.forEach((id) => {
      const c = cases.find((item) => item.id === id);
      if (c) {
        saveCellEdit(c, 'estado', newStatus);
      }
    });
    setSelectedCaseIds([]);
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'Crítica':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'Alta':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Media':
        return 'bg-slate-100 text-slate-700 border-slate-200/80';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200/80';
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'Nuevo':
        return 'bg-sky-50 text-sky-700 border-sky-200/80';
      case 'En Proceso':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'En Espera':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Resuelto':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'Cerrado':
        return 'bg-slate-100 text-slate-700 border-slate-200/80';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200/80';
    }
  };

  // Filtered visible columns
  const activeColumns = allColumns.filter((col) => visibleColumnIds.includes(col.id));

  // Compute total sum for numeric fields (e.g. monto_estimado)
  const numericSum = useMemo(() => {
    let sum = 0;
    processedCases.forEach((c) => {
      const val = Number(c.customValues.monto_estimado || 0);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  }, [processedCases]);

  return (
    <div className="space-y-4">
      
      {/* Excel Table Utility Controls */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Count & Filters Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
            <FileSpreadsheet className="w-4 h-4 text-slate-700" />
            <span>Mostrando {processedCases.length} de {cases.length} casos</span>
          </div>

          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
              showFilterBar
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showFilterBar ? 'Ocultar Filtros' : 'Filtros por Columna'}</span>
          </button>

          {Object.keys(columnFilters).some((k) => columnFilters[k]) && (
            <button
              onClick={() => setColumnFilters({})}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        {/* Right Side: Bulk actions, Column Picker, CSV Export */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Bulk actions menu when rows selected */}
          {selectedCaseIds.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs">
              <span className="font-semibold text-slate-900">{selectedCaseIds.length} sel.</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkStatusChange(e.target.value);
                  e.target.value = '';
                }}
                className="bg-white border border-slate-200 text-slate-800 rounded px-2 py-0.5 text-xs font-medium outline-none"
              >
                <option value="">Cambiar Estado...</option>
                <option value="Nuevo">Nuevo</option>
                <option value="En Proceso">En Proceso</option>
                <option value="En Espera">En Espera</option>
                <option value="Resuelto">Resuelto</option>
                <option value="Cerrado">Cerrado</option>
              </select>

              {currentUserEmail?.trim().toLowerCase() === 'ricardo.s167@gmail.com' && (
                <button
                  onClick={() => {
                    if (confirmTripleDelete(`los ${selectedCaseIds.length} casos seleccionados`)) {
                      onDeleteCases(selectedCaseIds);
                      setSelectedCaseIds([]);
                    }
                  }}
                  className="text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          )}

          {/* Column Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Columnas ({activeColumns.length})</span>
            </button>

            {/* Column Picker Dropdown */}
            {showColumnPicker && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-40 p-4 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Visibilidad de Columnas</span>
                  <button onClick={() => setShowColumnPicker(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {allColumns.map((col) => {
                    const isChecked = visibleColumnIds.includes(col.id);
                    return (
                      <label key={col.id} className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (visibleColumnIds.length > 2) {
                                setVisibleColumnIds((prev) => prev.filter((i) => i !== col.id));
                              }
                            } else {
                              setVisibleColumnIds((prev) => [...prev, col.id]);
                            }
                          }}
                          className="rounded text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-medium">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main Excel Table View */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[68vh] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Table Header */}
            <thead className="bg-slate-50 sticky top-0 z-20 shadow-2xs border-b border-slate-200">
              <tr>
                {/* Row Checkbox Header */}
                <th className="w-10 px-3 py-2.5 text-center border-r border-slate-200">
                  <button
                    onClick={() => toggleSelectAll(processedCases.map((c) => c.id))}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {selectedCaseIds.length === processedCases.length && processedCases.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-slate-900" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {/* Dynamic Columns */}
                {activeColumns.map((col) => {
                  const isSorted = sortConfig?.fieldId === col.id;
                  const isDragging = draggedColId === col.id;
                  const isOver = dragOverColId === col.id;

                  return (
                    <th
                      key={col.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStartCol(e, col.id)}
                      onDragOver={(e) => handleDragOverCol(e, col.id)}
                      onDrop={(e) => handleDropCol(e, col.id)}
                      onDragEnd={() => {
                        setDraggedColId(null);
                        setDragOverColId(null);
                      }}
                      className={`px-3 py-2.5 border-r border-slate-200 font-semibold text-slate-700 select-none whitespace-nowrap min-w-[140px] transition-all cursor-grab active:cursor-grabbing ${
                        isDragging ? 'opacity-30 bg-slate-200 border-2 border-dashed border-slate-400' : 'hover:bg-slate-100/80'
                      } ${isOver ? 'bg-amber-100 border-l-4 border-l-amber-600 shadow-inner' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <button
                            onClick={() => handleSort(col.id)}
                            className="flex items-center gap-1.5 hover:text-slate-900 cursor-pointer transition-colors"
                          >
                            <span>{col.label}</span>
                            {isSorted ? (
                              sortConfig?.direction === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Filter Row Input */}
                      {showFilterBar && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            placeholder="Filtrar..."
                            value={columnFilters[col.id] || ''}
                            onChange={(e) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [col.id]: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1 rounded border border-slate-200 font-normal text-[11px] bg-white outline-none focus:border-slate-900"
                          />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 bg-white">
              {processedCases.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="text-center py-12 text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium">No se encontraron casos con los filtros aplicados.</p>
                  </td>
                </tr>
              ) : (
                processedCases.map((c) => {
                  const isSelected = selectedCaseIds.includes(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-slate-100/70' : ''
                      }`}
                    >
                      {/* Checkbox Cell */}
                      <td className="px-3 py-2 text-center border-r border-slate-100">
                        <button
                          onClick={() => toggleSelectCase(c.id)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-slate-900" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Active Columns Cells */}
                      {activeColumns.map((col) => {
                        const isEditingThisCell =
                          editingCell?.caseId === c.id && editingCell?.fieldId === col.id;

                        let rawValue: any = ['id', 'titulo', 'solicitanteEmail', 'estado', 'prioridad', 'creadoPor', 'fechaCreacion'].includes(col.id)
                          ? (c as any)[col.id]
                          : c.customValues[col.id];

                        return (
                          <td
                            key={col.id}
                            onClick={() => {
                              if (isEditingThisCell) return;
                              if (col.id === 'estado') {
                                startEditing(c, 'estado');
                              } else {
                                onSelectCase(c);
                              }
                            }}
                            title={col.id === 'estado' ? 'Clic para cambiar el estado' : 'Clic para abrir el detalle del caso'}
                            className="px-3 py-2 border-r border-slate-100 relative group cursor-pointer hover:bg-slate-100/50"
                          >
                            {/* Inline Editing Mode */}
                            {isEditingThisCell ? (
                              <div className="flex items-center gap-1 bg-white border-2 border-slate-900 rounded p-0.5 shadow-2xs">
                                {col.type === 'select' ? (
                                  <select
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveCellEdit(c, col.id, editValue)}
                                    className="w-full text-xs outline-none bg-white font-medium"
                                  >
                                    {col.options?.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : col.type === 'checkbox' ? (
                                  <input
                                    type="checkbox"
                                    autoFocus
                                    checked={Boolean(editValue)}
                                    onChange={(e) => {
                                      setEditValue(e.target.checked);
                                      saveCellEdit(c, col.id, e.target.checked);
                                    }}
                                  />
                                ) : col.type === 'date' ? (
                                  <input
                                    type="date"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveCellEdit(c, col.id, editValue)}
                                    className="w-full text-xs outline-none"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveCellEdit(c, col.id, editValue);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    onBlur={() => saveCellEdit(c, col.id, editValue)}
                                    className="w-full text-xs outline-none"
                                  />
                                )}
                                <button
                                  onClick={() => saveCellEdit(c, col.id, editValue)}
                                  className="text-emerald-700 hover:text-emerald-800 p-0.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              /* Standard Render Mode */
                              <div className="flex items-center justify-between gap-1 min-h-[22px]">
                                {col.id === 'id' ? (
                                  <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {rawValue}
                                  </span>
                                ) : col.id === 'estado' ? (
                                  <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] border ${getStatusBadgeClass(rawValue)}`}>
                                    {rawValue}
                                  </span>
                                ) : col.id === 'prioridad' ? (
                                  <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] border ${getPriorityBadgeClass(rawValue)}`}>
                                    {rawValue}
                                  </span>
                                ) : col.type === 'checkbox' ? (
                                  <span className={`font-semibold ${rawValue ? 'text-emerald-700' : 'text-slate-300'}`}>
                                    {rawValue ? '✓ Sí' : '—'}
                                  </span>
                                ) : col.id === 'fechaCreacion' ? (
                                  <span className="text-slate-500 font-mono text-[11px]">
                                    {new Date(rawValue).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="truncate max-w-[200px] font-medium text-slate-800" title={String(rawValue || '')}>
                                    {rawValue !== undefined && rawValue !== null && rawValue !== '' ? (
                                      String(rawValue)
                                    ) : (
                                      <span className="text-slate-300 italic">—</span>
                                    )}
                                  </span>
                                )}

                                {/* Hover Edit Pencil Indicator — only Estado is editable inline */}
                                {col.id === 'estado' && (
                                  <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Row */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-4">
            <span>Totales: {processedCases.length} filas</span>
            {numericSum > 0 && (
              <span className="text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg font-mono">
                Suma Montos Estimados: ${numericSum.toLocaleString()}
              </span>
            )}
          </div>
          <span className="text-slate-400 text-[11px]">
            Clic en Estado para cambiarlo aquí mismo · clic en cualquier otra celda para abrir el detalle del caso
          </span>
        </div>
      </div>

    </div>
  );
};
