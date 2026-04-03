import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Rocket } from 'lucide-react';
import { WizardFlow } from '../components/wizard/WizardFlow';

export const WizardPage = () => {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-1">
          <div className="bg-primary p-1.5 rounded-lg">
             <Rocket className="text-primary-foreground h-5 w-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Invoice Generator</h1>
        </div>
        
        <button 
          onClick={logout}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-md hover:bg-destructive/5"
        >
          <LogOut size={18} /> Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8">
           <WizardFlow />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        &copy; 2026 Admin Dashboard - OpenProject & Invoice Ninja Integration
      </footer>
    </div>
  );
};
