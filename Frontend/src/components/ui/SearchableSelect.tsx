import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Selecione...", 
  label, 
  error,
  required,
  disabled
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text-main">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-10 px-3 flex items-center justify-between rounded-lg border bg-bg-card text-sm transition-all focus:ring-2 focus:ring-ember outline-none ${
          error ? 'border-red-500' : 'border-border-subtle'
        } ${isOpen ? 'ring-2 ring-ember border-ember' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <span className={`${selectedOption ? 'text-text-main font-medium' : 'text-text-dim'} text-left flex-1 break-words line-clamp-2 leading-tight`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={`text-text-dim transition-transform duration-300 ${isOpen ? 'rotate-180 text-ember' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-border-subtle flex items-center gap-2 bg-bg-page/50">
            <Search size={14} className="text-text-dim" />
            <input
              autoFocus
              className="w-full text-sm outline-none bg-transparent text-text-main placeholder:text-text-dim"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                   className={`w-full text-left px-3 py-2.5 rounded-md text-sm flex items-start justify-between transition-all ${
                    value === opt.value 
                      ? 'bg-ember text-white shadow-md shadow-fire/10' 
                      : 'text-text-main hover:bg-ember/5 dark:hover:bg-dark/20 hover:text-ember'
                  }`}
                >
                   <span className="flex-1 break-words leading-relaxed">{opt.label}</span>
                  {value === opt.value && <Check size={16} className="flex-shrink-0 ml-2 mt-0.5" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-slate-400 italic">
                Nenhum resultado encontrado.
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wider">
          {error}
        </p>
      )}
    </div>
  );
}
