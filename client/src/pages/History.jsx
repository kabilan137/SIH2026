import { Eye, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import PageLoader from '../components/PageLoader.jsx';
import { useAnalysis } from '../hooks/useAnalysis.js';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function History() {
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
            <p className="eyebrow">Saved analyses</p>
            <h1>History</h1>
          </div>
        </div>

        {state.loading && <PageLoader label="Loading history" />}
        {state.error && <div className="error-banner">{state.error}</div>}

        <div className="history-list">
          {state.history.length === 0 && !state.loading ? (
            <div className="empty-state">No saved analyses yet. Run your first analysis to get started.</div>
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
                  <span>{formatDate(item.createdAt)}</span>
                </div>

                <div className="history-metrics">
                  <strong>{item.overallScore}</strong>
                  <span>Grade {item.grade}</span>
                </div>

                <div className="row-actions">
                  <Link to={`/analysis/${item.id}`} className="icon-button" aria-label={`View ${item.location}`}>
                    <Eye size={16} aria-hidden="true" />
                  </Link>
                  <button className="icon-button danger" type="button" onClick={() => handleDelete(item.id)}>
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
