import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { Loader2, ArrowLeft, ArrowRight, UserCheck, Calendar } from 'lucide-react';

export const Step3Settings = ({ data, onBack, onNext }: { data: any; onBack: () => void; onNext: (settings: any) => void }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(data);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await client.get('/in/clients');
        setClients(res.data);
      } catch (err) {
        setError('Failed to fetch clients from Invoice Ninja');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const savedFooter = localStorage.getItem('invoice_footer');
    if (savedFooter) {
      setForm((prev: any) => ({ ...prev, footer: savedFooter }));
    }
  }, []);

  const handleNext = () => {
    if (!form.client_id) {
      setError('Please select a client');
      return;
    }
    localStorage.setItem('invoice_footer', form.footer || '');
    onNext(form);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><UserCheck className="text-primary" size={24} /> Invoice Ninja Recipient</h2>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Client</label>
          <select 
            className="w-full h-11 border border-input rounded-md bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          >
            <option value="">-- Choose a Client --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.display_name} ({c.id})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Calendar size={18} /> Invoice Date</label>
          <input 
            type="date"
            className="w-full h-11 border border-input rounded-md bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.issue_date}
            onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Calendar size={18} /> Due Date</label>
          <input 
            type="date"
            className="w-full h-11 border border-input rounded-md bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Details / Footer (Saved locally)</label>
        <textarea 
          className="w-full h-32 border border-input rounded-md bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Bank: XYZ, IBAN: DE123..."
          value={form.footer || ''}
          onChange={(e) => setForm({ ...form, footer: e.target.value })}
        />
      </div>

      {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

      <div className="flex justify-between pt-8 mt-12 border-t">
        <button onClick={onBack} className="inline-flex items-center px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <button 
          onClick={handleNext}
          className="inline-flex items-center px-8 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
        >
          Review & Generate <ArrowRight size={18} className="ml-2" />
        </button>
      </div>
    </div>
  );
};
