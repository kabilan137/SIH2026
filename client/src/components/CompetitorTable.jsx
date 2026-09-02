import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, MessageSquare, Eye, Globe, Phone, ExternalLink, X, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

function formatRating(value) {
  return Number.isFinite(value) ? value.toFixed(1) : 'N/A';
}

function formatPrice(metadata) {
  if (metadata?.priceRange?.displayString) {
    return metadata.priceRange.displayString;
  }
  if (Number.isFinite(metadata?.priceLevel)) {
    if (metadata.priceLevel === 0) return 'Free';
    return '$'.repeat(metadata.priceLevel);
  }
  return 'N/A';
}

function getThreatClass(threat) {
  if (!threat || threat === 'Not assessed') return 'threat-badge--default';
  const lower = threat.toLowerCase();
  if (lower.includes('high')) return 'threat-badge--high';
  if (lower.includes('medium') || lower.includes('moderate')) return 'threat-badge--medium';
  if (lower.includes('low')) return 'threat-badge--low';
  return 'threat-badge--default';
}

function StarRating({ rating }) {
  if (!Number.isFinite(rating)) return null;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars = [];
  for (let i = 0; i < fullStars && i < 5; i++) {
    stars.push('★');
  }
  if (hasHalf && stars.length < 5) {
    stars.push('½');
  }
  return <span className="rating-stars" aria-hidden="true">{stars.join('')}</span>;
}

