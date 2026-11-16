export default function Loader({ full = false, label = 'Loading' }) {
  return (
    <div className={full ? 'loader loader-full' : 'loader'} role="status" aria-label={label}>
      <span className="spinner" />
    </div>
  );
}
