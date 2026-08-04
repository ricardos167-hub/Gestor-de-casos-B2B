import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CaseRecord, CustomField, AppSettings, HierarchyPresetConfig, FieldArea } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// ignoreUndefinedProperties: the app frequently builds records with optional
// fields left as `undefined` (e.g. a non-select CustomField's `options`);
// without this, Firestore throws on write and the error is silently swallowed
// by callers that don't await/catch, making the UI look like "nothing happened".
//
// localCache (persistentLocalCache): caches all Firestore data in the browser's
// IndexedDB. onSnapshot listeners fire immediately from that local cache on
// startup (near-instant table load) while Firestore syncs with the server in
// the background — instead of the table sitting empty until the first network
// round trip completes. persistentMultipleTabManager avoids the "failed-precondition"
// error when the app is open in more than one browser tab at once.
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    }, databaseId);
  } catch {
    // initializeFirestore throws if Firestore was already initialized for this app
    // (e.g. hot reload) — fall back to the existing instance.
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
})();

// Realtime subscription for cases
export function subscribeToCases(callback: (cases: CaseRecord[]) => void) {
  const casesRef = collection(db, 'cases');
  return onSnapshot(casesRef, (snapshot) => {
    const casesList: CaseRecord[] = [];
    snapshot.forEach((docSnap) => {
      casesList.push(docSnap.data() as CaseRecord);
    });
    // Sort by fechaCreacion desc
    casesList.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
    callback(casesList);
  }, (error) => {
    console.error('Error listening to cases:', error);
  });
}

// Realtime subscription for custom fields
export function subscribeToCustomFields(callback: (fields: CustomField[]) => void) {
  const fieldsRef = collection(db, 'customFields');
  return onSnapshot(fieldsRef, (snapshot) => {
    const fieldsList: CustomField[] = [];
    snapshot.forEach((docSnap) => {
      fieldsList.push(docSnap.data() as CustomField);
    });
    fieldsList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    callback(fieldsList);
  }, (error) => {
    console.error('Error listening to customFields:', error);
  });
}

// Atomically generates the next sequential case number (RS000001, RS000002, ...)
// via a Firestore transaction so concurrent case creations never collide.
export async function getNextCaseId(): Promise<string> {
  const counterRef = doc(db, 'appSettings', 'caseCounter');
  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists() ? Number(snap.data().lastNumber) || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { lastNumber: next }, { merge: true });
    return next;
  });
  return `RS${String(nextNumber).padStart(6, '0')}`;
}

// Save or Update Case
export async function saveCaseToFirestore(caseRecord: CaseRecord) {
  const docRef = doc(db, 'cases', caseRecord.id);
  await setDoc(docRef, caseRecord, { merge: true });
}

// Delete Case
export async function deleteCaseFromFirestore(caseId: string) {
  const docRef = doc(db, 'cases', caseId);
  await deleteDoc(docRef);
}

// Bulk Delete Cases
export async function deleteMultipleCasesFromFirestore(caseIds: string[]) {
  const batch = writeBatch(db);
  caseIds.forEach((id) => {
    const docRef = doc(db, 'cases', id);
    batch.delete(docRef);
  });
  await batch.commit();
}

// Save or Update Custom Field
export async function saveCustomFieldToFirestore(field: CustomField) {
  const docRef = doc(db, 'customFields', field.id);
  await setDoc(docRef, field, { merge: true });
}

// Save All Custom Fields (e.g. reorder or batch init)
export async function saveAllCustomFieldsToFirestore(fields: CustomField[]) {
  const batch = writeBatch(db);
  fields.forEach((field) => {
    const docRef = doc(db, 'customFields', field.id);
    batch.set(docRef, field);
  });
  await batch.commit();
}

// Delete Custom Field
export async function deleteCustomFieldFromFirestore(fieldId: string) {
  const docRef = doc(db, 'customFields', fieldId);
  await deleteDoc(docRef);
}

// App Settings (Header title & subtitle)
export function subscribeToAppSettings(callback: (settings: AppSettings) => void) {
  const docRef = doc(db, 'appSettings', 'headerConfig');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AppSettings);
    } else {
      callback({
        appTitle: 'Gestor de Casos',
        appSubtitle: 'Ticketera con campos personalizables y vista editable'
      });
    }
  }, (error) => {
    console.error('Error listening to appSettings:', error);
  });
}

export async function saveAppSettingsToFirestore(settings: AppSettings) {
  const docRef = doc(db, 'appSettings', 'headerConfig');
  await setDoc(docRef, settings, { merge: true });
}

// Field Areas (editable section headings that group custom fields on the forms)
export function subscribeToFieldAreas(callback: (areas: FieldArea[]) => void) {
  const docRef = doc(db, 'appSettings', 'fieldAreas');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists() && Array.isArray(docSnap.data().areas)) {
      callback(docSnap.data().areas as FieldArea[]);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Error listening to fieldAreas:', error);
  });
}

export async function saveFieldAreasToFirestore(areas: FieldArea[]) {
  const docRef = doc(db, 'appSettings', 'fieldAreas');
  await setDoc(docRef, { areas });
}

// Hierarchy Preset Config (Buttons generated from Excel)
export function subscribeToHierarchyPresets(callback: (config: HierarchyPresetConfig | null) => void) {
  const docRef = doc(db, 'appSettings', 'hierarchyPresets');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as HierarchyPresetConfig);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to hierarchyPresets:', error);
  });
}

export async function saveHierarchyPresetsToFirestore(config: HierarchyPresetConfig) {
  const docRef = doc(db, 'appSettings', 'hierarchyPresets');
  await setDoc(docRef, config);
}
