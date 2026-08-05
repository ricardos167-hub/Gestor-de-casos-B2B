import React, { useState } from 'react';
import {
  Table,
  BarChart3,
  Plus,
  User,
  LogOut,
  Search,
  Ticket,
  SlidersHorizontal,
  Edit3,
  Check,
  X,
  Shield,
  Users
} from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  currentUserEmail: string;
  activeTab: 'table' | 'fields' | 'analytics' | 'users';
  setActiveTab: (tab: 'table' | 'fields' | 'analytics' | 'users') => void;
  onOpenNewCaseModal: () => void;
  onChangeUser: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalCasesCount: number;
  appSettings: AppSettings;
  onSaveAppSettings: (settings: AppSettings) => void;
  canManageUsers: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUserEmail,
  activeTab,
  setActiveTab,
  onOpenNewCaseModal,
  onChangeUser,
  searchQuery,
  setSearchQuery,
  totalCasesCount,
  appSettings,
  onSaveAppSettings,
  canManageUsers,
}) => {
  const isAdmin = currentUserEmail?.trim().toLowerCase() === 'ricardo.s167@gmail.com';
  const [isEditingTitleModalOpen, setIsEditingTitleModalOpen] = useState(false);
  const [editTitleInput, setEditTitleInput] = useState(appSettings.appTitle);
  const [editSubtitleInput, setEditSubtitleInput] = useState(appSettings.appSubtitle);

  const handleOpenEditModal = () => {
    setEditTitleInput(appSettings.appTitle || 'Gestor de Casos');
    setEditSubtitleInput(appSettings.appSubtitle || 'Ticketera con campos personalizables y vista editable');
    setIsEditingTitleModalOpen(true);
  };

  const handleSaveHeaderConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitleInput.trim()) return;
    onSaveAppSettings({
      appTitle: editTitleInput.trim(),
      appSubtitle: editSubtitleInput.trim(),
    });
    setIsEditingTitleModalOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3 border-b border-slate-100">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  {appSettings.appTitle || 'Gestor de Casos'}
                </h1>

                {/* Edit Icon for Super Admin */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    title="Editar Título y Subtítulo de la Página (Super Admin)"
                    className="p-1 hover:bg-slate-100 hover:text-slate-900 text-slate-400 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 text-[10px] font-semibold"
                  >
                    <Edit3 className="w-3 h-3 text-amber-600" />
                    <span className="text-amber-800">Editar Título</span>
                  </button>
                )}

                <span className="bg-slate-100 text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                  {totalCasesCount} {totalCasesCount === 1 ? 'caso' : 'casos'}
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado en Tiempo Real
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {appSettings.appSubtitle || 'Ticketera con campos personalizables y vista editable'}
              </p>
            </div>
          </div>

          {/* Search Bar & Primary Action */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Buscar caso, ID, título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
              />
            </div>

            {/* New Case Button */}
            <button
              onClick={onOpenNewCaseModal}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Caso</span>
            </button>

            {/* User Account Badge */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/60 px-2.5 py-1 rounded-lg transition-colors text-xs text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-medium max-w-[140px] truncate" title={currentUserEmail}>
                  {currentUserEmail}
                </span>
              </div>
              <button
                onClick={onChangeUser}
                title="Cambiar usuario de correo"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between overflow-x-auto py-2 scrollbar-none">
          <nav className="flex items-center space-x-1 sm:space-x-1.5">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'table'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Vista Tabla Excel (Editable)</span>
            </button>

            {currentUserEmail?.trim().toLowerCase() === 'ricardo.s167@gmail.com' && (
              <button
                onClick={() => setActiveTab('fields')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'fields'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Configurar Campos del Caso</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Métricas</span>
            </button>

            {canManageUsers && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gestionar Usuarios</span>
              </button>
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Autoguardado activo
          </div>
        </div>
      </div>

      {/* Super Admin Edit Header Title Modal */}
      {isEditingTitleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Editar Título y Subtítulo de la App</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTitleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHeaderConfig} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título Principal de la Aplicación
                </label>
                <input
                  type="text"
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  placeholder="Ej: Gestor de Casos"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo / Descripción Corta
                </label>
                <input
                  type="text"
                  value={editSubtitleInput}
                  onChange={(e) => setEditSubtitleInput(e.target.value)}
                  placeholder="Ej: Ticketera con campos personalizables..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 font-medium">
                💡 Este cambio se sincronizará en tiempo real y será visible para todos los usuarios.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingTitleModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
