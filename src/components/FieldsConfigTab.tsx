import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Check,
  X,
  Settings2,
  Sparkles,
  Eye,
  Tag,
  SlidersHorizontal,
  HelpCircle,
  Type,
  GripVertical,
  Shield,
  FileSpreadsheet,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  LayoutGrid,
  Lock
} from 'lucide-react';
import { CustomField, FieldType, HierarchyPresetConfig, FieldArea } from '../types';
import { GENERAL_AREA_ID } from '../data/initialData';
import { parseExcelToHierarchy, downloadHierarchyTemplateExcel } from '../utils/excelHierarchyParser';
import { confirmTripleDelete } from '../utils/confirmDelete';
import { HierarchyButtonSelector } from './HierarchyButtonSelector';

interface FieldsConfigTabProps {
  customFields: CustomField[];
  onAddField: (newField: CustomField) => void;
  onUpdateField: (updatedField: CustomField) => void;
  onDeleteField: (fieldId: string) => void;
  onReorderFields: (newOrderedFields: CustomField[]) => void;
  hierarchyConfig?: HierarchyPresetConfig | null;
  onSaveHierarchyConfig?: (config: HierarchyPresetConfig) => void;
  fieldAreas: FieldArea[];
  onSaveFieldAreas: (areas: FieldArea[]) => void;
}

