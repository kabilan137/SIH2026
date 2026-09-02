function LoadingSpinner({ label = 'Loading' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-orb" aria-hidden="true" />
      <span className="loading-text">{label}</span>
      <div className="loading-bar" aria-hidden="true" />
    </div>
  );
}

export default LoadingSpinner;
