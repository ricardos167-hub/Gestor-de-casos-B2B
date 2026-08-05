import React, { useState, useRef, useEffect } from 'react';
import { Mail, LogIn, Shield, Lock, Tag } from 'lucide-react';
import { AppUser } from '../types';
import { SUPER_ADMIN_EMAIL } from '../data/roles';
import { sha256Hex } from '../utils/hash';

export interface UserProfile {
  origen: string;
  programa: string;
}

interface LoginModalProps {
  onLogin: (email: string, profile: UserProfile) => void;
  currentEmail?: string;
  appUsers: AppUser[];
}

const ORIGEN_OPTIONS = ['Call', 'Whatsapp', 'Otros'];
const PROGRAMA_OPTIONS = ['Técnica Móvil', 'Técnica Fija', 'Otros'];

function getStoredProfile(email: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`ticketera_profile_${email}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeProfile(email: string, profile: UserProfile) {
  localStorage.setItem(`ticketera_profile_${email}`, JSON.stringify(profile));
}

// SHA-256 hash of the Super Admin password. Not sent anywhere and never stored
// in plain text in the bundle. NOTE: this still does not stop a determined
// attacker (client-side checks can always be bypassed / brute-forced against
// the hash in devtools) — real access control must live in Firestore rules
// tied to a Firebase Auth identity.
const SUPER_ADMIN_PASSWORD_HASH = '19b67056b896b5320ba3201c4745f8c87439da78314435e49842f7cf2e653b76';

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, currentEmail, appUsers }) => {
  const [emailInput, setEmailInput] = useState(currentEmail || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [origenInput, setOrigenInput] = useState('');
  const [programaInput, setProgramaInput] = useState('');
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdminEmail = emailInput.trim().toLowerCase() === SUPER_ADMIN_EMAIL;

  const cleanEmailLower = emailInput.trim().toLowerCase();
  const isValidEmailFormat = cleanEmailLower.includes('@') && cleanEmailLower.includes('.');

  // Every account must be provisioned by an Admin or the Super Admin first —
  // there is no more free/guest entry for unregistered emails.
  const matchedAppUser = isValidEmailFormat ? appUsers.find((u) => u.email === cleanEmailLower) : undefined;
  const requiresPassword = isSuperAdminEmail || Boolean(matchedAppUser);
  const isRegisteredAccount = isSuperAdminEmail || Boolean(matchedAppUser);

  const existingProfile = isValidEmailFormat ? getStoredProfile(cleanEmailLower) : null;
  // Only prompt for Origen/Programa once we know the account is real — no
  // point asking someone to fill this in just to reject them a step later.
  const needsProfileSelection = isValidEmailFormat && isRegisteredAccount && !existingProfile;

  useEffect(() => {
    if (requiresPassword) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [requiresPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('El formato del correo no es válido (ejemplo: usuario@empresa.com)');
      return;
    }

    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      if (!passwordInput.trim()) {
        setError('🔒 Esta cuenta es de Super Admin. Por favor ingresa tu contraseña.');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 50);
        return;
      }
      const enteredHash = await sha256Hex(passwordInput.trim());
      if (enteredHash !== SUPER_ADMIN_PASSWORD_HASH) {
        setError('Contraseña incorrecta.');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 50);
        return;
      }
    } else if (matchedAppUser) {
      if (!passwordInput.trim()) {
        setError('🔒 Esta cuenta requiere contraseña. Por favor ingrésala.');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 50);
        return;
      }
      const enteredHash = await sha256Hex(passwordInput.trim());
      if (enteredHash !== matchedAppUser.passwordHash) {
        setError('Contraseña incorrecta.');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 50);
        return;
      }
    } else {
      // No free/guest entry anymore — every account must be provisioned by
      // an Admin or the Super Admin first (individually or via Excel).
      setError('Este correo no tiene una cuenta registrada. Pide a un administrador que te cree una cuenta.');
      return;
    }

    const storedProfile = getStoredProfile(cleanEmail);
    let profile = storedProfile;

    if (!storedProfile) {
      if (!origenInput || !programaInput) {
        setError('Selecciona tu Origen y Programa para continuar (solo se pide la primera vez que ingresas).');
        return;
      }
      profile = { origen: origenInput, programa: programaInput };
      storeProfile(cleanEmail, profile);
    }

    setError('');
    onLogin(cleanEmail, profile!);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all">
        {/* Top Header */}
        <div className="bg-slate-900 p-6 text-white text-center relative border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 text-slate-100 mb-3 border border-slate-700">
            <Shield className="w-6 h-6 text-slate-200" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Sistema de Tickets y Casos</h2>
          <p className="text-slate-300 text-xs mt-1">Ingresa tu correo para identificarte en el sistema</p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setError('');
                  }}
                  placeholder="ejemplo: usuario@empresa.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-900 text-xs transition-all"
                />
              </div>
              {isValidEmailFormat && !isRegisteredAccount && (
                <p className="text-amber-700 text-[11px] mt-1.5 font-medium">
                  No encontramos una cuenta con este correo. Pide a un administrador que te cree una.
                </p>
              )}
            </div>

            {/* Password input for Super Admin and other managed accounts (admin/agent) */}
            {requiresPassword && (
              <div className="animate-in fade-in duration-200">
                <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  {isSuperAdminEmail ? 'Contraseña Super Admin' : 'Contraseña'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    id="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setError('');
                    }}
                    placeholder="Ingresa tu contraseña"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-amber-300 bg-amber-50/40 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none text-slate-900 text-xs transition-all"
                  />
                </div>
                <p className="text-amber-700 text-[11px] mt-1 font-medium">
                  {isSuperAdminEmail
                    ? 'Se requiere contraseña para iniciar sesión como Super Admin.'
                    : 'Esta es una cuenta gestionada — se requiere contraseña para iniciar sesión.'}
                </p>
              </div>
            )}

            {/* Origen / Programa selection - required only on the very first login for this nick */}
            {needsProfileSelection && (
              <div className="animate-in fade-in duration-200 space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Primer ingreso: selecciona tu Origen y Programa (se guardará para tus próximos casos)
                </p>

                <div>
                  <label htmlFor="origen" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Origen
                  </label>
                  <select
                    id="origen"
                    value={origenInput}
                    onChange={(e) => {
                      setOrigenInput(e.target.value);
                      setError('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-900 text-xs bg-white transition-all"
                  >
                    <option value="">-- Seleccionar --</option>
                    {ORIGEN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="programa" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Programa
                  </label>
                  <select
                    id="programa"
                    value={programaInput}
                    onChange={(e) => {
                      setProgramaInput(e.target.value);
                      setError('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-900 text-xs bg-white transition-all"
                  >
                    <option value="">-- Seleccionar --</option>
                    {PROGRAMA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <p className="text-rose-600 text-xs font-medium bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Ingresar a la Ticketera</span>
            </button>
          </form>
        </div>

        <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Sistema Seguro de Control e Incidencias</span>
          </p>
        </div>
      </div>
    </div>
  );
};
