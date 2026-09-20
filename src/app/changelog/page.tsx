import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { changelog, AKTUALNI_VERZE } from '@/lib/changelog';

export const metadata: Metadata = {
  alternates: { canonical: '/changelog' },
  title: 'Changelog - Historie verzí',
  description: 'Historie všech změn a verzí aplikace Přijímačky na střední školy.',
};

const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Nové', color: 'text-green-700', bg: 'bg-green-100' },
  fix: { label: 'Oprava', color: 'text-red-700', bg: 'bg-red-100' },
  improve: { label: 'Vylepšení', color: 'text-blue-700', bg: 'bg-blue-100' },
};

export default function ChangelogPage() {
  const currentVersion = AKTUALNI_VERZE;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Changelog</h1>
            <p className="text-lg opacity-90">
              Historie změn a verzí aplikace
            </p>
            <div className="mt-4 inline-block bg-white/20 rounded-lg px-4 py-2 text-sm">
              Aktuální verze: <strong>{currentVersion}</strong>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-8">
            {changelog.map((entry, idx) => (
              <div key={entry.version} className="relative">
                {/* Spojovací linka */}
                {idx < changelog.length - 1 && (
                  <div className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-slate-200 hidden sm:block" />
                )}

                <div className="flex gap-4">
                  {/* Verze badge */}
                  <div className="hidden sm:flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                      idx === 0 ? 'bg-blue-600' : 'bg-slate-400'
                    }`}>
                      {entry.version.split('.')[1]}
                    </div>
                  </div>

                  {/* Obsah */}
                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className={`px-6 py-4 border-b ${idx === 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`text-xl font-bold ${idx === 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                          v{entry.version}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                            Aktuální
                          </span>
                        )}
                        <span className="text-sm text-slate-500">{entry.date}</span>
                      </div>
                      <h2 className="font-semibold text-slate-900 mt-1">{entry.title}</h2>
                    </div>

                    <div className="px-6 py-4">
                      <ul className="space-y-2">
                        {entry.changes.map((change, changeIdx) => {
                          const t = typeLabels[change.type];
                          return (
                            <li key={changeIdx} className="flex items-start gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5 ${t.bg} ${t.color}`}>
                                {t.label}
                              </span>
                              <span className="text-sm text-slate-700">{change.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Odkaz na GitHub */}
          <div className="mt-12 text-center">
            <a
              href="https://github.com/tangero/stredniskoly"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Zdrojový kód na GitHubu
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
