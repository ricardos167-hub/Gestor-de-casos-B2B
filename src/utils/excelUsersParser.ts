import * as XLSX from 'xlsx';

export interface ParsedUserEntry {
  email: string;
  password: string;
}

export interface ParsedUsersResult {
  entries: ParsedUserEntry[];
  skipped: { email: string; reason: string }[];
}

const EMAIL_HEADER_ALIASES = ['email', 'correo', 'correo electronico', 'correo electrónico', 'usuario', 'user'];
const PASSWORD_HEADER_ALIASES = ['password', 'clave', 'contraseña', 'contrasena', 'pass'];

function normalizeHeader(h: any): string {
  return String(h ?? '').trim().toLowerCase();
}

export function parseExcelToUsers(fileBuffer: ArrayBuffer): ParsedUsersResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('El archivo Excel está vacío.');
  }

  const cleanRows = rawRows.filter((row) => row && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));

  if (cleanRows.length < 2) {
    throw new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos.');
  }

  const headers = cleanRows[0].map(normalizeHeader);
  const emailColIdx = headers.findIndex((h) => EMAIL_HEADER_ALIASES.includes(h));
  const passwordColIdx = headers.findIndex((h) => PASSWORD_HEADER_ALIASES.includes(h));

  if (emailColIdx === -1 || passwordColIdx === -1) {
    throw new Error('El archivo debe tener columnas de "Correo" y "Contraseña" (o "Email" / "Clave").');
  }

  const entries: ParsedUserEntry[] = [];
  const skipped: { email: string; reason: string }[] = [];
  const seenInFile = new Set<string>();

  cleanRows.slice(1).forEach((row, idx) => {
    const rawEmail = row[emailColIdx];
    const rawPassword = row[passwordColIdx];
    const email = rawEmail !== undefined && rawEmail !== null ? String(rawEmail).trim().toLowerCase() : '';
    const password = rawPassword !== undefined && rawPassword !== null ? String(rawPassword).trim() : '';

    if (!email && !password) return; // fully empty row, ignore silently

    const rowLabel = email || `fila ${idx + 2}`;

    if (!email || !email.includes('@') || !email.includes('.')) {
      skipped.push({ email: rowLabel, reason: 'Correo inválido o vacío' });
      return;
    }
    if (!password) {
      skipped.push({ email, reason: 'Contraseña vacía' });
      return;
    }
    if (seenInFile.has(email)) {
      skipped.push({ email, reason: 'Duplicado dentro del mismo archivo (se usó la primera aparición)' });
      return;
    }

    seenInFile.add(email);
    entries.push({ email, password });
  });

  return { entries, skipped };
}

export function downloadUsersTemplateExcel() {
  const exampleData = [
    ['Correo', 'Contraseña'],
    ['agente1@empresa.com', 'CambiaEsto123'],
    ['agente2@empresa.com', 'CambiaEsto456'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(exampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cuentas de Usuario');

  XLSX.writeFile(wb, 'Plantilla_Cuentas_Usuario.xlsx');
}
