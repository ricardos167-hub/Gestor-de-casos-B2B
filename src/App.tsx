import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { ExcelTableTab } from './components/ExcelTableTab';
import { FieldsConfigTab } from './components/FieldsConfigTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { NewCaseModal } from './components/NewCaseModal';
import { CaseModal } from './components/CaseModal';
import { Toast } from './components/Toast';
import { DEFAULT_FIELDS, DEFAULT_FIELD_AREAS } from './data/initialData';
import { CaseRecord, CustomField, AppSettings, HierarchyPresetConfig, FieldArea } from './types';
import {
  subscribeToCases,
  subscribeToCustomFields,
  subscribeToAppSettings,
  subscribeToHierarchyPresets,
  subscribeToFieldAreas,
  saveCaseToFirestore,
  deleteCaseFromFirestore,
  deleteMultipleCasesFromFirestore,
  saveCustomFieldToFirestore,
  saveAllCustomFieldsToFirestore,
  deleteCustomFieldFromFirestore,
  saveAppSettingsToFirestore,
  saveHierarchyPresetsToFirestore,
  saveFieldAreasToFirestore
} from './lib/firebase';

interface UserProfile {
  origen: string;
  programa: string;
}

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

export default function App() {
  // User Authentication State
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('ticketera_user_email') || null;
  });

  // Origen/Programa selected at first login, inherited into new cases created by this user
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(() => {
    const email = localStorage.getItem('ticketera_user_email');
    return email ? getStoredProfile(email) : null;
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(() => !currentUserEmail);

  // Admin permissions check
  const isAdmin = currentUserEmail?.trim().toLowerCase() === 'ricardo.s167@gmail.com';

  // Dynamic Custom Fields State
  const [customFields, setCustomFields] = useState<CustomField[]>(DEFAULT_FIELDS);

  // Cases State
  const [cases, setCases] = useState<CaseRecord[]>([]);

  // App Settings (Header Title & Subtitle)
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appTitle: 'Gestor de Casos',
    appSubtitle: 'Ticketera con campos personalizables y vista editable',
  });

  // Hierarchy Buttons Presets State (Loaded from Excel) — multiple independent blocks
  const [hierarchyConfigs, setHierarchyConfigs] = useState<HierarchyPresetConfig[]>([]);

  // Field Areas: editable section headings that group custom fields on the forms
  const [fieldAreas, setFieldAreas] = useState<FieldArea[]>(DEFAULT_FIELD_AREAS);

  // Passive success notification (e.g. "Caso creado con éxito")
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Tab: 'table' | 'fields' | 'analytics'
  const [activeTab, setActiveTab] = useState<'table' | 'fields' | 'analytics'>('table');

  // Security guard for admin-only tab
  useEffect(() => {
    if (activeTab === 'fields' && !isAdmin) {
      setActiveTab('table');
    }
  }, [activeTab, isAdmin]);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [selectedCaseForModal, setSelectedCaseForModal] = useState<CaseRecord | null>(null);

  // True until the cases listener delivers its first snapshot, so the table
  // can show a loading state instead of a misleading "no cases found".
  const [isLoadingCases, setIsLoadingCases] = useState(true);

  // Real-time Firestore subscriptions
  useEffect(() => {
    const unsubscribeCases = subscribeToCases((fetchedCases) => {
      // Filter out old legacy demo mock cases CAS-1001 through CAS-1005 if present
      const cleanCases = fetchedCases.filter((c) => !['CAS-1001', 'CAS-1002', 'CAS-1003', 'CAS-1004', 'CAS-1005'].includes(c.id));
      setCases(cleanCases);
      setIsLoadingCases(false);
    });

    const unsubscribeFields = subscribeToCustomFields((fetchedFields) => {
      if (fetchedFields.length === 0) {
        // Seed initial default fields if collection is completely empty
        setCustomFields(DEFAULT_FIELDS);
        saveAllCustomFieldsToFirestore(DEFAULT_FIELDS);
        return;
      }

      // Only backfill missing SYSTEM fields (id, titulo, estado, prioridad, etc.) —
      // those can't be deleted from the UI, so their absence only ever means this
      // install predates them. Regular fields (departamento, sede, origen, programa...)
      // must NOT be auto re-added, or admins could never permanently delete a field.
      const missingSystemFields = DEFAULT_FIELDS.filter(
        (df) => df.isSystem && !fetchedFields.some((f) => f.id === df.id)
      );

      // One-time label migration: installs seeded before the "id" field was
      // renamed still have the old label stored in Firestore.
      const idField = fetchedFields.find((f) => f.id === 'id');
      const idLabelStale = idField && idField.label === 'Código / ID';

      if (missingSystemFields.length > 0 || idLabelStale) {
        const merged = [...fetchedFields, ...missingSystemFields].map((item, idx) => ({
          ...item,
          ...(item.id === 'id' && idLabelStale ? { label: 'Número de caso' } : {}),
          order: idx + 1,
        }));
        setCustomFields(merged);
        saveAllCustomFieldsToFirestore(merged);
      } else {
        setCustomFields(fetchedFields);
      }
    });

    const unsubscribeSettings = subscribeToAppSettings((fetchedSettings) => {
      if (fetchedSettings && fetchedSettings.appTitle) {
        setAppSettings(fetchedSettings);
      }
    });

    const unsubscribeHierarchy = subscribeToHierarchyPresets((fetchedConfigs) => {
      setHierarchyConfigs(fetchedConfigs);
    });

    const unsubscribeFieldAreas = subscribeToFieldAreas((fetchedAreas) => {
      if (fetchedAreas.length === 0) {
        setFieldAreas(DEFAULT_FIELD_AREAS);
        saveFieldAreasToFirestore(DEFAULT_FIELD_AREAS);
      } else {
        setFieldAreas(fetchedAreas);
      }
    });

    return () => {
      unsubscribeCases();
      unsubscribeFields();
      unsubscribeSettings();
      unsubscribeHierarchy();
      unsubscribeFieldAreas();
    };
  }, []);

  useEffect(() => {
    if (currentUserEmail) {
      localStorage.setItem('ticketera_user_email', currentUserEmail);
    } else {
      localStorage.removeItem('ticketera_user_email');
    }
  }, [currentUserEmail]);

  // Sync selected case modal when real-time updates happen
  useEffect(() => {
    if (selectedCaseForModal) {
      const updated = cases.find((c) => c.id === selectedCaseForModal.id);
      if (updated) {
        setSelectedCaseForModal(updated);
      }
    }
  }, [cases]);

  // Auth actions
  const handleLogin = (email: string, profile: UserProfile) => {
    setCurrentUserEmail(email);
    setCurrentUserProfile(profile);
    setShowLoginModal(false);
  };

  const handleChangeUser = () => {
    setCurrentUserEmail(null);
    setCurrentUserProfile(null);
    localStorage.removeItem('ticketera_user_email');
    setShowLoginModal(true);
  };

  // Case actions (persisted live to Firestore)
  const handleSaveNewCase = async (newCase: CaseRecord) => {
    // If the user changed Origen/Programa away from their inherited default
    // while creating this case, that new value becomes the default going forward.
    if (currentUserEmail) {
      const newOrigen = newCase.customValues.origen;
      const newPrograma = newCase.customValues.programa;
      if (
        (newOrigen && newOrigen !== currentUserProfile?.origen) ||
        (newPrograma && newPrograma !== currentUserProfile?.programa)
      ) {
        const updatedProfile: UserProfile = {
          origen: newOrigen || currentUserProfile?.origen || '',
          programa: newPrograma || currentUserProfile?.programa || '',
        };
        setCurrentUserProfile(updatedProfile);
        storeProfile(currentUserEmail, updatedProfile);
      }
    }
    setToastMessage(`Caso ${newCase.id} creado con éxito`);
    await saveCaseToFirestore(newCase);
  };

  const handleUpdateCase = async (updatedCase: CaseRecord) => {
    await saveCaseToFirestore(updatedCase);
  };

  const handleDeleteCases = async (caseIds: string[]) => {
    await deleteMultipleCasesFromFirestore(caseIds);
  };

  const handleDeleteSingleCase = async (caseId: string) => {
    await deleteCaseFromFirestore(caseId);
    if (selectedCaseForModal && selectedCaseForModal.id === caseId) {
      setSelectedCaseForModal(null);
    }
  };

  // Custom Field actions (persisted live to Firestore)
  const handleAddField = async (newField: CustomField) => {
    await saveCustomFieldToFirestore(newField);
  };

  const handleUpdateField = async (updatedField: CustomField) => {
    await saveCustomFieldToFirestore(updatedField);
  };

  const handleDeleteField = async (fieldId: string) => {
    await deleteCustomFieldFromFirestore(fieldId);
  };

  const handleReorderFields = async (orderedFields: CustomField[]) => {
    await saveAllCustomFieldsToFirestore(orderedFields);
  };

  // Filter cases by global search query
  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (c.id.toLowerCase().includes(q)) return true;
    if (c.titulo.toLowerCase().includes(q)) return true;
    if ((c.solicitanteEmail || '').toLowerCase().includes(q)) return true;
    if (c.estado.toLowerCase().includes(q)) return true;
    if (c.prioridad.toLowerCase().includes(q)) return true;
    if ((c.creadoPor || '').toLowerCase().includes(q)) return true;
    // Search inside comments
    if (c.comentarios?.some((comment) => comment.text.toLowerCase().includes(q))) return true;
    // Search inside custom field values
    return Object.values(c.customValues || {}).some((val) =>
      String(val ?? '').toLowerCase().includes(q)
    );
  });

  const handleSaveAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    saveAppSettingsToFirestore(newSettings);
  };

  const handleSaveHierarchyConfigs = (newConfigs: HierarchyPresetConfig[]) => {
    setHierarchyConfigs(newConfigs);
    saveHierarchyPresetsToFirestore(newConfigs);
  };

  const handleSaveFieldAreas = async (newAreas: FieldArea[]) => {
    setFieldAreas(newAreas);
    await saveFieldAreasToFirestore(newAreas);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-200">
      
      {/* Login Screen / Modal */}
      {showLoginModal && (
        <LoginModal
          onLogin={handleLogin}
          currentEmail={currentUserEmail || undefined}
        />
      )}

      {/* Header Bar */}
      <Header
        currentUserEmail={currentUserEmail || 'Invitado'}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewCaseModal={() => setIsNewCaseModalOpen(true)}
        onChangeUser={handleChangeUser}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalCasesCount={cases.length}
        appSettings={appSettings}
        onSaveAppSettings={handleSaveAppSettings}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: EXCEL TABLE VIEW */}
        {activeTab === 'table' && (
          <ExcelTableTab
            cases={filteredCases}
            customFields={customFields}
            onUpdateCase={handleUpdateCase}
            onSelectCase={(c) => setSelectedCaseForModal(c)}
            onOpenNewCaseModal={() => setIsNewCaseModalOpen(true)}
            onDeleteCases={handleDeleteCases}
            onReorderFields={handleReorderFields}
            currentUserEmail={currentUserEmail || 'invitado@empresa.com'}
            isLoading={isLoadingCases}
          />
        )}

        {/* TAB 2: CUSTOM FIELDS CONFIGURATION */}
        {activeTab === 'fields' && isAdmin && (
          <FieldsConfigTab
            customFields={customFields}
            onAddField={handleAddField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onReorderFields={handleReorderFields}
            hierarchyConfigs={hierarchyConfigs}
            onSaveHierarchyConfigs={handleSaveHierarchyConfigs}
            fieldAreas={fieldAreas}
            onSaveFieldAreas={handleSaveFieldAreas}
          />
        )}

        {/* TAB 4: METRICS & ANALYTICS */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            cases={cases}
            customFields={customFields}
          />
        )}

      </main>

      {/* Modals */}
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        onSave={handleSaveNewCase}
        customFields={customFields}
        currentUserEmail={currentUserEmail || 'invitado@empresa.com'}
        hierarchyConfigs={hierarchyConfigs}
        userProfile={currentUserProfile}
        fieldAreas={fieldAreas}
      />

      <CaseModal
        key={selectedCaseForModal?.id}
        isOpen={Boolean(selectedCaseForModal)}
        caseRecord={selectedCaseForModal}
        onClose={() => setSelectedCaseForModal(null)}
        onUpdate={handleUpdateCase}
        onDelete={handleDeleteSingleCase}
        customFields={customFields}
        currentUserEmail={currentUserEmail || 'invitado@empresa.com'}
        hierarchyConfigs={hierarchyConfigs}
        fieldAreas={fieldAreas}
      />

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}

    </div>
  );
}
