export function HMIPanel() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 56,
        left: 16,
        width: 380,
        height: 380,
        zIndex: 40,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
        border: '2px solid #444',
        background: '#000',
      }}
    >
      <iframe
        src="/hmi.html"
        title="York HMI"
        frameBorder="0"
        scrolling="no"
        style={{
          width: 640,
          height: 640,
          border: 'none',
          background: '#3a2e18',
          display: 'block',
          overflow: 'hidden',
          transform: 'scale(0.594)',
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}