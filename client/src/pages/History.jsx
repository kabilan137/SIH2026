import { Eye, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import PageLoader from '../components/PageLoader.jsx';
import { useAnalysis } from '../hooks/useAnalysis.js';

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function History() {
  const { t, i18n } = useTranslation();
  const { loadHistory, removeHistoryItem, state } = useAnalysis();

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  async function handleDelete(id) {
    await removeHistoryItem(id);
  }

  return (
    <div className="history-page">
      <section className="panel animate-in">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">{t('history.subtitle', 'Saved analyses')}</p>
            <h1>{t('history.title', 'History')}</h1>
          </div>
        </div>

        {state.loading && <PageLoader label={t('common.loading', 'Loading history')} />}
        {state.error && <div className="error-banner">{state.error}</div>}

        <div className="history-list">
          {state.history.length === 0 && !state.loading ? (
            <div className="empty-state">{t('history.empty', 'No saved analyses yet. Run your first analysis to get started.')}</div>
          ) : (
            state.history.map((item, index) => (
              <article
                className="history-row"
                key={item.id}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div>
                  <h2>{item.location}</h2>
                  <p>
                    {item.businessType}
                    {item.niche ? ` · ${item.niche}` : ''}
                  </p>
                  <span>{formatDate(item.createdAt, i18n.language === 'ta' ? 'ta-IN' : 'en-US')}</span>
                </div>

                <div className="history-metrics">
                  <strong>{item.overallScore}</strong>
                  <span>{t('scoreCard.grade', 'Grade')} {item.grade}</span>
                </div>

                <div className="row-actions">
                  <Link to={`/analysis/${item.id}`} className="icon-button" aria-label={`${t('history.viewReport', 'View')} ${item.location}`} title={t('history.viewReport', 'View Report')}>
                    <Eye size={16} aria-hidden="true" />
                  </Link>
                  <button className="icon-button danger" type="button" onClick={() => handleDelete(item.id)} aria-label={t('history.delete', 'Delete')} title={t('history.delete', 'Delete')}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default History;
