import React, { useState, createContext, useContext } from 'react';
import { Plus, Calendar, Calculator, ChevronRight, X } from 'lucide-react';
import { Lead, LeadStage, LeadPriority, ServiceType, User } from './types';
import { MOCK_LEADS, MOCK_USERS } from './constants';
import { formatCurrency } from './utils';

// --- Context & State ---

interface AppContextType {
  leads: Lead[];
  updateLeadStage: (id: string, stage: LeadStage) => void;
  navigate: (page: string) => void;
  addLead: (lead: Lead) => void;
  user: User | null;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

const useAppContext = () => useContext(AppContext);

// --- Components ---

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  companyId: string;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, onSave, companyId }) => {
  if (!isOpen) return null;

  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.GATE);
  const [expectedValue, setExpectedValue] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      companyId,
      clientName,
      phone,
      serviceType,
      stage: LeadStage.NEW,
      priority: LeadPriority.MEDIUM,
      expectedValue,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(newLead);
    onClose();
    // Reset form
    setClientName('');
    setPhone('');
    setExpectedValue(0);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Novo Lead</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <input 
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              value={clientName} 
              onChange={e => setClientName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input 
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Serviço</label>
            <select 
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              value={serviceType} 
              onChange={e => setServiceType(e.target.value as ServiceType)}
            >
              {Object.values(ServiceType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700">Valor Esperado</label>
             <input 
               type="number" 
               className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
               value={expectedValue} 
               onChange={e => setExpectedValue(Number(e.target.value))} 
             />
          </div>
           <div>
             <label className="block text-sm font-medium text-gray-700">Notas</label>
             <textarea 
               className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
               value={notes} 
               onChange={e => setNotes(e.target.value)} 
             />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Salvar</button>
        </form>
      </div>
    </div>
  );
};

const CRMView = () => {
  const { leads, updateLeadStage, navigate, addLead, user } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const stages = [LeadStage.NEW, LeadStage.VISIT, LeadStage.QUOTE, LeadStage.NEGOCIACAO, LeadStage.WON];

  const handleSave = (lead: Lead) => {
    addLead(lead);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4 px-1 shrink-0">
         <h2 className="text-xl font-bold text-gray-800">Pipeline de Vendas</h2>
         <button 
           onClick={() => setIsModalOpen(true)}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-blue-700 transition"
         >
           <Plus size={16} /> Novo Lead
         </button>
      </div>

      {/* Kanban Container with Horizontal Scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full gap-4 min-w-max">
          {stages.map(stage => (
            <div key={stage} className="w-72 sm:w-80 flex flex-col h-full bg-slate-100 rounded-lg shadow-sm border border-slate-200 shrink-0">
              {/* Column Header */}
              <div className="p-3 border-b border-gray-200 bg-slate-200 rounded-t-lg font-semibold text-slate-700 flex justify-between items-center shrink-0">
                <span>{stage}</span>
                <span className="bg-white px-2 py-0.5 rounded text-xs text-gray-600 font-bold border border-gray-300">
                  {leads.filter(l => l.stage === stage).length}
                </span>
              </div>
              
              {/* Column Body with Vertical Scroll */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {leads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-800 truncate pr-2">{lead.clientName}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${lead.priority === LeadPriority.HIGH ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {lead.priority === LeadPriority.HIGH ? 'Alta' : 'Normal'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                       {lead.serviceType}
                    </p>
                    <div className="mt-3 flex justify-between items-center text-xs text-gray-400 font-mono">
                      <span>{formatCurrency(lead.expectedValue || 0)}</span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                      <button onClick={() => navigate('VISITS')} className="text-xs bg-blue-50 text-blue-700 py-1.5 rounded hover:bg-blue-100 flex items-center justify-center gap-1 font-medium transition-colors">
                          <Calendar size={12}/> Visita
                      </button>
                      <button onClick={() => navigate('QUOTES')} className="text-xs bg-green-50 text-green-700 py-1.5 rounded hover:bg-green-100 flex items-center justify-center gap-1 font-medium transition-colors">
                          <Calculator size={12}/> Orçar
                      </button>
                    </div>

                    {stage !== LeadStage.WON && (
                      <div className="mt-2">
                        <button 
                          onClick={() => updateLeadStage(lead.id, stages[stages.indexOf(stage) + 1])}
                          className="w-full text-xs bg-slate-800 text-white py-1.5 rounded hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                        >
                          Avançar <ChevronRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <LeadModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        companyId={user?.companyId || 'c1'}
      />
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [user, setUser] = useState<User | null>(MOCK_USERS[0]);

  const updateLeadStage = (id: string, stage: LeadStage) => {
    setLeads(leads.map(lead => lead.id === id ? { ...lead, stage } : lead));
  };

  const addLead = (lead: Lead) => {
    setLeads([...leads, lead]);
  };

  const navigate = (path: string) => {
    console.log('Navigate to:', path);
  };

  return (
    <AppContext.Provider value={{ leads, updateLeadStage, navigate, addLead, user }}>
      <div className="h-screen w-screen bg-gray-50 p-4 overflow-hidden">
        <CRMView />
      </div>
    </AppContext.Provider>
  );
};

export default App;