export const FieldsConfigTab: React.FC<FieldsConfigTabProps> = ({
  customFields,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
  hierarchyConfig,
  onSaveHierarchyConfig,
  fieldAreas,
  onSaveFieldAreas,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [createFieldError, setCreateFieldError] = useState<string | null>(null);

  const sortedAreas = [...fieldAreas].sort((a, b) => a.order - b.order);
  const defaultAreaId = sortedAreas[0]?.id || GENERAL_AREA_ID;

  // New Field Form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');
  const [newOptionsText, setNewOptionsText] = useState('Opción 1, Opción 2, Opción 3');
  const [newRequired, setNewRequired] = useState(false);
  const [newShowInTable, setNewShowInTable] = useState(true);
  const [newHidden, setNewHidden] = useState(false);
  const [newRequiredToClose, setNewRequiredToClose] = useState(false);
  const [newAreaId, setNewAreaId] = useState(defaultAreaId);

  // Editing field state
  const [editLabel, setEditLabel] = useState('');
  const [editOptionsText, setEditOptionsText] = useState('');
  const [editRequired, setEditRequired] = useState(false);
  const [editShowInTable, setEditShowInTable] = useState(true);
  const [editHidden, setEditHidden] = useState(false);
  const [editRequiredToClose, setEditRequiredToClose] = useState(false);
  const [editAreaId, setEditAreaId] = useState(defaultAreaId);

  // Field Areas management state
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newAreaLabel, setNewAreaLabel] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editAreaLabel, setEditAreaLabel] = useState('');

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaLabel.trim()) return;
    const areaId = newAreaLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_') + '_' + Math.floor(Math.random() * 1000);
    const maxOrder = fieldAreas.reduce((max, a) => Math.max(max, a.order), 0);
    onSaveFieldAreas([...fieldAreas, { id: areaId, label: newAreaLabel.trim(), order: maxOrder + 1 }]);
    setNewAreaLabel('');
    setIsAddingArea(false);
  };

  const startEditArea = (area: FieldArea) => {
    setEditingAreaId(area.id);
    setEditAreaLabel(area.label);
  };

  const handleSaveAreaEdit = (area: FieldArea) => {
    if (!editAreaLabel.trim()) return;
    onSaveFieldAreas(fieldAreas.map((a) => (a.id === area.id ? { ...a, label: editAreaLabel.trim() } : a)));
    setEditingAreaId(null);
  };

  // Excel Hierarchy Upload State
  const [excelUploadError, setExcelUploadError] = useState<string | null>(null);
  const [excelUploadSuccess, setExcelUploadSuccess] = useState<string | null>(null);

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelUploadError(null);
    setExcelUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsedConfig = parseExcelToHierarchy(buffer);
        if (onSaveHierarchyConfig) {
          onSaveHierarchyConfig(parsedConfig);
          setExcelUploadSuccess(`¡Éxito! Se importaron ${parsedConfig.levels.length} niveles jerárquicos y ${parsedConfig.tree.length} categorías principales desde "${file.name}".`);
        }
      } catch (err: any) {
        setExcelUploadError(err.message || 'Error al procesar el archivo Excel.');
      }
    };
    reader.onerror = () => {
      setExcelUploadError('No se pudo leer el archivo.');
    };
    reader.readAsArrayBuffer(file);
    // Reset file input value
    e.target.value = '';
  };

  const FIELD_TYPES: { type: FieldType; name: string; desc: string }[] = [
    { type: 'text', name: 'Texto Corto', desc: 'Línea de texto simple' },
    { type: 'select', name: 'Lista Desplegable (Select)', desc: 'Selección única de opciones' },
    { type: 'number', name: 'Número', desc: 'Valores numéricos o montos' },
    { type: 'date', name: 'Fecha', desc: 'Selector de fecha' },
    { type: 'textarea', name: 'Texto Largo (Área)', desc: 'Párrafos o descripciones' },
    { type: 'checkbox', name: 'Casilla de Verificación', desc: 'Verdadero / Falso (Sí/No)' },
    { type: 'email', name: 'Correo Electrónico', desc: 'Dirección de email' },
  ];

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFieldError(null);
    if (!newLabel.trim()) return;

    // Generate safe unique key
    const fieldId = newLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_') + '_' + Math.floor(Math.random() * 1000);

    const options = newType === 'select'
      ? newOptionsText.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const newFieldObj: CustomField = {
      id: fieldId,
      label: newLabel.trim(),
      type: newType,
      options,
      required: newHidden ? false : newRequired,
      showInTable: newShowInTable,
      isSystem: false,
      hidden: newHidden,
      requiredToClose: newHidden ? false : newRequiredToClose,
      areaId: newAreaId,
      order: customFields.length + 1,
    };

    try {
      await onAddField(newFieldObj);
      // Reset form
      setNewLabel('');
      setNewType('text');
      setNewOptionsText('Opción 1, Opción 2, Opción 3');
      setNewRequired(false);
      setNewShowInTable(true);
      setNewHidden(false);
      setNewRequiredToClose(false);
      setNewAreaId(defaultAreaId);
      setIsAdding(false);
    } catch (err: any) {
      setCreateFieldError(err?.message || 'No se pudo crear el campo. Intenta de nuevo.');
    }
  };

  const startEditField = (field: CustomField) => {
    setEditingFieldId(field.id);
    setEditLabel(field.label);
    setEditOptionsText(field.options ? field.options.join(', ') : '');
    setEditRequired(Boolean(field.required));
    setEditShowInTable(field.showInTable !== false);
    setEditHidden(Boolean(field.hidden));
    setEditRequiredToClose(Boolean(field.requiredToClose));
    setEditAreaId(field.areaId || defaultAreaId);
  };

  const handleSaveFieldEdit = (field: CustomField) => {
    const options = field.type === 'select'
      ? editOptionsText.split(',').map((s) => s.trim()).filter(Boolean)
      : field.options;

    const updated: CustomField = {
      ...field,
      label: editLabel.trim() || field.label,
      options,
      required: editHidden ? false : editRequired,
      showInTable: editShowInTable,
      hidden: editHidden,
      requiredToClose: editHidden ? false : editRequiredToClose,
      areaId: editAreaId,
    };

    onUpdateField(updated);
    setEditingFieldId(null);
  };

  // Combined, orderable list: regular custom fields + a pseudo-row for the
  // hierarchy button block (when configured), so the hierarchy block's
  // position among the other fields can be dragged like any other field.
  type FieldRow = { kind: 'field'; field: CustomField } | { kind: 'hierarchy' };

  const hasHierarchy = Boolean(hierarchyConfig && hierarchyConfig.tree && hierarchyConfig.tree.length > 0);
  const hierarchyOrder = hierarchyConfig?.order ?? (customFields.length + 1);

  const combinedRows: FieldRow[] = [
    ...customFields.map((field): FieldRow => ({ kind: 'field', field })),
    ...(hasHierarchy ? [{ kind: 'hierarchy' as const }] : []),
  ].sort((a, b) => {
    const orderA = a.kind === 'field' ? a.field.order : hierarchyOrder;
    const orderB = b.kind === 'field' ? b.field.order : hierarchyOrder;
    return orderA - orderB;
  });

  const applyRowOrder = (rows: FieldRow[]) => {
    const updatedFields: CustomField[] = [];
    let newHierarchyOrder = hierarchyOrder;
    rows.forEach((row, idx) => {
      if (row.kind === 'field') {
        updatedFields.push({ ...row.field, order: idx + 1 });
      } else {
        newHierarchyOrder = idx + 1;
      }
    });
    onReorderFields(updatedFields);
    if (hasHierarchy && hierarchyConfig && onSaveHierarchyConfig) {
      onSaveHierarchyConfig({ ...hierarchyConfig, order: newHierarchyOrder });
    }
  };

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const rows = [...combinedRows];
    const [moved] = rows.splice(draggedIdx, 1);
    rows.splice(targetIdx, 0, moved);
    applyRowOrder(rows);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const moveRow = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= combinedRows.length) return;
    const rows = [...combinedRows];
    const temp = rows[idx];
    rows[idx] = rows[targetIdx];
    rows[targetIdx] = temp;
    applyRowOrder(rows);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Intro Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 bg-slate-800 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-700 mb-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            Configurador de Formulario y Botones Jerárquicos
          </div>
          <h2 className="text-lg font-bold tracking-tight">Personaliza los Campos y Botones Preestablecidos</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Añade campos personalizados o sube un archivo Excel de N columnas para generar botones de selección rápida en cascada por jerarquía.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdding ? 'Cerrar Creador' : 'Crear Nuevo Campo'}</span>
        </button>
      </div>

      {/* SECTION: FIELD AREAS (editable section headings) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Áreas de Campos</h3>
              <p className="text-xs text-slate-500">
                Agrupa los campos en secciones con su propio título dentro del formulario de casos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingArea(!isAddingArea)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Área</span>
          </button>
        </div>

        {isAddingArea && (
          <form onSubmit={handleAddArea} className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              placeholder="ej: Datos del Cliente, Información Técnica"
              value={newAreaLabel}
              onChange={(e) => setNewAreaLabel(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Crear</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsAddingArea(false); setNewAreaLabel(''); }}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        )}

        <div className="space-y-1.5">
          {sortedAreas.map((area) => {
            const fieldCount = customFields.filter((f) => (f.areaId || defaultAreaId) === area.id).length;
            const isEditingArea = editingAreaId === area.id;
            return (
              <div key={area.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2">
                {isEditingArea ? (
                  <>
                    <input
                      type="text"
                      autoFocus
                      value={editAreaLabel}
                      onChange={(e) => setEditAreaLabel(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 text-xs bg-white outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveAreaEdit(area)}
                      className="text-emerald-700 hover:text-emerald-800 p-1 cursor-pointer"
                      title="Guardar"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAreaId(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs font-semibold text-slate-800">{area.label}</span>
                    <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {fieldCount} {fieldCount === 1 ? 'campo' : 'campos'}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditArea(area)}
                      className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
                      title="Renombrar área"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION: EXCEL HIERARCHICAL BUTTONS CONFIGURATION */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Botones Jerárquicos Preestablecidos (Carga desde Excel)</span>
                {hierarchyConfig && hierarchyConfig.tree && hierarchyConfig.tree.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                    Activo ({hierarchyConfig.levels.length} Niveles)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Cada columna de tu Excel representa un nivel jerárquico (Columna 1 = Nivel 1, Columna 2 = Nivel 2, Columna 3 = Nivel 3...).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadHierarchyTemplateExcel}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Descargar Plantilla Excel</span>
          </button>
        </div>

        {/* Upload Zone */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center flex flex-col items-center justify-center hover:bg-slate-100/60 transition-colors relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Haz clic para seleccionar un archivo Excel o CSV"
            />
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Haz clic o arrastra tu archivo Excel (.xlsx, .csv) aquí
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Genera automáticamente los botones interactivos por cada columna
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>¿Cómo estructurar tu Excel?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90">
              <li><strong>Fila 1 (Encabezados):</strong> Nombres de los niveles (ej. <em>Categoría, Subcategoría, Incidencia</em>).</li>
              <li><strong>Filas siguientes:</strong> Las combinaciones válidas de opciones.</li>
              <li>Al subir el archivo, el sistema crea los botones dinámicos al crear o editar casos.</li>
            </ul>
          </div>
        </div>

        {/* Feedback Messages */}
        {excelUploadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{excelUploadError}</span>
          </div>
        )}

        {excelUploadSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{excelUploadSuccess}</span>
          </div>
        )}

        {/* Preview of Configured Hierarchy Buttons */}
        {hierarchyConfig && hierarchyConfig.tree && hierarchyConfig.tree.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Vista Previa Interactiva de los Botones Generados:</span>
              <button
                type="button"
                onClick={() => {
                  if (confirmTripleDelete('la estructura jerárquica configurada')) {
                    if (onSaveHierarchyConfig) {
                      onSaveHierarchyConfig({ levels: [], tree: [] });
                      setExcelUploadSuccess('Estructura de botones eliminada.');
                    }
                  }
                }}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
              >
                Eliminar Botones Jerárquicos
              </button>
            </h4>
            <HierarchyButtonSelector
              config={hierarchyConfig}
              onSelectFinalPreset={(path, suggestion) => {
                alert(`Botón seleccionado: "${suggestion}"\nRuta seleccionada: ${path.join(' > ')}`);
              }}
              compact
            />
          </div>
        )}
      </div>

      {/* New Field Creator Card */}
      {isAdding && (
        <div className="bg-white p-5 rounded-xl border-2 border-slate-900 shadow-xs animate-in fade-in duration-150">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-900" />
            Agregar un Nuevo Campo Personalizado
          </h3>

          <form onSubmit={handleCreateField} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Field Label */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre o Etiqueta del Campo <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ej: Centro de Costos, SLA Horas, Aprobador"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              {/* Field Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Dato del Campo
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as FieldType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 bg-white"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.type} value={ft.type}>
                      {ft.name} — {ft.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Options Input if type is select */}
              {newType === 'select' && (
                <div className="md:col-span-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Opciones de la Lista Desplegable (separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    placeholder="Opción A, Opción B, Opción C"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Escribe las alternativas que el usuario podrá elegir al registrar o editar en la tabla.
                  </p>
                </div>
              )}

              {/* Area Selector */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Área del Formulario
                </label>
                <select
                  value={newAreaId}
                  onChange={(e) => setNewAreaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 bg-white"
                >
                  {sortedAreas.map((area) => (
                    <option key={area.id} value={area.id}>{area.label}</option>
                  ))}
                </select>
              </div>

              {/* Flags: Required & Show in table */}
              <div className="md:col-span-2 flex items-center gap-6 pt-2 flex-wrap">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Obligatorio al guardar</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRequiredToClose}
                    onChange={(e) => setNewRequiredToClose(e.target.checked)}
                    disabled={newHidden}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 disabled:opacity-40"
                  />
                  <span className={`text-xs font-medium ${newHidden ? 'text-slate-400' : 'text-slate-700'}`}>Obligatorio para cerrar el caso</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newShowInTable}
                    onChange={(e) => setNewShowInTable(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Mostrar como columna en la Tabla Excel</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHidden}
                    onChange={(e) => setNewHidden(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Ocultar del formulario de creación</span>
                </label>
              </div>

              {newHidden && (
                <p className="md:col-span-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Este campo no aparecerá al crear un caso nuevo y dejará de ser obligatorio automáticamente.
                </p>
              )}

              {newRequiredToClose && !newHidden && (
                <p className="md:col-span-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  Se podrá crear el caso con este campo vacío, pero no se podrá cambiar el Estado a "Cerrado" hasta completarlo.
                </p>
              )}

            </div>

            {createFieldError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createFieldError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Campo</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Fields List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Todos los Campos del Sistema y Personalizados ({combinedRows.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Arrastra (Drag & Drop) o usa las flechas para reordenar los campos
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {combinedRows.map((row, idx) => {
            const isDragging = draggedIdx === idx;
            const isOver = dragOverIdx === idx;

            const dragHandleAndArrows = (isEditing: boolean) => (
              <div className="flex items-center gap-1 text-slate-400 shrink-0">
                <span
                  className="cursor-grab active:cursor-grabbing p-1 hover:text-slate-800"
                  title="Arrastrar para reordenar"
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                </span>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveRow(idx, -1)}
                    disabled={idx === 0}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                    title="Mover arriba"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(idx, 1)}
                    disabled={idx === combinedRows.length - 1}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                    title="Mover abajo"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );

            if (row.kind === 'hierarchy') {
              return (
                <div
                  key="__hierarchy__"
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 transition-all flex items-center justify-between gap-4 ${
                    isDragging ? 'opacity-30 bg-slate-100 border-2 border-dashed border-slate-400' : 'hover:bg-slate-50/50'
                  } ${isOver ? 'bg-amber-50 border-l-4 border-l-amber-600' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {dragHandleAndArrows(false)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900">Botones Jerárquicos (Excel)</span>
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Bloque Jerárquico
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Define en qué posición aparece el selector de botones en cascada al crear o editar un caso.
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const field = row.field;
            const isEditing = editingFieldId === field.id;

            return (
              <div
                key={field.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDragging ? 'opacity-30 bg-slate-100 border-2 border-dashed border-slate-400' : 'hover:bg-slate-50/50'
                } ${isOver ? 'bg-amber-50 border-l-4 border-l-amber-600' : ''}`}
              >
                {/* Left Side: Drag & Properties */}
                <div className="flex items-start md:items-center gap-3 flex-1">

                  {/* Drag Handle & Up/Down Buttons */}
                  {dragHandleAndArrows(isEditing)}

                  {!isEditing ? (
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900">{field.label}</span>
                        
                        {field.isSystem ? (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Campo del Sistema
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
                            Personalizado
                          </span>
                        )}

                        <span className="text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          {FIELD_TYPES.find((t) => t.type === field.type)?.name || field.type}
                        </span>
                        
                        {field.required && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                            Requerido
                          </span>
                        )}
                        {field.requiredToClose && (
                          <span className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Obligatorio para cerrar
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <LayoutGrid className="w-3 h-3" />
                          {sortedAreas.find((a) => a.id === (field.areaId || defaultAreaId))?.label || 'Área General'}
                        </span>
                        {field.showInTable && !field.hidden && (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Visible en Tabla
                          </span>
                        )}
                        {field.hidden && (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-300/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Oculto (formulario, tabla y caso)
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span className="font-mono text-[11px]">ID: {field.id}</span>
                        {field.options && field.options.length > 0 && (
                          <span>Opciones: {field.options.join(' • ')}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* In-place Field Editing for ALL fields (system and custom) */
                    <div className="flex-1 space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-300">
                      <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Editando {field.isSystem ? 'Campo del Sistema' : 'Campo Personalizado'}: {field.id}
                        </span>
                        {field.isSystem && (
                          <span className="text-[10px] text-purple-700 font-medium bg-purple-100 px-2 py-0.5 rounded-full">
                            Totalmente editable por Super Admin
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Nombre o Etiqueta Visible
                          </label>
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:border-slate-900 outline-none"
                          />
                        </div>

                        {field.type === 'select' && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Opciones Desplegables (separadas por coma)
                            </label>
                            <input
                              type="text"
                              value={editOptionsText}
                              onChange={(e) => setEditOptionsText(e.target.value)}
                              placeholder="Opción 1, Opción 2..."
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:border-slate-900 outline-none"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Área del Formulario
                          </label>
                          <select
                            value={editAreaId}
                            onChange={(e) => setEditAreaId(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:border-slate-900 outline-none"
                          >
                            {sortedAreas.map((area) => (
                              <option key={area.id} value={area.id}>{area.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pt-1 flex-wrap">
                        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editRequired}
                            onChange={(e) => setEditRequired(e.target.checked)}
                            className="rounded text-slate-900 focus:ring-slate-900"
                          />
                          <span>Marcar como Requerido</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editRequiredToClose}
                            onChange={(e) => setEditRequiredToClose(e.target.checked)}
                            disabled={editHidden}
                            className="rounded text-slate-900 focus:ring-slate-900 disabled:opacity-40"
                          />
                          <span className={editHidden ? 'text-slate-400' : ''}>Obligatorio para cerrar el caso</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editShowInTable}
                            onChange={(e) => setEditShowInTable(e.target.checked)}
                            className="rounded text-slate-900 focus:ring-slate-900"
                          />
                          <span>Mostrar Columna en Tabla Excel</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editHidden}
                            onChange={(e) => setEditHidden(e.target.checked)}
                            className="rounded text-slate-900 focus:ring-slate-900"
                          />
                          <span>Ocultar del formulario de creación</span>
                        </label>
                      </div>

                      {editHidden && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Este campo no aparecerá al crear un caso nuevo y dejará de ser obligatorio automáticamente.
                        </p>
                      )}

                      {editRequiredToClose && !editHidden && (
                        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                          No se podrá cambiar el Estado a "Cerrado" mientras este campo esté vacío.
                        </p>
                      )}
                    </div>
                  )}

                </div>

                {/* Right Side: Edit / Save / Delete Buttons */}
                <div className="flex items-center gap-2 justify-end shrink-0">
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditField(field)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Editar</span>
                      </button>

                      {field.isSystem ? (
                        <span 
                          className="text-[11px] text-slate-400 italic px-2 py-1 select-none"
                          title="Los campos del sistema son parte de la estructura base y no se eliminan, pero puedes editar su etiqueta, opciones y visibilidad."
                        >
                          Base Sistema
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmTripleDelete(`el campo "${field.label}"`)) {
                              onDeleteField(field.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar campo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingFieldId(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveFieldEdit(field)}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Guardar</span>
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
