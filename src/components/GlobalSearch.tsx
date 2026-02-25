
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Briefcase, Building2, Loader2, X } from 'lucide-react';
import { repositories } from '../data/repositories';
import { cn } from '../ui';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'candidate' | 'job' | 'company';
}

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Parallel search across candidates, jobs, and companies
      const [candidatesRes, jobsRes, companiesRes] = await Promise.all([
        repositories.candidates.list({ search: searchTerm, limit: 5 }),
        repositories.jobs.list({ search: searchTerm, limit: 5 }),
        repositories.companies.list({ search: searchTerm, limit: 5 })
      ]);

      const formattedResults: SearchResult[] = [
        ...candidatesRes.data.map(c => ({
          id: c.id,
          title: c.name,
          subtitle: c.whatsapp,
          type: 'candidate' as const
        })),
        ...jobsRes.data.map(j => ({
          id: j.id,
          title: (j as any).title || (j as any).name, // Some might use title
          subtitle: (j as any).city || (j as any).company_name,
          type: 'job' as const
        })),
        ...companiesRes.data.map(c => ({
          id: c.id,
          title: c.name,
          subtitle: c.city,
          type: 'company' as const
        }))
      ].slice(0, 8);

      setResults(formattedResults);
    } catch (error) {
      console.error('Global search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    
    const path = result.type === 'candidate' ? '/candidates' : 
                 result.type === 'job' ? '/jobs' : '/companies';
    
    navigate(`${path}?search=${encodeURIComponent(result.title)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      // If we have results, take the first one's type to decide where to go, 
      // or default to candidates if no results but query exists
      const firstResult = results[0];
      const path = firstResult?.type === 'candidate' ? '/candidates' : 
                   firstResult?.type === 'job' ? '/jobs' : 
                   firstResult?.type === 'company' ? '/companies' : '/candidates';
      
      navigate(`${path}?search=${encodeURIComponent(query)}`);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md hidden md:block" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400 dark:text-dark-muted" />
        <input 
          type="text" 
          placeholder="Pesquisar em todo o sistema..." 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-10 pr-10 rounded-lg bg-primary-50 border-none text-sm text-primary-900 placeholder:text-primary-400 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all dark:bg-slate-800 dark:text-dark-text dark:placeholder:text-slate-500 dark:focus:bg-dark-card"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 dark:text-dark-muted dark:hover:text-dark-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (query.trim() || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-primary-100 overflow-hidden z-50 dark:bg-dark-card dark:border-dark-border">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-primary-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Buscando...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary-50 text-left transition-colors dark:hover:bg-slate-800"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    result.type === 'candidate' && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                    result.type === 'job' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                    result.type === 'company' && "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {result.type === 'candidate' && <User className="w-4 h-4" />}
                    {result.type === 'job' && <Briefcase className="w-4 h-4" />}
                    {result.type === 'company' && <Building2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-900 truncate dark:text-dark-text">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-primary-500 truncate dark:text-dark-muted">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 dark:text-slate-600">
                    {result.type === 'candidate' ? 'Candidato' : 
                     result.type === 'job' ? 'Vaga' : 'Empresa'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-primary-500 dark:text-dark-muted">
              Nenhum resultado encontrado para "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