function CompetitorDetailsModal({ competitor, threat, onClose }) {
  const mapsUrl = competitor.googleMetadata?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(competitor.name + ' ' + (competitor.address || ''))}`;
  const reviewsUrl = `https://www.google.com/search?q=${encodeURIComponent(competitor.name + ' ' + (competitor.address || '') + ' reviews')}`;

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  function handleOverlayClick(e) {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container competitor-details-modal">
        <div className="modal-header">
          <h2>{competitor.name}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body competitor-modal-body">
          <div className="details-header-info">
            <div className="info-meta">
              <span className="info-pill category-pill">
                {competitor.businessCategory?.primaryType || 'Uncategorized'}
              </span>
              <span className="info-pill status-pill capitalize">
                Status: {competitor.businessStatus?.toLowerCase().replace('_', ' ') || 'Unknown'}
              </span>
            </div>
            
            <div className="info-rating-row">
              <span className="rating-value">{formatRating(competitor.rating)}</span>
              <StarRating rating={competitor.rating} />
              <span className="rating-count">({competitor.reviewCount ?? 0} reviews)</span>
            </div>
          </div>
          
          <div className="details-grid">
            {/* Left side: details card */}
            <div className="details-main-info">
              <div className="detail-item">
                <span className="detail-label"><MapPin size={14} /> Address</span>
                <p className="detail-value">{competitor.address || 'Address unavailable'}</p>
              </div>
              
              {competitor.googleMetadata?.phoneNumber && (
                <div className="detail-item">
                  <span className="detail-label"><Phone size={14} /> Phone</span>
                  <p className="detail-value">
                    <a href={`tel:${competitor.googleMetadata.phoneNumber}`} className="detail-link">
                      {competitor.googleMetadata.phoneNumber}
                    </a>
                  </p>
                </div>
              )}
              
              {competitor.googleMetadata?.website && (
                <div className="detail-item">
                  <span className="detail-label"><Globe size={14} /> Website</span>
                  <p className="detail-value">
                    <a href={competitor.googleMetadata.website} target="_blank" rel="noopener noreferrer" className="detail-link truncate-url">
                      {competitor.googleMetadata.website} <ExternalLink size={12} />
                    </a>
                  </p>
                </div>
              )}
              
              <div className="detail-item-row">
                <div className="detail-item">
                  <span className="detail-label">Threat Level</span>
                  <p className="detail-value">
                    <span className={`threat-badge ${getThreatClass(threat)}`}>
                      {threat}
                    </span>
                  </p>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Price Level</span>
                  <p className="detail-value">{formatPrice(competitor.googleMetadata)}</p>
                </div>
              </div>
              
              <div className="external-actions-row">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="action-button-link maps-btn">
                  <MapPin size={15} /> Open in Google Maps
                </a>
                <a href={reviewsUrl} target="_blank" rel="noopener noreferrer" className="action-button-link reviews-btn">
                  <MessageSquare size={15} /> Search Google Reviews
                </a>
              </div>
            </div>

            {/* Right side: Sentiment & Reviews */}
            <div className="details-sentiment-section">
              <h3>Customer Sentiment</h3>
              {competitor.sentimentSummary ? (
                <div className="sentiment-display">
                  <div className="sentiment-bars">
                    <div className="sentiment-bar-label">
                      <span className="label-pos"><ThumbsUp size={12} /> Positive ({competitor.sentimentSummary.positiveReviewCount || 0})</span>
                      <span className="label-neu"><Minus size={12} /> Neutral ({competitor.sentimentSummary.neutralReviewCount || 0})</span>
                      <span className="label-neg"><ThumbsDown size={12} /> Negative ({competitor.sentimentSummary.negativeReviewCount || 0})</span>
                    </div>
                    <div className="sentiment-split-bar">
                      {(() => {
                        const pos = competitor.sentimentSummary.positiveReviewCount || 0;
                        const neu = competitor.sentimentSummary.neutralReviewCount || 0;
                        const neg = competitor.sentimentSummary.negativeReviewCount || 0;
                        const total = pos + neu + neg;
                        if (total === 0) return <div className="bar-segment empty-bar">No rated reviews in sample</div>;
                        const posPct = (pos / total) * 100;
                        const neuPct = (neu / total) * 100;
                        const negPct = (neg / total) * 100;
                        return (
                          <>
                            {pos > 0 && <div className="bar-segment pos-segment" style={{ width: `${posPct}%` }} title={`Positive: ${pos}`} />}
                            {neu > 0 && <div className="bar-segment neu-segment" style={{ width: `${neuPct}%` }} title={`Neutral: ${neu}`} />}
                            {neg > 0 && <div className="bar-segment neg-segment" style={{ width: `${negPct}%` }} title={`Negative: ${neg}`} />}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="no-sentiment">No sentiment analysis available.</p>
              )}
              
              <h3 className="reviews-title">Recent Reviews</h3>
              <div className="reviews-list-container">
                {!competitor.reviews || competitor.reviews.length === 0 ? (
                  <p className="no-reviews-note">No reviews available from Google Places.</p>
                ) : (
                  competitor.reviews.map((review, idx) => (
                    <div key={idx} className="review-card-item">
                      <div className="review-card-meta">
                        <strong>{review.authorName || 'Anonymous'}</strong>
                        <span className="review-time">{review.relativeTimeDescription || 'Recently'}</span>
                      </div>
                      <div className="review-card-stars">
                        <StarRating rating={review.rating} />
                        <span className="review-rating-num">{review.rating} / 5</span>
                      </div>
                      {review.text ? (
                        <p className="review-card-text">"{review.text}"</p>
                      ) : (
                        <p className="review-card-text empty-review">Rating left without review text.</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetitorTable({ competitors = [], assessment = [] }) {
  const threatByName = new Map(assessment.map((item) => [item.name, item.threatLevel]));
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);

  return (
    <section className="panel animate-in stagger-6">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Competitors</p>
          <h2>Google-derived market set</h2>
        </div>
        <span className="count-pill">{competitors.length}</span>
      </div>

      <div className="table-wrap">
        <table className="competitor-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rating</th>
              <th>Reviews</th>
              <th className="center-col">Threat</th>
              <th>Price</th>
              <th className="center-col">Evidence</th>
              <th>Category</th>
              <th style={{ width: '130px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {competitors.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  No competitors were returned by Google Places for this query.
                </td>
              </tr>
            ) : (
              competitors.map((competitor) => {
                const threat = threatByName.get(competitor.name) || 'Not assessed';
                const mapsUrl = competitor.googleMetadata?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(competitor.name + ' ' + (competitor.address || ''))}`;
                const reviewsUrl = `https://www.google.com/search?q=${encodeURIComponent(competitor.name + ' ' + (competitor.address || '') + ' reviews')}`;

                return (
                  <tr 
                    key={competitor.placeId || competitor.id}
                    onClick={() => setSelectedCompetitor(competitor)}
                    className="clickable-row"
                  >
                    <td>
                      <strong>{competitor.name}</strong>
                      <span>{competitor.address || 'Address unavailable'}</span>
                    </td>
                    <td>
                      <span className="rating-display">
                        <span className="rating-value">{formatRating(competitor.rating)}</span>
                        <StarRating rating={competitor.rating} />
                      </span>
                    </td>
                    <td>{competitor.reviewCount ?? 0}</td>
                    <td className="center-col">
                      <span className={`threat-badge ${getThreatClass(threat)}`}>
                        {threat}
                      </span>
                    </td>
                    <td>{formatPrice(competitor.googleMetadata)}</td>
                    <td className="center-col">
                      <span className={competitor.evidence?.reviewsAvailable ? 'status ok' : 'status missing'}>
                        {competitor.evidence?.reviewsAvailable ? 'Reviews' : 'Missing reviews'}
                      </span>
                    </td>
                    <td>{competitor.businessCategory?.primaryType || 'Uncategorized'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="competitor-row-actions">
                        <a 
                          href={mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="action-icon-link" 
                          title="Open in Google Maps"
                        >
                          <MapPin size={15} />
                        </a>
                        <a 
                          href={reviewsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="action-icon-link" 
                          title="Search Google Reviews"
                        >
                          <MessageSquare size={15} />
                        </a>
                        <button 
                          type="button" 
                          className="action-icon-btn" 
                          onClick={() => setSelectedCompetitor(competitor)}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedCompetitor && createPortal(
        <CompetitorDetailsModal 
          competitor={selectedCompetitor} 
          threat={threatByName.get(selectedCompetitor.name) || 'Not assessed'}
          onClose={() => setSelectedCompetitor(null)} 
        />,
        document.body
      )}
    </section>
  );
}

export default CompetitorTable;
