import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 4000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    error: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    info: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  const colors = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600',
  };

  return (
    <div
      className={`fixed bottom-5 right-5 flex items-center gap-3 p-4 rounded-xl text-white shadow-lg animate-slide-in-bottom border-b-4 ${colors[type]}`}
      style={{ zIndex: 10000 }}
      role="alert"
    >
      <span>{icons[type]}</span>
      <span className="font-semibold">{message}</span>
      <button onClick={onClose} className="ml-4 font-bold text-lg opacity-70 hover:opacity-100">&times;</button>
    </div>
  );
};

const createToast = (message: string, type: ToastType, duration: number) => {
    let toastRoot = document.getElementById('toast-root');
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.id = 'toast-root';
      document.body.appendChild(toastRoot);
    }
    
    const toastContainer = document.createElement('div');
    toastRoot.appendChild(toastContainer);
    const root = createRoot(toastContainer);

    const handleClose = () => {
      root.unmount();
      if (toastContainer.parentNode) {
        toastContainer.parentNode.removeChild(toastContainer);
      }
    };
    
    root.render(
      <Toast message={message} type={type} duration={duration} onClose={handleClose} />
    );
};


export const toast = {
  success: (message: string, duration = 4000) => createToast(message, 'success', duration),
  error: (message: string, duration = 5000) => createToast(message, 'error', duration),
  info: (message: string, duration = 4000) => createToast(message, 'info', duration),
};

export default Toast;
