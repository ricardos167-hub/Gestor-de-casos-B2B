import * as XLSX from 'xlsx';
import { HierarchyNode, HierarchyPresetConfig } from '../types';

// The parsed Excel data only produces the tree/levels; id/name/order/areaId
// belong to whichever hierarchy block the caller merges this data into.
export type ParsedHierarchyData = Pick<HierarchyPresetConfig, 'levels' | 'tree' | 'updatedAt'>;

export function parseExcelToHierarchy(fileBuffer: ArrayBuffer): ParsedHierarchyData {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Parse worksheet into rows (array of arrays)
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (!rawRows || rawRows.length === 0) {
    throw new Error('El archivo Excel está vacío.');
  }

  // Filter out empty rows
  const cleanRows = rawRows.filter(row => row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));

  if (cleanRows.length < 2) {
    throw new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos.');
  }

  // First row is headers (level names)
  const headers = cleanRows[0].map((h: any, idx: number) => {
    const headerStr = String(h || '').trim();
    return headerStr || `Nivel ${idx + 1}`;
  });

  const dataRows = cleanRows.slice(1);
  const rootNodes: HierarchyNode[] = [];

  dataRows.forEach((row, rowIndex) => {
    let currentLevelNodes = rootNodes;

    headers.forEach((_, colIndex) => {
      const cellValue = row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]).trim() : '';
      if (!cellValue) return; // Skip empty level cells

      // Find existing node at this level with same name
      let existingNode = currentLevelNodes.find(n => n.name.toLowerCase() === cellValue.toLowerCase());

      if (!existingNode) {
        existingNode = {
          id: `node_${colIndex}_${rowIndex}_${Math.random().toString(36).substr(2, 6)}`,
          name: cellValue,
          children: []
        };
        currentLevelNodes.push(existingNode);
      }

      if (!existingNode.children) {
        existingNode.children = [];
      }
      currentLevelNodes = existingNode.children;
    });
  });

  // Helper to remove empty children arrays
  const cleanTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
    return nodes.map(n => {
      const copy = { ...n };
      if (copy.children && copy.children.length > 0) {
        copy.children = cleanTree(copy.children);
      } else {
        delete copy.children;
      }
      return copy;
    });
  };

  return {
    levels: headers,
    tree: cleanTree(rootNodes),
    updatedAt: new Date().toISOString()
  };
}

export function downloadHierarchyTemplateExcel() {
  const exampleData = [
    ["Categoría (Nivel 1)", "Subcategoría (Nivel 2)", "Tipo de Incidencia (Nivel 3)"],
    ["Sistemas e Informática", "Soporte Técnico", "Laptop no enciende / Pantalla negra"],
    ["Sistemas e Informática", "Soporte Técnico", "Instalación de Software o Licencia"],
    ["Sistemas e Informática", "Accesos y Permisos", "Restablecer Contraseña de Correo"],
    ["Sistemas e Informática", "Accesos y Permisos", "Solicitar Permiso a Carpeta Compartida"],
    ["Infraestructura y Redes", "Conectividad", "Fallo de WiFi en Oficina"],
    ["Infraestructura y Redes", "Conectividad", "Cable de Red Dañado"],
    ["Infraestructura y Redes", "Impresoras", "Impresora atascada o sin tóner"],
    ["Recursos Humanos", "Beneficios", "Consulta de Seguros y EPS"],
    ["Recursos Humanos", "Vacaciones", "Solicitud de Días de Vacaciones"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(exampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jerarquías de Casos");

  XLSX.writeFile(wb, "Plantilla_Jerarquias_Casos.xlsx");
}
