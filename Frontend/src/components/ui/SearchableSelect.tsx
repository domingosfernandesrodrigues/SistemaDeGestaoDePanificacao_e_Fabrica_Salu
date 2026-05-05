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
}

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Selecione...", 
  label, 
  error 
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
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 flex items-center justify-between rounded-lg border bg-white text-sm transition-all focus:ring-2 focus:ring-indigo-500 outline-none ${
          error ? 'border-red-500' : 'border-slate-200'
        } ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
      >
        <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              className="w-full text-sm outline-none bg-transparent"
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
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                    value === opt.value 
                      ? 'bg-indigo-50 text-indigo-700 font-medium' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check size={14} className="flex-shrink-0 ml-2" />}
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
