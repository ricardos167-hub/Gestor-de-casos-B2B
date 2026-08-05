import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  KeyRound,
  Upload,
  Download,
  Check,
  AlertCircle,
  CheckCircle2,
  ShieldPlus,
  Shield,
  Mail,
} from 'lucide-react';
import { AppUser, AppUserRole } from '../types';
import { SUPER_ADMIN_EMAIL, MIN_ACCOUNT_PASSWORD_LENGTH } from '../data/roles';
import { sha256Hex } from '../utils/hash';
import { parseExcelToUsers, downloadUsersTemplateExcel } from '../utils/excelUsersParser';

interface UsersManagementTabProps {
  appUsers: AppUser[];
  currentUserEmail: string;
  isSuperAdmin: boolean;
  onSaveAppUser: (user: AppUser) => Promise<void>;
}

function validateNewAccountInput(
  email: string,
  password: string,
  confirmPassword: string,
  appUsers: AppUser[]
): string | null {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@') || !clean.includes('.')) return 'Correo inválido.';
  if (clean === SUPER_ADMIN_EMAIL) return 'Ese correo está reservado para el Super Admin.';
  if (appUsers.some((u) => u.email === clean)) {
    return 'Ya existe una cuenta con ese correo. Usa "Restablecer contraseña" en su lugar.';
  }
  if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_ACCOUNT_PASSWORD_LENGTH} caracteres.`;
  }
  if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
  return null;
}

export const UsersManagementTab: React.FC<UsersManagementTabProps> = ({
  appUsers,
  currentUserEmail,
  isSuperAdmin,
  onSaveAppUser,
}) => {
  // Create single account (agent) — available to admin & super admin
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Create admin account — Super Admin only
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState('');
  const [createAdminError, setCreateAdminError] = useState<string | null>(null);
  const [createAdminSuccess, setCreateAdminSuccess] = useState<string | null>(null);
  const [createAdminSubmitting, setCreateAdminSubmitting] = useState(false);

  // Bulk Excel upload (agent accounts only)
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ created: string[]; skipped: { email: string; reason: string }[] } | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Reset password
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Admins that aren't the Super Admin never see other admin accounts —
  // their capability is scoped to regular ("agent") accounts only.
  const visibleUsers = isSuperAdmin ? appUsers : appUsers.filter((u) => u.role !== 'admin');
  const resettableUsers = isSuperAdmin ? appUsers : appUsers.filter((u) => u.role !== 'admin');

  const handleCreateSingleUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateNewAccountInput(newEmail, newPassword, newConfirmPassword, appUsers);
    if (err) {
      setCreateError(err);
      setCreateSuccess(null);
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const clean = newEmail.trim().toLowerCase();
      const passwordHash = await sha256Hex(newPassword);
      await onSaveAppUser({
        email: clean,
        passwordHash,
        role: 'agent',
        createdAt: new Date().toISOString(),
        createdBy: currentUserEmail,
      });
      setCreateSuccess(`Cuenta creada para ${clean}.`);
      setNewEmail('');
      setNewPassword('');
      setNewConfirmPassword('');
    } catch {
      setCreateError('No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateNewAccountInput(newAdminEmail, newAdminPassword, newAdminConfirmPassword, appUsers);
    if (err) {
      setCreateAdminError(err);
      setCreateAdminSuccess(null);
      return;
    }
    setCreateAdminSubmitting(true);
    setCreateAdminError(null);
    try {
      const clean = newAdminEmail.trim().toLowerCase();
      const passwordHash = await sha256Hex(newAdminPassword);
      await onSaveAppUser({
        email: clean,
        passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString(),
        createdBy: currentUserEmail,
      });
      setCreateAdminSuccess(`Cuenta Admin creada para ${clean}.`);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminConfirmPassword('');
    } catch {
      setCreateAdminError('No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      setCreateAdminSubmitting(false);
    }
  };

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkError(null);
    setBulkResult(null);
    setBulkProcessing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseExcelToUsers(buffer);
        const created: string[] = [];
        const skipped: { email: string; reason: string }[] = [...parsed.skipped];

        for (const entry of parsed.entries) {
          if (entry.email === SUPER_ADMIN_EMAIL) {
            skipped.push({ email: entry.email, reason: 'Reservado para el Super Admin' });
            continue;
          }
          const existing = appUsers.find((u) => u.email === entry.email);
          if (existing && existing.role === 'admin') {
            skipped.push({ email: entry.email, reason: 'Ya es una cuenta Admin — no se modifica desde la carga masiva de usuarios' });
            continue;
          }
          if (entry.password.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
            skipped.push({ email: entry.email, reason: `Contraseña muy corta (mínimo ${MIN_ACCOUNT_PASSWORD_LENGTH} caracteres)` });
            continue;
          }
          const passwordHash = await sha256Hex(entry.password);
          await onSaveAppUser({
            email: entry.email,
            passwordHash,
            role: 'agent',
            createdAt: existing?.createdAt || new Date().toISOString(),
            createdBy: currentUserEmail,
          });
          created.push(entry.email);
        }

        setBulkResult({ created, skipped });
      } catch (err: any) {
        setBulkError(err.message || 'Error al procesar el archivo Excel.');
      } finally {
        setBulkProcessing(false);
      }
    };
    reader.onerror = () => {
      setBulkError('No se pudo leer el archivo.');
      setBulkProcessing(false);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccess(null);

    if (!resetTargetEmail) {
      setResetError('Selecciona una cuenta.');
      return;
    }
    const target = appUsers.find((u) => u.email === resetTargetEmail);
    if (!target) {
      setResetError('Cuenta no encontrada.');
      return;
    }
    if (target.role === 'admin' && !isSuperAdmin) {
      setResetError('Solo el Super Admin puede restablecer la contraseña de una cuenta Admin.');
      return;
    }
    if (resetPassword.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
      setResetError(`La contraseña debe tener al menos ${MIN_ACCOUNT_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }

    setResetSubmitting(true);
    setResetError(null);
    try {
      const passwordHash = await sha256Hex(resetPassword);
      await onSaveAppUser({ ...target, passwordHash });
      setResetSuccess(`Contraseña actualizada para ${target.email}.`);
      setResetPassword('');
      setResetConfirmPassword('');
    } catch {
      setResetError('No se pudo actualizar la contraseña.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const roleBadge = (role: AppUserRole) =>
    role === 'admin' ? (
      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
        <Shield className="w-3 h-3" /> Admin
      </span>
    ) : (
      <span className="text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full w-fit">
        Usuario
      </span>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Intro Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 bg-slate-800 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-700 mb-2">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Gestión de Cuentas
          </div>
          <h2 className="text-lg font-bold tracking-tight">Cuentas de Usuario y Contraseñas</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Crea cuentas individuales, sube un Excel con varias cuentas a la vez, o restablece la contraseña de una cuenta existente.
          </p>
        </div>
      </div>

      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900">
        Estas contraseñas se validan en el navegador y no usan un sistema de autenticación con servidor propio — trátalas como un control de acceso básico, no como seguridad de nivel bancario.
      </div>

      {/* SECTION: Create single account */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Crear Cuenta de Usuario</h3>
            <p className="text-xs text-slate-500">Se crea con rol de Usuario (Agente).</p>
          </div>
        </div>

        <form onSubmit={handleCreateSingleUser} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correo</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setCreateError(null); }}
              placeholder="usuario@empresa.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setCreateError(null); }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Contraseña</label>
            <input
              type="password"
              value={newConfirmPassword}
              onChange={(e) => { setNewConfirmPassword(e.target.value); setCreateError(null); }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {createError && (
            <div className="md:col-span-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}
          {createSuccess && (
            <div className="md:col-span-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{createSuccess}</span>
            </div>
          )}

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{createSubmitting ? 'Creando...' : 'Crear Cuenta'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION: Bulk Excel upload */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cargar Cuentas desde Excel</h3>
              <p className="text-xs text-slate-500">Columnas: Correo y Contraseña. Todas se crean como Usuario (Agente).</p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadUsersTemplateExcel}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Plantilla Excel</span>
          </button>
        </div>

        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3.5 text-center flex flex-col items-center justify-center hover:bg-slate-100/60 transition-colors relative">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleBulkFileUpload}
            disabled={bulkProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            title="Haz clic para seleccionar un archivo Excel o CSV"
          />
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5">
            <Upload className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            {bulkProcessing ? 'Procesando...' : 'Haz clic o arrastra tu Excel (.xlsx, .csv) aquí'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Columna "Correo" y columna "Contraseña" (o "Email" / "Clave")
          </p>
        </div>

        {bulkError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{bulkError}</span>
          </div>
        )}

        {bulkResult && (
          <div className="space-y-2">
            {bulkResult.created.length > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{bulkResult.created.length} cuenta(s) creada(s) o actualizada(s):</span>
                </div>
                <p className="text-[11px] text-emerald-700">{bulkResult.created.join(', ')}</p>
              </div>
            )}
            {bulkResult.skipped.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkResult.skipped.length} fila(s) omitida(s):</span>
                </div>
                <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
                  {bulkResult.skipped.map((s, idx) => (
                    <li key={idx}>{s.email}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: Reset password */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Restablecer Contraseña</h3>
            <p className="text-xs text-slate-500">Asigna una nueva contraseña a una cuenta existente.</p>
          </div>
        </div>

        {resettableUsers.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">Aún no hay cuentas creadas.</p>
        ) : (
          <form onSubmit={handleResetPassword} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cuenta</label>
              <select
                value={resetTargetEmail}
                onChange={(e) => { setResetTargetEmail(e.target.value); setResetError(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 bg-white"
              >
                <option value="">-- Seleccionar cuenta --</option>
                {resettableUsers.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.email} {u.role === 'admin' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nueva Contraseña</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => { setResetPassword(e.target.value); setResetError(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                value={resetConfirmPassword}
                onChange={(e) => { setResetConfirmPassword(e.target.value); setResetError(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {resetError && (
              <div className="md:col-span-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}
            {resetSuccess && (
              <div className="md:col-span-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={resetSubmitting}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4" />
                <span>{resetSubmitting ? 'Guardando...' : 'Restablecer Contraseña'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SECTION: Create Admin — Super Admin only */}
      {isSuperAdmin && (
        <div className="bg-white rounded-xl border-2 border-purple-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-purple-100 pb-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
              <ShieldPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Crear Cuenta de Administrador</h3>
              <p className="text-xs text-slate-500">
                Solo el Super Admin puede crear cuentas Admin. Los Admin pueden gestionar cuentas de Usuario (Agente), pero no otras cuentas Admin.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo</label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => { setNewAdminEmail(e.target.value); setCreateAdminError(null); }}
                placeholder="admin@empresa.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => { setNewAdminPassword(e.target.value); setCreateAdminError(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                value={newAdminConfirmPassword}
                onChange={(e) => { setNewAdminConfirmPassword(e.target.value); setCreateAdminError(null); }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {createAdminError && (
              <div className="md:col-span-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createAdminError}</span>
              </div>
            )}
            {createAdminSuccess && (
              <div className="md:col-span-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createAdminSuccess}</span>
              </div>
            )}

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={createAdminSubmitting}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                <ShieldPlus className="w-4 h-4" />
                <span>{createAdminSubmitting ? 'Creando...' : 'Crear Cuenta Admin'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION: Accounts list */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Cuentas Registradas ({visibleUsers.length})
          </h3>
        </div>

        {visibleUsers.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-5">Aún no hay cuentas creadas.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleUsers.map((u) => (
              <div key={u.email} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-800">{u.email}</span>
                  {roleBadge(u.role)}
                </div>
                <span className="text-[11px] text-slate-400">
                  Creada por {u.createdBy} el {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
