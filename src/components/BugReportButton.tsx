'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type FormState = 'idle' | 'open' | 'submitting' | 'success' | 'error';

export default function BugReportButton() {
  const [state, setState] = useState<FormState>('idle');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
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
              <p className="rounded-lg bg-green-50 p-4 text-green-800">
                Děkujeme za hlášení! Chybu se pokusíme co nejdříve opravit.
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
