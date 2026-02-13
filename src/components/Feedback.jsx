export function ErrorBanner({ error }) {
  if (!error) return null;
  return <div className="banner banner-error">{error}</div>;
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return <div className="banner banner-success">{message}</div>;
}
