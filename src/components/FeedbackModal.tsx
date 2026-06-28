import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID as string | undefined;

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !FORMSPREE_ID) return;

    setStatus('sending');
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message, _subject: 'Where Weather 피드백' }),
      });
      if (res.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">{t('feedback.title')}</h2>
          <button type="button" className="opacity-50 hover:opacity-100" onClick={onClose}>✕</button>
        </div>

        {status === 'sent' ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-2xl">🙏</p>
            <p className="text-white font-medium">{t('feedback.sent')}</p>
            <p className="text-sm text-slate-400">{t('feedback.sentBody')}</p>
            <button type="button" className="ww-btn mt-3" onClick={onClose}>{t('feedback.close')}</button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <p className="text-sm text-slate-400">{t('feedback.body')}</p>
            <textarea
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
              rows={5}
              placeholder={t('feedback.placeholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
            />
            {status === 'error' && (
              <p className="text-xs text-red-400">{t('feedback.error')}</p>
            )}
            {!FORMSPREE_ID && (
              <p className="text-xs text-amber-400">{t('feedback.notConfigured')}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="ww-btn-ghost !py-1.5 !px-4" onClick={onClose}>
                {t('feedback.cancel')}
              </button>
              <button
                type="submit"
                className="ww-btn !py-1.5 !px-4"
                disabled={status === 'sending' || !message.trim()}
              >
                {status === 'sending' ? t('feedback.sending') : t('feedback.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
