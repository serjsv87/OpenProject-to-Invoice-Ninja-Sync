import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, DollarSign, Clock } from 'lucide-react';

export const Step2Analysis = ({ analysis, onBack, onNext }: { analysis: any; onBack: () => void; onNext: (lineItems: any[]) => void }) => {
  const [globalRate, setGlobalRate] = useState(() => {
    const saved = localStorage.getItem('global_hourly_rate');
    return saved ? Number(saved) : 50;
  });
  
  useEffect(() => {
    localStorage.setItem('global_hourly_rate', globalRate.toString());
  }, [globalRate]);

  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>(
    Object.keys(analysis).reduce((acc, id) => ({ ...acc, [id]: true }), {})
  );

  const calculateTotalCost = () => {
    return Object.entries(analysis)
      .filter(([id]) => selectedTasks[id])
      .reduce((sum, [, data]: any) => sum + (data.hours * globalRate), 0);
  };

  const calculateTotalHours = () => {
    return Object.entries(analysis)
      .filter(([id]) => selectedTasks[id])
      .reduce((sum, [, data]: any) => sum + data.hours, 0);
  };

  const handleNext = () => {
    const lineItems = Object.entries(analysis)
      .filter(([id]) => selectedTasks[id])
      .map(([id, data]: any) => ({
        wp_id: data.id && data.id !== "0" ? Number(data.id) : 0,
        product_key: data.id && data.id !== "0" ? `#${data.id}: ${data.title}` : "Project Level",
        notes: data.title,
        quantity: data.hours,
        cost: globalRate
      }));
    onNext(lineItems);
  };

  const tasks = Object.entries(analysis);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-6">No time entries found for the selected filters.</p>
        <button onClick={onBack} className="text-primary hover:underline flex items-center justify-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Go Back and Adjust Filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="text-primary" size={20} />
          <span className="font-semibold">{tasks.length} Tasks Analyzed</span>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium flex items-center gap-2"><DollarSign size={16} /> Global Hourly Rate</label>
          <input 
            type="number"
            className="w-24 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={globalRate}
            onChange={(e) => setGlobalRate(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">Task / Work Package</th>
              <th className="px-4 py-3 text-right">Hours</th>
              <th className="px-4 py-3 text-right">Total ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map(([id, data]: any) => (
              <tr key={id} className={!selectedTasks[id] ? "opacity-50" : ""}>
                <td className="px-4 py-3 text-center">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedTasks[id]}
                    onChange={(e) => setSelectedTasks({ ...selectedTasks, [id]: e.target.checked })}
                  />
                </td>
                <td className="px-4 py-3 font-medium">{data.title}</td>
                <td className="px-4 py-3 text-right">{data.hours.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{(data.hours * globalRate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/20 font-bold border-t-2 border-border">
            <tr>
              <td colSpan={2} className="px-4 py-4 text-right">Total:</td>
              <td className="px-4 py-4 text-right text-primary">
                <div className="flex flex-col items-end">
                   <span className="text-xs text-muted-foreground font-normal uppercase">Total Hours</span>
                   <span>{calculateTotalHours().toFixed(2)} h</span>
                </div>
              </td>
              <td className="px-4 py-4 text-right text-primary text-xl">
                <div className="flex flex-col items-end">
                   <span className="text-xs text-muted-foreground font-normal uppercase">Total Budget</span>
                   <span>${calculateTotalCost().toFixed(2)}</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between pt-6 border-t font-sans">
        <button onClick={onBack} className="inline-flex items-center px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <button 
          onClick={handleNext}
          className="inline-flex items-center px-8 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
        >
          Next: Invoice Settings <ArrowRight size={18} className="ml-2" />
        </button>
      </div>
    </div>
  );
};
