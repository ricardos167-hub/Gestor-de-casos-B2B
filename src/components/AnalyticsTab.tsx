import React from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  UserCheck,
  Ticket
} from 'lucide-react';
import { CaseRecord, CustomField } from '../types';

interface AnalyticsTabProps {
  cases: CaseRecord[];
  customFields: CustomField[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ cases, customFields }) => {
  const total = cases.length;

  const resolved = cases.filter((c) => c.estado === 'Resuelto' || c.estado === 'Cerrado').length;
  const inProgress = cases.filter((c) => c.estado === 'En Proceso' || c.estado === 'En Espera').length;
  const newCases = cases.filter((c) => c.estado === 'Nuevo').length;

  // Breakdown by Creator Email
  const agentCounts: Record<string, number> = {};
  cases.forEach((c) => {
    const agent = c.creadoPor || 'Sistema';
    agentCounts[agent] = (agentCounts[agent] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      
      {/* Key Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Total de Casos</span>
            <span className="text-2xl font-bold text-slate-900">{total}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Nuevos / Sin Asignar</span>
            <span className="text-2xl font-bold text-slate-900">{newCases}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">En Atención / Proceso</span>
            <span className="text-2xl font-bold text-slate-900">{inProgress}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Resueltos / Cerrados</span>
            <span className="text-2xl font-bold text-slate-900">{resolved}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Agents Productivity Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          Registros por Agente / Usuario
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(agentCounts).map(([email, count]) => (
            <div key={email} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]" title={email}>
                {email}
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                {count} casos
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
