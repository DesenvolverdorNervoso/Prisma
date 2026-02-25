import React, { createContext, useContext, useState, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- SKELETON LOADING ---
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse rounded-md bg-primary-200/60 dark:bg-dark-border/50", className)} />
);

// --- TOAST SYSTEM ---

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextData {
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((state) => state.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((state) => [...state, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000); 
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-5 py-4 rounded-xl shadow-medium dark:shadow-dark-medium text-sm font-medium transition-all animate-in slide-in-from-right-full duration-300 border-l-4",
              // Light Mode
              "bg-white",
              toast.type === 'success' && "border-success text-primary-800",
              toast.type === 'error' && "border-error text-primary-800",
              toast.type === 'warning' && "border-warning text-primary-800",
              toast.type === 'info' && "border-brand-500 text-primary-800",
              // Dark Mode
              "dark:bg-dark-card",
              toast.type === 'success' && "dark:text-emerald-400",
              toast.type === 'error' && "dark:text-red-400",
              toast.type === 'warning' && "dark:text-amber-400",
              toast.type === 'info' && "dark:text-blue-400"
            )}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-success dark:text-emerald-500" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-error dark:text-red-500" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-warning dark:text-amber-500" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-brand-500 dark:text-blue-500" />}
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 text-primary-400 hover:text-primary-600 dark:text-dark-muted dark:hover:text-dark-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// --- PREMIUM COMPONENTS ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, className, variant = 'primary', size = 'md', isLoading, ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98] dark:focus-visible:ring-offset-dark-bg";
  
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200 dark:shadow-none focus-visible:ring-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500",
    secondary: "bg-white text-primary-700 hover:bg-primary-50 border border-primary-200 shadow-sm focus-visible:ring-primary-400 dark:bg-dark-card dark:text-dark-text dark:border-dark-border dark:hover:bg-slate-800",
    danger: "bg-white text-error border border-error/30 hover:bg-error/5 focus-visible:ring-error dark:bg-dark-card dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/30",
    ghost: "hover:bg-primary-100 text-primary-600 hover:text-primary-900 dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-slate-800",
    outline: "border border-primary-300 bg-transparent hover:bg-primary-50 text-primary-700 dark:border-dark-border dark:text-dark-text dark:hover:bg-slate-800"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-8 text-base"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, className, required, ...props }) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-primary-700 dark:text-dark-muted uppercase tracking-wide">
          {label} {required && <span className="text-error dark:text-red-400">*</span>}
        </label>
      )}
      <input
        className={cn(
          "flex h-10 w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-primary-300 disabled:cursor-not-allowed disabled:bg-primary-50",
          // Dark Mode
          "dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder:text-slate-600 dark:focus:ring-brand-500/10 dark:focus:border-brand-500 dark:disabled:bg-slate-900",
          error && "border-error focus:border-error focus:ring-error/20 dark:border-red-900 dark:focus:border-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-error font-medium flex items-center gap-1 dark:text-red-400"><AlertCircle className="w-3 h-3" /> {error}</p>}
      {!error && helperText && <p className="text-xs text-primary-500 dark:text-slate-500">{helperText}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className, required, ...props }) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-primary-700 dark:text-dark-muted uppercase tracking-wide">
          {label} {required && <span className="text-error dark:text-red-400">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-primary-300 disabled:cursor-not-allowed disabled:bg-primary-50",
          "dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder:text-slate-600 dark:focus:ring-brand-500/10 dark:focus:border-brand-500",
          error && "border-error focus:border-error focus:ring-error/20 dark:border-red-900",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-error font-medium dark:text-red-400">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className, required, placeholder, ...props }) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-primary-700 dark:text-dark-muted uppercase tracking-wide">
          {label} {required && <span className="text-error dark:text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-primary-300 disabled:cursor-not-allowed disabled:bg-primary-50 appearance-none",
            "dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:focus:ring-brand-500/10 dark:focus:border-brand-500",
            error && "border-error focus:border-error dark:border-red-900",
            className
          )}
          {...props}
        >
          <option value="" disabled className="text-gray-400 dark:text-gray-500">{placeholder || "Selecione..."}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-primary-900 bg-white dark:bg-dark-bg dark:text-dark-text">{opt.label}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="w-4 h-4 text-primary-500 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      {error && <p className="text-xs text-error font-medium dark:text-red-400">{error}</p>}
    </div>
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("rounded-xl border border-primary-100 bg-white text-primary-950 shadow-soft transition-colors duration-300 dark:bg-dark-card dark:border-dark-border dark:text-dark-text dark:shadow-dark-soft", className)} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>{children}</div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-primary-900 dark:text-dark-text", className)} {...props}>{children}</h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("p-6 pt-0 text-primary-700 dark:text-dark-muted", className)} {...props}>{children}</div>
);

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className, children, ...props }) => (
  <div className="relative w-full overflow-auto rounded-xl border border-primary-200 bg-white shadow-soft transition-colors duration-300 dark:bg-dark-card dark:border-dark-border dark:shadow-dark-soft">
    <table className={cn("w-full caption-bottom text-sm text-left border-collapse", className)} {...props}>{children}</table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, children, ...props }) => (
  <thead className={cn("bg-primary-50/80 backdrop-blur-sm sticky top-0 z-20 dark:bg-slate-900/80 dark:[&_tr]:border-dark-border", className)} {...props}>{children}</thead>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, children, ...props }) => (
  <tr className={cn("border-b border-primary-100 transition-colors hover:bg-primary-50/50 last:border-0 dark:border-dark-border dark:hover:bg-slate-800/50", className)} {...props}>{children}</tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <th className={cn("h-11 px-6 text-left align-middle font-semibold text-primary-600 uppercase tracking-wider text-xs dark:text-dark-muted", className)} {...props}>{children}</th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <td className={cn("p-6 align-middle text-primary-700 dark:text-slate-300", className)} {...props}>{children}</td>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'error' | 'neutral' | 'brand'; className?: string }> = ({ children, variant = 'neutral', className }) => {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-500/30",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30",
    error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30",
    neutral: "bg-primary-100 text-primary-700 ring-1 ring-inset ring-primary-600/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/30",
    brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30"
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300", styles[variant], className)}>{children}</span>;
};

