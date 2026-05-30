import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px',
        alignItems: 'center', pointerEvents: 'none', width: '90%', maxWidth: '400px'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            background: toast.type === 'error' ? '#C62828' : toast.type === 'success' ? '#2E7D32' : toast.type === 'warning' ? '#E65100' : '#1565C0',
            color: '#fff', padding: '12px 20px', borderRadius: '12px',
            fontSize: '14px', fontWeight: '500', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            animation: 'slideUp 0.3s ease', textAlign: 'center', width: '100%',
            pointerEvents: 'all'
          }}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
