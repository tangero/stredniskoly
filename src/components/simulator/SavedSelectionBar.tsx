'use client';

interface SavedItem {
  id: string;
  label: string;
}

interface Props {
  items: SavedItem[];
  storageStatus: string;
  onlySaved: boolean;
  onToggleOnlySaved: () => void;
  onRemove: (id: string) => void;
  onShare: () => void;
  /** Kolik oborů odkaz unese; méně než uložených znamená viditelné zkrácení. */
  shareableCount: number;
}

const countLabel = (n: number) => `${n} ${n === 1 ? 'uložený obor' : n >= 2 && n <= 4 ? 'uložené obory' : 'uložených oborů'}`;

export function SavedSelectionBar({ items, storageStatus, onlySaved, onToggleOnlySaved, onRemove, onShare, shareableCount }: Props) {
  const truncated = items.length - shareableCount;

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600">
        Zatím nemáš uložený žádný obor. Hvězdičkou u oboru si ho ulož mezi kandidáty; ukládat jich můžeš, kolik potřebuješ.
      </p>
    );
  }

  return (
    <section aria-label="Uložený výběr" className="rounded-xl border border-blue-300 border-l-4 bg-blue-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div>
          <p className="font-semibold text-blue-900">{countLabel(items.length)}</p>
          <p className="text-xs text-slate-600">{storageStatus || 'Uloženo v tomto prohlížeči.'}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleOnlySaved}
            aria-pressed={onlySaved}
            className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-600 ${
              onlySaved ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {onlySaved ? 'Zobrazit všechny obory' : 'Zobrazit jen uložené'}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="min-h-11 rounded-lg border border-blue-400 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Sdílet výběr
          </button>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map(item => (
          <li key={item.id} className="flex max-w-full items-center gap-1 rounded-full border border-slate-300 bg-white py-1 pl-3 pr-1 text-xs">
            <span className="truncate">{item.label}</span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Odebrat z výběru: ${item.label}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>

      {truncated > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-amber-900">
          Odkaz unese {shareableCount} z tvých {items.length} oborů, protože adresa má omezenou délku.
          Uložený výběr zůstává v tomto prohlížeči celý; zkrácené je jen sdílení.
        </p>
      )}
    </section>
  );
}