// --- FORM LAYOUT HELPERS ---

export const FormSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={cn("space-y-5 py-5 border-b border-primary-100 last:border-0 dark:border-dark-border", className)}>
    <div className="flex items-center gap-2 mb-4">
      <div className="h-4 w-1 bg-brand-500 rounded-full"></div>
      <h4 className="text-sm font-bold text-primary-900 dark:text-dark-text uppercase tracking-wide">{title}</h4>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      {children}
    </div>
  </div>
);

export const Tabs: React.FC<{ tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }> = ({ tabs, active, onChange }) => (
  <div className="flex border-b border-primary-200 mb-6 gap-1 dark:border-dark-border">
    {tabs.map(tab => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={cn(
          "py-3 px-5 text-sm font-medium border-b-2 transition-all duration-200",
          active === tab.id 
            ? "border-brand-500 text-brand-600 dark:text-brand-400 dark:border-brand-400" 
            : "border-transparent text-primary-500 hover:border-primary-300 dark:text-dark-muted dark:hover:text-dark-text dark:hover:border-slate-600"
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const Modal: React.FC<{ 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode; 
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ title, onClose, children, footer, size = 'md' }) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" onClick={onClose} />
      <div className={cn("relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 dark:bg-dark-card dark:shadow-dark-medium", sizes[size])}>
        <div className="px-8 py-5 border-b border-primary-100 flex justify-between items-center bg-primary-50/50 rounded-t-2xl dark:border-dark-border dark:bg-slate-900/30">
          <h3 className="text-xl font-bold text-primary-900 tracking-tight dark:text-dark-text">{title}</h3>
          <button onClick={onClose} className="p-2 text-primary-400 hover:text-primary-700 hover:bg-primary-100 rounded-full transition-colors dark:text-dark-muted dark:hover:text-white dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 dark:text-dark-text">
          {children}
        </div>
        {footer && (
          <div className="px-8 py-5 border-t border-primary-100 bg-primary-50/30 rounded-b-2xl flex justify-end gap-3 dark:border-dark-border dark:bg-slate-900/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};