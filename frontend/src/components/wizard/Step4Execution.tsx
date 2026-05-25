import React, { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { Loader2, ArrowLeft, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export const Step4Execution = ({ filters, lineItems, settings, onBack }: { filters: any; lineItems: any[]; settings: any; onBack: () => void }) => {
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing connection...');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const wsClientId = useRef(`client_${Math.random().toString(36).substr(2, 9)}`);

  const mounted = React.useRef(true);

  useEffect(() => {
    mounted.current = true;
    // Setup WebSocket with authentication
    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.billing.uw-t.com/api/v1';
    const wsBase = apiBase.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrl = `${wsBase}/ws/${wsClientId.current}${token ? `?token=${token}` : ''}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (!mounted.current) return;
      const data = JSON.parse(event.data);
      if (data.status) setStatus(data.status);
      if (data.progress !== undefined) setProgress(data.progress);
      if (data.message) setMessage(data.message);
      if (data.invoice_id) setInvoiceId(data.invoice_id);
      if (data.status === 'error') setError(data.message);
    };

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      console.log('WS Connected');
      startGeneration();
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      // Small timeout to avoid flicker on quick connection handshake
      setTimeout(() => {
        if (wsRef.current === ws && ws.readyState !== WebSocket.OPEN) {
          setError('WebSocket connection error');
          setStatus('error');
        }
      }, 500);
    };

    return () => {
      ws.close();
    };
  }, []);

  const startGeneration = async () => {
    setStatus('processing');
    try {
      await client.post('/in/generate', {
        client_id: settings.client_id,
        line_items: lineItems,
        issue_date: settings.issue_date,
        due_date: settings.due_date,
        footer: settings.footer,
        ai_description: settings.ai_description,
        ai_improve_title: settings.ai_improve_title,
        ai_model: settings.ai_model,
        ws_client_id: wsClientId.current
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Generation failed');
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-8">
      {status === 'processing' && (
        <>
          <div className="relative flex items-center justify-center h-24 w-24">
            <Loader2 className="animate-spin text-primary h-full w-full" strokeWidth={1} />
            <span className="absolute text-lg font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="space-y-2 max-w-md w-full">
            <h2 className="text-xl font-bold">Generating Invoice...</h2>
            <p className="text-muted-foreground">{message}</p>
            <div className="w-full bg-muted rounded-full h-2.5 mt-4">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        </>
      )}

      {status === 'completed' && (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
          <div className="flex justify-center">
            <div className="bg-primary/20 p-4 rounded-full">
              <CheckCircle2 className="text-primary h-16 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Invoice Successfully Created!</h2>
            <p className="text-muted-foreground">The data was successfully synced to Invoice Ninja.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <a 
              href={`${import.meta.env.VITE_INVOICE_NINJA_BASE_URL}/invoices/${invoiceId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ExternalLink size={18} className="mr-2" /> View in Invoice Ninja
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-3 bg-muted font-semibold rounded-lg hover:bg-muted/80 transition-colors"
            >
              Start New Invoice
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6 animate-in shake duration-500">
          <div className="flex justify-center">
             <AlertCircle className="text-destructive h-16 w-16" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-destructive">Generation Error</h2>
            <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
          </div>
          <button 
            onClick={onBack}
            className="inline-flex items-center px-6 py-3 bg-muted font-semibold rounded-lg hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft size={18} className="mr-2" /> Go Back and Fix
          </button>
        </div>
      )}
    </div>
  );
};
