import { SchoolNote as SchoolNoteType, getNoteStyle } from '@/lib/school-notes';

interface SchoolNoteProps {
  note: SchoolNoteType;
  compact?: boolean;
}

/**
 * Komponenta pro zobrazení poznámky ke škole/oboru
 */
export function SchoolNote({ note, compact = false }: SchoolNoteProps) {
  const style = getNoteStyle(note.type);

  if (compact) {
    // Kompaktní verze pro seznamy
    return (
      <div className={`flex items-start gap-2 p-2 rounded-lg border ${style.bgColor} ${style.borderColor}`}>
        <span className="text-base shrink-0">{style.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium ${style.color}`}>{note.title}</p>
          <p className={`text-xs ${style.color} opacity-90 mt-0.5`}>{note.message}</p>
        </div>
      </div>
    );
  }

  // Plná verze pro detail školy
  return (
    <div className={`rounded-lg border ${style.bgColor} ${style.borderColor} p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm ${style.color} mb-1`}>{note.title}</h3>
          <p className={`text-sm ${style.color} mb-2`}>{note.message}</p>
          {note.source && (
            <p className={`text-xs ${style.color} opacity-75`}>
              Zdroj: {note.source} • {new Date(note.date).toLocaleDateString('cs-CZ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Komponenta pro zobrazení seznamu poznámek
 */
export function SchoolNotes({ notes }: { notes: SchoolNoteType[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="space-y-3">
      {notes.map((note, idx) => (
        <SchoolNote key={idx} note={note} />
      ))}
    </div>
  );
}
