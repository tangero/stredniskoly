'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type FormState = 'idle' | 'open' | 'submitting' | 'success' | 'error';

export default function BugReportButton() {
  const [state, setState] = useState<FormState>('idle');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [errorMessage, setErrorMessage] = useState('');
  const [showTips, setShowTips] = useState(false);
  const [issueUrl, setIssueUrl] = useState('');

  const buttonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const open = () => {
    setState('open');
    setErrorMessage('');
  };

  const close = useCallback(() => {
    setState('idle');
    setDescription('');
    setEmail('');
    setErrorMessage('');
    buttonRef.current?.focus();
  }, []);

  // Focus textarea when modal opens
  useEffect(() => {
    if (state === 'open') {
      // Small delay so the DOM is ready
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [state]);

  // Auto-close on success
  useEffect(() => {
    if (state === 'success') {
      const timer = setTimeout(close, 3000);
      return () => clearTimeout(timer);
    }
  }, [state, close]);

  // Close on Escape
  useEffect(() => {
    if (state === 'idle') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [state, close]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setErrorMessage('Popis musí mít alespoň 10 znaků.');
      return;
    }

    setState('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: trimmed,
          email: email.trim() || undefined,
          website: website, // Honeypot field
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.issueUrl) {
          setIssueUrl(data.issueUrl);
        }
        setState('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Nepodařilo se odeslat hlášení.');
        setState('error');
      }
    } catch {
      setErrorMessage('Chyba připojení. Zkuste to prosím znovu.');
      setState('error');
    }
  };

  const isModalOpen = state !== 'idle';

  return (
    <>
      {/* Floating button */}
      <button
        ref={buttonRef}
        onClick={open}
        aria-label="Nahlásit chybu"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-semibold text-white"
        style={{ backgroundColor: '#0074e4' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Nahlásit chybu
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Nahlásit chybu"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-gray-900">Nahlásit chybu</h2>

            {state === 'success' ? (
              <div className="rounded-lg bg-green-50 p-4 space-y-3">
                <p className="text-green-800 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Děkujeme za hlášení!
                </p>
                <p className="text-sm text-green-700">
                  Chybu se pokusíme co nejdříve opravit. Pokud jste zadali e-mail, budeme vás informovat o průběhu opravy.
                </p>
                <div className="text-xs text-green-600 bg-green-100 rounded px-3 py-2">
                  <p className="font-medium mb-1">🤖 Automatická oprava</p>
                  <p>Pokud je problém jednoduchý, náš AI bot se pokusí o automatickou opravu během několika minut.</p>
                </div>
                {issueUrl && (
                  <a
                    href={issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-700 hover:text-green-900 underline block"
                  >
                    Sledovat hlášení na GitHubu →
                  </a>
                )}
              </div>
            ) : (
              <>
                {/* Pokyny pro kvalitní bug report */}
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50">
                  <button
                    type="button"
                    onClick={() => setShowTips(!showTips)}
                    className="flex w-full items-center justify-between p-3 text-left text-sm font-medium text-blue-900 hover:bg-blue-100 transition-colors rounded-lg"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      💡 Jak napsat dobré hlášení?
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${showTips ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showTips && (
                    <div className="px-3 pb-3 text-xs text-blue-800 space-y-2">
                      <p className="font-medium mb-2">Popište prosím:</p>
                      <ul className="space-y-1.5 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">✓</span>
                          <span><strong>Co se stalo:</strong> Jaká chyba se objevila? Co nefunguje?</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">✓</span>
                          <span><strong>Jak to zopakovat:</strong> Jaké kroky vedly k chybě?</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">✓</span>
                          <span><strong>Co jste čekali vs co se stalo:</strong> Jaký byl rozdíl?</span>
                        </li>
                      </ul>
                      <p className="text-blue-700 mt-3 pt-2 border-t border-blue-200">
                        <strong>Příklad:</strong> &quot;Škola ukazuje 71 bodů, ale po rozkliknutí ČJ 22 + MA 11 = 33. Čekal jsem stejné číslo.&quot;
                      </p>
                      <p className="text-blue-600 mt-2 text-[11px]">
                        ℹ️ URL stránky, zařízení a čas sbíráme automaticky
                      </p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit}>
                {/* Honeypot field - hidden from normal users */}
                <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="bug-description">
                  Popis chyby <span className="text-red-500">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  id="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Popište, co nefunguje správně…"
                  maxLength={2000}
                  rows={4}
                  required
                  className="mb-3 w-full rounded-lg border border-gray-300 p-3 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                  disabled={state === 'submitting'}
                />

                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="bug-email">
                  E-mail <span className="text-gray-400">(volitelné)</span>
                </label>
                <input
                  id="bug-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  maxLength={320}
                  className="mb-4 w-full rounded-lg border border-gray-300 p-3 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ fontSize: '16px' }}
                  disabled={state === 'submitting'}
                />

                {errorMessage && (
                  <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={state === 'submitting'}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                    style={{ backgroundColor: '#0074e4' }}
                  >
                    {state === 'submitting' ? 'Odesílání…' : 'Odeslat'}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    disabled={state === 'submitting'}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                  >
                    Zrušit
                  </button>
                </div>
              </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
