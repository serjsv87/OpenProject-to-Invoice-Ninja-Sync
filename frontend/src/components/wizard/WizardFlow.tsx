import React, { useState, useEffect } from 'react';
import { Step1Filters } from './Step1Filters';
import { Step2Analysis } from './Step2Analysis';
import { Step3Settings } from './Step3Settings';
import { Step4Execution } from './Step4Execution';
import { Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STEPS = [
  { id: 1, name: 'Filters' },
  { id: 2, name: 'Analysis' },
  { id: 3, name: 'Settings' },
  { id: 4, name: 'Generate' },
];

const LOCAL_STORAGE_KEY = 'wizard_flow_filters';

export const WizardFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Default filters
  const defaultFilters = {
    project_ids: [] as number[],
    start_date: '',
    end_date: '',
    user_id: undefined as number | undefined,
  };

  // Try loading from localStorage
  const getInitialFilters = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error parsing saved filters', e);
    }
    return defaultFilters;
  };

  const [wizardData, setWizardData] = useState({
    filters: getInitialFilters(),
    analysis: {} as any,
    lineItems: [] as any[],
    invoiceSettings: {
      client_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wizardData.filters));
  }, [wizardData.filters]);

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const updateData = (key: string, value: any) => {
    setWizardData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Stepper Header */}
      <nav aria-label="Progress" className="mb-12">
        <ol className="flex items-center justify-between w-full">
          {STEPS.map((step, idx) => (
            <li key={step.name} className={cn("relative", idx !== STEPS.length - 1 ? "flex-1" : "")}>
              <div className="flex items-center">
                <span 
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    currentStep > step.id ? "bg-primary border-primary text-primary-foreground" :
                    currentStep === step.id ? "border-primary text-primary" : "border-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? <Check size={20} /> : step.id}
                </span>
                <span className={cn(
                  "ml-4 text-sm font-medium",
                  currentStep === step.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.name}
                </span>
                {idx !== STEPS.length - 1 && (
                  <div className={cn(
                    "ml-4 h-0.5 w-full flex-1 bg-muted",
                    currentStep > step.id && "bg-primary"
                  )} />
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Content Area */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-8 min-h-[400px]">
        {currentStep === 1 && (
          <Step1Filters 
            data={wizardData.filters} 
            onNext={(filters, analysis) => {
              setWizardData(prev => ({ ...prev, filters, analysis }));
              nextStep();
            }} 
          />
        )}
        {currentStep === 2 && (
          <Step2Analysis 
            analysis={wizardData.analysis} 
            onBack={prevStep}
            onNext={(lineItems) => {
              updateData('lineItems', lineItems);
              nextStep();
            }} 
          />
        )}
        {currentStep === 3 && (
          <Step3Settings 
            data={wizardData.invoiceSettings}
            onBack={prevStep}
            onNext={(settings) => {
              updateData('invoiceSettings', settings);
              nextStep();
            }}
          />
        )}
        {currentStep === 4 && (
          <Step4Execution 
            filters={wizardData.filters}
            lineItems={wizardData.lineItems}
            settings={wizardData.invoiceSettings}
            onBack={prevStep}
          />
        )}
      </div>
    </div>
  );
};
