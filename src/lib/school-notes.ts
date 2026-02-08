import { promises as fs } from 'fs';
import path from 'path';

export interface SchoolNote {
  type: 'warning' | 'info' | 'update';
  title: string;
  message: string;
  source?: string;
  date: string;
  expires?: string;
}

interface SchoolNotesData {
  meta: {
    version: string;
    last_updated: string;
    description: string;
  };
  notes: Record<string, SchoolNote>;
  types: Record<string, {
    icon: string;
    color: string;
    description: string;
  }>;
}

let notesCache: SchoolNotesData | null = null;

/**
 * Načte poznámky ke školám ze school_notes.json
 */
export async function getSchoolNotes(): Promise<SchoolNotesData> {
  if (notesCache) return notesCache;

  const dataDir = path.join(process.cwd(), 'public');
  const filePath = path.join(dataDir, 'school_notes.json');

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    notesCache = JSON.parse(data);
    return notesCache!;
  } catch (error) {
    console.error('Error loading school notes:', error);
    // Vrátit prázdnou strukturu pokud soubor neexistuje
    return {
      meta: { version: '1.0', last_updated: '', description: '' },
      notes: {},
      types: {
        warning: { icon: '⚠️', color: 'amber', description: '' },
        info: { icon: 'ℹ️', color: 'blue', description: '' },
        update: { icon: '🔄', color: 'green', description: '' },
      },
    };
  }
}

/**
 * Získá poznámku pro konkrétní školu/obor
 * @param schoolId - ID školy ve formátu "redizo_kkov"
 */
export async function getNoteForSchool(schoolId: string): Promise<SchoolNote | null> {
  const data = await getSchoolNotes();
  const note = data.notes[schoolId];

  if (!note) return null;

  // Zkontroluj expiraci
  if (note.expires) {
    const expiresDate = new Date(note.expires);
    const now = new Date();
    if (now > expiresDate) {
      return null; // Poznámka expirovala
    }
  }

  return note;
}

/**
 * Získá všechny poznámky pro školu (podle RED IZO)
 * @param redizo - RED IZO školy
 */
export async function getNotesForRedizo(redizo: string): Promise<Array<{ schoolId: string; note: SchoolNote }>> {
  const data = await getSchoolNotes();
  const results: Array<{ schoolId: string; note: SchoolNote }> = [];

  for (const [schoolId, note] of Object.entries(data.notes)) {
    if (schoolId.startsWith(redizo)) {
      // Zkontroluj expiraci
      if (note.expires) {
        const expiresDate = new Date(note.expires);
        const now = new Date();
        if (now > expiresDate) continue;
      }
      results.push({ schoolId, note });
    }
  }

  return results;
}

/**
 * Získá ikonu a barvu pro typ poznámky
 */
export function getNoteStyle(type: SchoolNote['type']): { icon: string; color: string; bgColor: string; borderColor: string } {
  const styles = {
    warning: {
      icon: '⚠️',
      color: 'text-amber-900',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
    },
    info: {
      icon: 'ℹ️',
      color: 'text-blue-900',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
    },
    update: {
      icon: '🔄',
      color: 'text-green-900',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
    },
  };

  return styles[type] || styles.info;
}
