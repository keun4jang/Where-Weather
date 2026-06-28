import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../generated/appVersion';
import FeedbackModal from './FeedbackModal';

export default function Footer() {
  const { t } = useTranslation();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <footer className="mx-auto mt-8 max-w-2xl px-4 pb-10 text-center text-xs text-slate-400">
        <p>{t('footer.madeWith')}</p>
        <p className="mt-1">
          {t('footer.openSource')} · {t('footer.version', { version: APP_VERSION })}
        </p>
        <button
          type="button"
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
          onClick={() => setShowFeedback(true)}
        >
          {t('footer.feedback')}
        </button>
      </footer>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
