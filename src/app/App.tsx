import React from 'react';
import { AppRouter } from './router';
import { ToastProvider } from '../ui';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
};

export default App;