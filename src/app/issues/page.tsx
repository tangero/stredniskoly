import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Nahlášené chyby a jejich zpracování',
  description: 'Přehled nahlášených chyb a informace o tom, jak je zpracováváme.',
};

// Typy pro GitHub Issues
interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  body: string;
}

// Fetch issues z GitHub API
async function fetchGitHubIssues(): Promise<GitHubIssue[]> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/tangero/stredniskoly/issues?labels=bug-report&state=all&per_page=50',
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        next: { revalidate: 300 }, // Revalidace každých 5 minut
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch issues:', response.status);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching GitHub issues:', error);
    return [];
  }
}

// Formátování data
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// Extrakce popisu z body (bez technických informací)
function extractDescription(body: string): string {
  // Odstraní Markdown headingy a technické detaily
  const lines = body.split('\n');
  const description: string[] = [];
  let inTechnicalSection = false;

  for (const line of lines) {
    if (line.includes('<details>') || line.includes('Technické informace')) {
      inTechnicalSection = true;
      continue;
    }
    if (line.includes('</details>')) {
      inTechnicalSection = false;
      continue;
    }
    if (inTechnicalSection) continue;
    if (line.startsWith('##')) continue;
    if (line.startsWith('**Kontakt:**')) continue;
    if (line.trim()) {
      description.push(line.trim());
    }
  }

  return description.join(' ').slice(0, 200) + (description.join(' ').length > 200 ? '...' : '');
}

export default async function IssuesPage() {
  const issues = await fetchGitHubIssues();
  const openIssues = issues.filter((i) => i.state === 'open');
  const closedIssues = issues.filter((i) => i.state === 'closed');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero sekce */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Nahlášené chyby</h1>
            <p className="text-lg opacity-90">
              Přehled všech nahlášených problémů a informace o jejich zpracování
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Statistiky */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-amber-600 text-sm font-medium mb-1">Otevřené</div>
              <div className="text-3xl font-bold text-amber-900">{openIssues.length}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-600 text-sm font-medium mb-1">Vyřešené</div>
              <div className="text-3xl font-bold text-green-900">{closedIssues.length}</div>
            </div>
          </div>

          {/* Jak zpracováváme chyby */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Jak zpracováváme nahlášené chyby
            </h2>
            <div className="space-y-3 text-sm text-blue-900">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div>
                  <strong>Automatické vytvoření:</strong> Každé hlášení se automaticky vytvoří jako GitHub Issue s labelem "bug-report"
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div>
                  <strong>Analýza a triáž:</strong> Používáme Claude Code pro automatickou analýzu a kategorizaci problémů
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div>
                  <strong>Oprava:</strong> Jednoduché chyby opravujeme automatizovaně, složitější problémy ručně
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  4
                </div>
                <div>
                  <strong>Nasazení:</strong> Opravy nasazujeme průběžně, většinou do 24-48 hodin
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  5
                </div>
                <div>
                  <strong>Oznámení:</strong> O vyřešení informujeme komentářem v issue (a emailem, pokud byl uveden)
                </div>
              </div>
            </div>
          </div>

          {/* Otevřené issues */}
          {openIssues.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🔧 Otevřené problémy ({openIssues.length})
              </h2>
              <div className="space-y-4">
                {openIssues.map((issue) => (
                  <div
                    key={issue.number}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-500">#{issue.number}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                            Otevřeno
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {issue.title.replace('[Bug Report] ', '')}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {extractDescription(issue.body)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📅 Nahlášeno: {formatDate(issue.created_at)}</span>
                          <a
                            href={issue.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Zobrazit na GitHubu →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vyřešené issues */}
          {closedIssues.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ✅ Vyřešené problémy ({closedIssues.length})
              </h2>
              <div className="space-y-3">
                {closedIssues.map((issue) => (
                  <div
                    key={issue.number}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">#{issue.number}</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            Vyřešeno
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-700 mb-1 text-sm">
                          {issue.title.replace('[Bug Report] ', '')}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>📅 {formatDate(issue.created_at)}</span>
                          <a
                            href={issue.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Detail →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Žádné issues */}
          {issues.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Zatím nejsou žádné nahlášené chyby!
              </h2>
              <p className="text-gray-600">
                Pokud narazíte na problém, klikněte na plovoucí tlačítko "Nahlásit chybu" v pravém dolním rohu.
              </p>
            </div>
          )}

          {/* CTA - Nahlásit chybu */}
          <div className="mt-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Našli jste chybu?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Pomozte nám zlepšit aplikaci! Klikněte na plovoucí tlačítko v pravém dolním rohu nebo
              přejděte přímo na GitHub.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://github.com/tangero/stredniskoly/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Vytvořit issue na GitHubu
              </a>
              <Link
                href="/"
                className="inline-block bg-blue-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-300 transition-colors"
              >
                Zpět na hlavní stránku
              </Link>
            </div>
          </div>

          {/* Technické info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Všechny bug reporty jsou veřejně dostupné na{' '}
              <a
                href="https://github.com/tangero/stredniskoly/issues?q=label%3Abug-report"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                GitHubu
              </a>
            </p>
            <p className="mt-1">Stránka se aktualizuje každých 5 minut</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
