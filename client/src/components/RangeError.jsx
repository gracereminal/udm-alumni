/** Error under a From / To batch filter (lib/batchRange.js); renders nothing without a message. */
export default function RangeError({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        alignSelf: 'flex-end', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B42318', borderRadius: '10px',
        padding: '8px 12px', fontSize: '12.5px', fontWeight: '600',
      }}
    >
      {message}
    </div>
  );
}
