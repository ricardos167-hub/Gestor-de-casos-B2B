import React, { useState } from 'react';
import { HierarchyPresetConfig, HierarchyNode } from '../types';
import { ChevronRight, Layers, Sparkles, CheckCircle2, RotateCcw, ListFilter, LayoutGrid } from 'lucide-react';

interface HierarchyButtonSelectorProps {
  config: HierarchyPresetConfig;
  onSelectFinalPreset: (selectedPath: string[], titleSuggestion: string) => void;
  compact?: boolean;
  variant?: 'clean' | 'card';
}

export const HierarchyButtonSelector: React.FC<HierarchyButtonSelectorProps> = ({
  config,
  onSelectFinalPreset,
  compact = false,
  variant = 'clean',
}) => {
  // Store selected node at each level index: selectedPath[levelIdx] = node
  const [selectedPathNodes, setSelectedPathNodes] = useState<HierarchyNode[]>([]);
  // View mode state for card variant
  const [viewMode, setViewMode] = useState<'select' | 'buttons'>('select');

  if (!config || !config.tree || config.tree.length === 0) {
    return null;
  }

  const handleSelectNodeAtLevel = (levelIndex: number, node: HierarchyNode) => {
    const newPath = selectedPathNodes.slice(0, levelIndex);
    newPath.push(node);
    setSelectedPathNodes(newPath);

    const fullPathNames = newPath.map((n) => n.name);
    const titleSuggestion =
      fullPathNames.length >= 2
        ? `${fullPathNames[fullPathNames.length - 2]}: ${fullPathNames[fullPathNames.length - 1]}`
        : fullPathNames.join(' - ');

    onSelectFinalPreset(fullPathNames, titleSuggestion);
  };

  const handleSelectDropdownChange = (levelIdx: number, selectedNodeId: string) => {
    if (!selectedNodeId) {
      const newPath = selectedPathNodes.slice(0, levelIdx);
      setSelectedPathNodes(newPath);
      return;
    }

    const optionsAtLevel =
      levelIdx === 0 ? config.tree : selectedPathNodes[levelIdx - 1]?.children || [];

    const chosenNode = optionsAtLevel.find((n) => n.id === selectedNodeId);
    if (!chosenNode) return;

    const newPath = selectedPathNodes.slice(0, levelIdx);
    newPath.push(chosenNode);
    setSelectedPathNodes(newPath);

    const fullPathNames = newPath.map((n) => n.name);
    const titleSuggestion =
      fullPathNames.length >= 2
        ? `${fullPathNames[fullPathNames.length - 2]}: ${fullPathNames[fullPathNames.length - 1]}`
        : fullPathNames.join(' - ');

    onSelectFinalPreset(fullPathNames, titleSuggestion);
  };

  const handleReset = () => {
    setSelectedPathNodes([]);
  };

  // Clean form variant (standard form fields with labels and select dropdowns)
  if (variant === 'clean') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.levels.map((lvlTitle, levelIdx) => {
          const optionsAtLevel =
            levelIdx === 0 ? config.tree : selectedPathNodes[levelIdx - 1]?.children || [];

          const isDisabled = levelIdx > 0 && selectedPathNodes.length < levelIdx;
          const selectedVal = selectedPathNodes[levelIdx]?.id || '';

          return (
            <div key={levelIdx}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lvlTitle}
              </label>
              <select
                value={selectedVal}
                disabled={isDisabled}
                onChange={(e) => handleSelectDropdownChange(levelIdx, e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-all ${
                  isDisabled
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                    : `text-slate-800 border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-2xs ${selectedVal ? 'bg-white' : 'bg-rose-50'}`
                }`}
              >
                <option value="">
                  {isDisabled
                    ? `-- Selecciona primero ${config.levels[levelIdx - 1] || 'nivel anterior'} --`
                    : `-- Seleccionar ${lvlTitle} --`}
                </option>
                {optionsAtLevel.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    );
  }

  // Determine active levels for card variant
  const levelsToRender: { levelIdx: number; title: string; nodes: HierarchyNode[]; selectedNode?: HierarchyNode }[] = [];
  levelsToRender.push({
    levelIdx: 0,
    title: config.levels[0] || 'Nivel 1',
    nodes: config.tree,
    selectedNode: selectedPathNodes[0],
  });

  for (let i = 0; i < selectedPathNodes.length; i++) {
    const currNode = selectedPathNodes[i];
    if (currNode && currNode.children && currNode.children.length > 0) {
      levelsToRender.push({
        levelIdx: i + 1,
        title: config.levels[i + 1] || `Nivel ${i + 2}`,
        nodes: currNode.children,
        selectedNode: selectedPathNodes[i + 1],
      });
    }
  }

  const selectedPathNames = selectedPathNodes.map((n) => n.name);
  const isComplete =
    selectedPathNodes.length > 0 &&
    (!selectedPathNodes[selectedPathNodes.length - 1].children ||
      selectedPathNodes[selectedPathNodes.length - 1].children!.length === 0);

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl ${
        compact ? 'p-3.5' : 'p-4'
      } border border-slate-800 shadow-lg space-y-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Selección por Jerarquía</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-medium">
                {config.levels.length} Niveles
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {viewMode === 'select'
                ? 'Selecciona los campos desplegables para autocompletar'
                : 'Haz clic en los botones para autocompletar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/80">
            <button
              type="button"
              onClick={() => setViewMode('select')}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'select'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3 h-3" />
              <span>Desplegables</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('buttons')}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'buttons'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Botones</span>
            </button>
          </div>

          {selectedPathNodes.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-slate-800"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb path */}
      {selectedPathNames.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ruta:</span>
          {selectedPathNames.map((name, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  idx === selectedPathNames.length - 1 && isComplete
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {name}
              </span>
            </React.Fragment>
          ))}
          {isComplete && (
            <span className="ml-auto text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              ¡Campos autocompletados!
            </span>
          )}
        </div>
      )}

      {/* Select Mode */}
      {viewMode === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {config.levels.map((lvlTitle, levelIdx) => {
            const optionsAtLevel =
              levelIdx === 0 ? config.tree : selectedPathNodes[levelIdx - 1]?.children || [];

            const isDisabled = levelIdx > 0 && selectedPathNodes.length < levelIdx;
            const selectedVal = selectedPathNodes[levelIdx]?.id || '';

            return (
              <div key={levelIdx} className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-amber-400" />
                    <span>{lvlTitle}</span>
                  </span>
                  {optionsAtLevel.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({optionsAtLevel.length} opciones)
                    </span>
                  )}
                </label>
                <select
                  value={selectedVal}
                  disabled={isDisabled}
                  onChange={(e) => handleSelectDropdownChange(levelIdx, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-all ${
                    isDisabled
                      ? 'bg-slate-950/50 text-slate-600 border-slate-800/80 cursor-not-allowed'
                      : 'bg-slate-900 text-slate-100 border-slate-700 hover:border-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs'
                  }`}
                >
                  <option value="">
                    {isDisabled
                      ? `-- Selecciona primero ${config.levels[levelIdx - 1] || 'nivel anterior'} --`
                      : `-- Seleccionar ${lvlTitle} --`}
                  </option>
                  {optionsAtLevel.map((node) => (
                    <option key={node.id} value={node.id} className="bg-slate-900 text-white">
                      {node.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Buttons Mode */}
      {viewMode === 'buttons' && (
        <div className="space-y-3 pt-1">
          {levelsToRender.map((lvl) => (
            <div key={lvl.levelIdx} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>{lvl.title}</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {lvl.nodes.length} opciones disponibles
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {lvl.nodes.map((node) => {
                  const isSelected = lvl.selectedNode?.id === node.id;
                  const hasChildren = node.children && node.children.length > 0;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleSelectNodeAtLevel(lvl.levelIdx, node)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-amber-500/20'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <span>{node.name}</span>
                      {hasChildren ? (
                        <ChevronRight
                          className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-slate-500'}`}
                        />
                      ) : (
                        <CheckCircle2
                          className={`w-3 h-3 ${
                            isSelected ? 'text-slate-950' : 'text-emerald-400/80'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


