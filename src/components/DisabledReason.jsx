export default function DisabledReason({ reason }) {
  if (!reason) return null;
  return <small className="disabled-reason">Disabled: {reason}</small>;
}
