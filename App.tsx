import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { 
  LayoutDashboard, Users, Calculator, Wrench, Package, DollarSign, 
  Menu, Bell, ChevronRight, Plus, CheckCircle, AlertTriangle, 
  FileText, Truck, LogOut, Search, User as UserIcon, Calendar, Camera, MapPin, Lock,
  Settings, TrendingUp, TrendingDown, ClipboardList, Printer, ArrowLeft, Navigation, Share2, PenTool, CheckSquare, Save, Edit, Trash2, Briefcase, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  User, Lead, StockItem, Order, Quote, QuoteStatus, LeadStage, 
  ServiceType, OrderStatus, StockCategory, UserRole, ServiceBOMTemplate,
  Visit, VisitStatus, Receivable, Payable, Supplier, PaymentStatus, PayableCategory, WorkOrder, WorkOrderStatus, StockReservation, StockReservationStatus, Warranty, Client, LeadPriority
} from './types';
import { MOCK_LEADS, MOCK_STOCK, MOCK_USERS, MOCK_ORDERS, MOCK_BOM_TEMPLATES, MOCK_VISITS, MOCK_QUOTES, MOCK_RECEIVABLES, MOCK_PAYABLES, MOCK_SUPPLIERS, MOCK_WORK_ORDERS, MOCK_CLIENTS } from './constants';
import { formatCurrency, getStockHealth, generatePurchaseSuggestions, calculateBOMRequirements } from './utils';

// --- CONTEXT & STATE ---
interface AppState {
  user: User | null;
  isClient: boolean;
  leads: Lead[];
  clients: Client[];
  stock: StockItem[];
  stockReservations: StockReservation[];
  orders: Order[];
  quotes: Quote[];
  visits: Visit[];
  workOrders: WorkOrder[];
  receivables: Receivable[];
  payables: Payable[];
  suppliers: Supplier[];
  warranties: Warranty[];
  activeView: string;
  isMobile: boolean;
  toggleMobileMenu: () => void;
  mobileMenuOpen: boolean;
  
  // Actions
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  loginAsClient: () => void;
  addLead: (lead: Lead) => void;
  updateLeadStage: (id: string, stage: LeadStage) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  convertQuoteToOrder: (quote: Quote) => void;
  completeWorkOrder: (workOrderId: string) => void;
  reserveStock: (items: { stockItemId: string, quantity: number }[]) => void;
  updateWorkOrder: (wo: WorkOrder) => void;
  createQuoteFromVisit: (visit: Visit, measurements: Record<string, number>) => void;
  navigate: (view: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// --- COMPONENTS ---

const Badge = ({ children, color }: { children?: React.ReactNode, color: string }) => {
  const colorClass = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
    orange: 'bg-orange-100 text-orange-800',
  }[color] || 'bg-gray-100 text-gray-800';

  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>{children}</span>;
};

const Card = ({ children, title, action }: { children?: React.ReactNode, title?: string, action?: React.ReactNode }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full">
    {title && (
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

// --- VIEWS ---

// 1. LOGIN VIEW
const LoginView = () => {
  const { login, loginAsClient } = useAppContext();
  const [email, setEmail] = useState('admin@metalflow.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(email, password)) {
      setError('Credenciais inválidas. Tente admin@metalflow.com');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
           <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">M</div>
           <h1 className="text-2xl font-bold text-slate-800">MetalFlow</h1>
           <p className="text-slate-500">SaaS Industrial e Serralheria</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="seu@email.com"
            />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="••••••"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg font-medium hover:bg-slate-700 transition">
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-2">Área do Cliente</p>
          <button 
            onClick={loginAsClient}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            Acessar Portal do Cliente
          </button>
        </div>
        
        <div className="mt-8 text-xs text-center text-gray-400 bg-gray-50 p-2 rounded">
           <p>Demo Logins:</p>
           <p>Admin: admin@metalflow.com</p>
           <p>Vendas: vendas@metalflow.com</p>
           <p>Técnico: tech@metalflow.com</p>
           <p>Produção: prod@metalflow.com</p>
        </div>
      </div>
    </div>
  );
};

// 2. CLIENT PORTAL VIEW
const ClientPortalView = () => {
  const { logout, quotes } = useAppContext();
  
  // Mock data for the client (In real app, filter by logged in client ID)
  const clientQuote = quotes[0] || {
    id: 'ORC-2023-098',
    total: 12500,
    status: QuoteStatus.SENT,
    items: [
      { description: 'Portão Basculante Automático 3.5m x 2.4m', value: 9500 },
      { description: 'Instalação e Motorização PPA', value: 3000 }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
       <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">M</div>
            <span className="font-bold text-gray-800">Portal do Cliente</span>
         </div>
         <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600">Sair</button>
       </header>

       <main className="max-w-3xl mx-auto p-6 space-y-6">
         <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
           <div className="flex justify-between items-start mb-6">
             <div>
               <h2 className="text-2xl font-bold text-gray-800">Orçamento #{clientQuote.quoteNumber || clientQuote.id}</h2>
               <p className="text-gray-500">Emitido em {new Date().toLocaleDateString()}</p>
             </div>
             <Badge color="blue">{clientQuote.status}</Badge>
           </div>

           <div className="space-y-4 mb-8">
             {clientQuote.items.map((item: any, idx: number) => (
               <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                 <span className="text-gray-700">{item.description}</span>
                 <span className="font-medium">{formatCurrency(item.totalPrice || item.value)}</span>
               </div>
             ))}
             <div className="flex justify-between py-4 text-xl font-bold text-gray-900">
               <span>Total</span>
               <span>{formatCurrency(clientQuote.total)}</span>
             </div>
           </div>

           <div className="flex gap-4">
             <button className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md">
               Aprovar Orçamento
             </button>
             <button className="px-6 py-3 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50">
               Solicitar Alteração
             </button>
           </div>
         </div>
       </main>
    </div>
  );
};

// 4. MOBILE APP VIEW (Tech Persona)
const MobileAppView = () => {
  const [tab, setTab] = useState<'AGENDA' | 'VISITS' | 'OS' | 'PROFILE'>('AGENDA');
  const { orders, user, logout, visits, workOrders, leads, updateWorkOrder, createQuoteFromVisit, completeWorkOrder } = useAppContext();
  
  // Navigation State for Stack Simulation
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  // Derived Data
  const myVisits = visits.filter(v => v.assignedUserId === user?.id);
  const myWorkOrders = workOrders.filter(wo => wo.assignedTeam.includes(user?.id || ''));
  const todayVisits = myVisits.filter(v => new Date(v.scheduledAt).toDateString() === new Date().toDateString());

  // Sub-Components for Details
  const VisitDetail = ({ visitId }: { visitId: string }) => {
    const visit = visits.find(v => v.id === visitId);
    const lead = leads.find(l => l.id === visit?.leadId);
    const [measures, setMeasures] = useState(visit?.measurements || { width: 0, height: 0 });
    
    if (!visit) return null;

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedVisitId(null)} className="flex items-center text-slate-600 mb-2">
           <ArrowLeft size={20} className="mr-1"/> Voltar
        </button>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-xl text-gray-800">{lead?.clientName}</h2>
          <p className="text-gray-500 text-sm flex items-center gap-1 mt-1"><MapPin size={14}/> {lead?.notes}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
           <h3 className="font-semibold text-gray-700 border-b pb-2">Checklist</h3>
           {['Local Limpo', 'Ponto de Energia', 'Acesso Livre'].map(item => (
             <label key={item} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" defaultChecked />
                <span className="text-gray-700">{item}</span>
             </label>
           ))}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
           <h3 className="font-semibold text-gray-700 border-b pb-2">Medições (m)</h3>
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Largura</label>
                <input 
                  type="number" 
                  value={measures.width}
                  onChange={(e) => setMeasures({...measures, width: parseFloat(e.target.value)})}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Altura</label>
                <input 
                   type="number" 
                   value={measures.height}
                   onChange={(e) => setMeasures({...measures, height: parseFloat(e.target.value)})}
                   className="w-full border border-gray-300 rounded p-2"
                />
              </div>
           </div>
           <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50">
              <Camera size={20}/> Adicionar Fotos
           </button>
        </div>

        <button 
          onClick={() => {
            createQuoteFromVisit(visit, measures);
            setSelectedVisitId(null);
          }}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-green-700"
        >
          Salvar e Gerar Orçamento
        </button>
      </div>
    );
  };

  const WorkOrderDetail = ({ woId }: { woId: string }) => {
    const wo = workOrders.find(w => w.id === woId);
    const order = orders.find(o => o.id === wo?.orderId);
    if (!wo) return null;

    const isFinished = wo.status === WorkOrderStatus.FINISHED;

    return (
       <div className="space-y-4">
        <button onClick={() => setSelectedWorkOrderId(null)} className="flex items-center text-slate-600 mb-2">
           <ArrowLeft size={20} className="mr-1"/> Voltar
        </button>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
             <h2 className="font-bold text-xl text-gray-800">OS #{order?.orderNumber}</h2>
             <Badge color={isFinished ? 'green' : 'blue'}>{wo.status}</Badge>
          </div>
          <p className="text-gray-500 text-sm mt-1">{order?.clientName} - {wo.serviceType}</p>
        </div>

        {!isFinished && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Execução</h3>
            <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 bg-gray-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Etapa Atual</p>
                  <p className="font-bold text-slate-800">{wo.status}</p>
                </div>
                <button 
                  onClick={() => updateWorkOrder({...wo, status: WorkOrderStatus.WELDING})} // Mock advancement
                  className="bg-blue-600 text-white p-3 rounded-lg shadow-md"
                >
                  <CheckCircle size={24}/>
                </button>
            </div>
            
            <div className="space-y-2">
              <button className="w-full py-2 bg-slate-100 rounded-lg text-slate-600 flex items-center justify-center gap-2">
                  <Camera size={18}/> Fotos do Processo
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Consumo de Materiais (BOM)</h3>
           <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                 <span className="text-sm">Metalon 30x30</span>
                 <div className="flex items-center gap-3">
                    {!isFinished && <button className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">-</button>}
                    <span className="font-mono">12 un</span>
                    {!isFinished && <button className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">+</button>}
                 </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                 <span className="text-sm">Eletrodo 6013</span>
                 <div className="flex items-center gap-3">
                    {!isFinished && <button className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">-</button>}
                    <span className="font-mono">2 kg</span>
                    {!isFinished && <button className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">+</button>}
                 </div>
              </div>
           </div>
        </div>

        {!isFinished && (
           <button 
             onClick={() => {
               if(window.confirm('Confirma a conclusão da OS? Isso irá baixar o estoque consumido e registrar a garantia.')) {
                 completeWorkOrder(wo.id);
                 setSelectedWorkOrderId(null);
               }
             }}
             className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-slate-700 flex items-center justify-center gap-2"
           >
             <CheckSquare size={20}/> Finalizar OS e Baixar Estoque
           </button>
        )}
       </div>
    );
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 h-full min-h-screen border-x border-gray-200 relative pb-16 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 text-white p-4 sticky top-0 z-10 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-lg font-bold">MetalFlow Tech</h1>
          <p className="text-xs text-slate-400">Olá, {user?.name || 'Técnico'}</p>
        </div>
        <button onClick={logout} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600">
          <LogOut size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Conditional Rendering based on Tab and Selection */}
        {selectedVisitId ? (
          <VisitDetail visitId={selectedVisitId} />
        ) : selectedWorkOrderId ? (
          <WorkOrderDetail woId={selectedWorkOrderId} />
        ) : (
          <>
            {tab === 'AGENDA' && (
              <div className="space-y-3 animate-fade-in">
                 <h2 className="font-semibold text-gray-700">Agenda de Hoje</h2>
                 {todayVisits.length > 0 ? todayVisits.map(v => {
                   const lead = leads.find(l => l.id === v.leadId);
                   return (
                    <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-lg text-slate-800">{new Date(v.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <Badge color="blue">{v.status}</Badge>
                      </div>
                      <h3 className="font-medium text-gray-800">{lead?.clientName}</h3>
                      <div className="flex items-center text-gray-500 text-sm mt-1 gap-1">
                        <MapPin size={14} />
                        {lead?.notes || 'Endereço não disponível'}
                      </div>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead?.notes || '')}`}
                        target="_blank" rel="noreferrer"
                        className="w-full mt-3 bg-slate-800 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-700"
                      >
                        <Navigation size={16} /> Iniciar Navegação
                      </a>
                    </div>
                   );
                 }) : (
                   <p className="text-center text-gray-400 py-8">Nenhuma visita agendada para hoje.</p>
                 )}
              </div>
            )}

            {tab === 'VISITS' && (
               <div className="space-y-3 animate-fade-in">
                 <h2 className="font-semibold text-gray-700">Minhas Visitas</h2>
                 {myVisits.map(v => {
                   const lead = leads.find(l => l.id === v.leadId);
                   return (
                     <div key={v.id} onClick={() => setSelectedVisitId(v.id)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-xs font-bold text-slate-500">{new Date(v.scheduledAt).toLocaleDateString()}</span>
                           <ChevronRight size={16} className="text-gray-400"/>
                        </div>
                        <h3 className="font-medium text-gray-800">{lead?.clientName}</h3>
                        <p className="text-xs text-gray-500">{lead?.serviceType}</p>
                     </div>
                   );
                 })}
               </div>
            )}

            {tab === 'OS' && (
               <div className="space-y-3 animate-fade-in">
                 <h2 className="font-semibold text-gray-700">Ordens de Serviço</h2>
                 {myWorkOrders.map(wo => {
                   const order = orders.find(o => o.id === wo.orderId);
                   return (
                    <div key={wo.id} onClick={() => setSelectedWorkOrderId(wo.id)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer">
                      <div className="flex justify-between mb-2">
                          <span className="font-bold">OS #{order?.orderNumber}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{wo.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{order?.clientName}</p>
                      <div className="flex gap-2">
                        <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                          <PenTool size={12} /> Executar
                        </div>
                      </div>
                    </div>
                   );
                 })}
               </div>
            )}

            {tab === 'PROFILE' && (
              <div className="p-4 bg-white rounded-xl shadow-sm text-center animate-fade-in">
                <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto flex items-center justify-center text-slate-500 mb-4">
                  <UserIcon size={32} />
                </div>
                <h3 className="font-bold text-lg">{user?.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{user?.email}</p>
                <div className="text-left space-y-2 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600 flex justify-between"><span>Função:</span> <span className="font-medium">{user?.role}</span></p>
                  <p className="text-sm text-gray-600 flex justify-between"><span>Empresa:</span> <span className="font-medium">MetalFlow Matriz</span></p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 px-2 z-20 max-w-md mx-auto">
        <button onClick={() => { setTab('AGENDA'); setSelectedVisitId(null); setSelectedWorkOrderId(null); }} className={`flex flex-col items-center gap-1 text-xs ${tab === 'AGENDA' && !selectedVisitId && !selectedWorkOrderId ? 'text-blue-600' : 'text-gray-400'}`}>
          <Calendar size={24} /> Agenda
        </button>
        <button onClick={() => { setTab('VISITS'); setSelectedVisitId(null); setSelectedWorkOrderId(null); }} className={`flex flex-col items-center gap-1 text-xs ${tab === 'VISITS' || selectedVisitId ? 'text-blue-600' : 'text-gray-400'}`}>
          <MapPin size={24} /> Visitas
        </button>
        <button onClick={() => { setTab('OS'); setSelectedVisitId(null); setSelectedWorkOrderId(null); }} className={`flex flex-col items-center gap-1 text-xs ${tab === 'OS' || selectedWorkOrderId ? 'text-blue-600' : 'text-gray-400'}`}>
          <Wrench size={24} /> OS
        </button>
        <button onClick={() => { setTab('PROFILE'); setSelectedVisitId(null); setSelectedWorkOrderId(null); }} className={`flex flex-col items-center gap-1 text-xs ${tab === 'PROFILE' ? 'text-blue-600' : 'text-gray-400'}`}>
          <UserIcon size={24} /> Perfil
        </button>
      </div>
    </div>
  );
}


// --- MAIN LAYOUT & APP ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  initialData?: Client | null;
  companyId: string;
}

const ClientModal = ({ isOpen, onClose, onSave, initialData, companyId }: ClientModalProps) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    document: '',
    phone: '',
    email: '',
    addressFull: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        document: '',
        phone: '',
        email: '',
        addressFull: '',
        notes: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const newClient: Client = {
      id: initialData?.id || `cl_${Date.now()}`,
      companyId: initialData?.companyId || companyId,
      name: formData.name!,
      document: formData.document,
      phone: formData.phone,
      email: formData.email,
      addressFull: formData.addressFull,
      notes: formData.notes,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    onSave(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">{initialData ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
             <span className="text-2xl">&times;</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input 
              type="text" 
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF / CNPJ</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.document || ''}
                  onChange={e => setFormData({...formData, document: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.phone || ''}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.email || ''}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.addressFull || ''}
              onChange={e => setFormData({...formData, addressFull: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea 
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.notes || ''}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Salvar Cliente</button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  initialData?: Lead | null;
  companyId: string;
}

const LeadModal = ({ isOpen, onClose, onSave, initialData, companyId }: LeadModalProps) => {
  const [formData, setFormData] = useState<Partial<Lead>>({
    clientName: '',
    phone: '',
    serviceType: ServiceType.GATE,
    expectedValue: 0,
    priority: LeadPriority.MEDIUM,
    stage: LeadStage.NEW,
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        clientName: '',
        phone: '',
        serviceType: ServiceType.GATE,
        expectedValue: 0,
        priority: LeadPriority.MEDIUM,
        stage: LeadStage.NEW,
        notes: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName) return;

    const newLead: Lead = {
      id: initialData?.id || `l_${Date.now()}`,
      companyId: initialData?.companyId || companyId,
      clientName: formData.clientName!,
      phone: formData.phone || '',
      serviceType: formData.serviceType || ServiceType.GATE,
      expectedValue: Number(formData.expectedValue) || 0,
      priority: formData.priority || LeadPriority.MEDIUM,
      stage: formData.stage || LeadStage.NEW,
      notes: formData.notes,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(newLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">{initialData ? 'Editar Lead' : 'Novo Lead'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
             <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente *</label>
            <input 
              type="text" 
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.clientName || ''}
              onChange={e => setFormData({...formData, clientName: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.phone || ''}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.expectedValue || 0}
                  onChange={e => setFormData({...formData, expectedValue: parseFloat(e.target.value)})}
                />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Serviço</label>
                <select 
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                   value={formData.serviceType}
                   onChange={e => setFormData({...formData, serviceType: e.target.value as ServiceType})}
                >
                  {Object.values(ServiceType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <select 
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                   value={formData.priority}
                   onChange={e => setFormData({...formData, priority: e.target.value as LeadPriority})}
                >
                  {Object.values(LeadPriority).map(p => (
                    <option key={p} value={p}>{p === LeadPriority.HIGH ? 'Alta' : p === LeadPriority.MEDIUM ? 'Média' : 'Baixa'}</option>
                  ))}
                </select>
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estágio Inicial</label>
            <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={formData.stage}
                onChange={e => setFormData({...formData, stage: e.target.value as LeadStage})}
            >
              {Object.values(LeadStage).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea 
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.notes || ''}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Salvar Lead</button>
          </div>
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
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center mb-4 px-1">
         <h2 className="text-xl font-bold text-gray-800">Pipeline de Vendas</h2>
         <button 
           onClick={() => setIsModalOpen(true)}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-blue-700 transition"
         >
           <Plus size={16} /> Novo Lead
         </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-[1000px] pb-4">
          {stages.map(stage => (
            <div key={stage} className="flex-1 min-w-[280px] bg-slate-100 rounded-lg flex flex-col max-h-full">
              <div className="p-3 border-b border-gray-200 bg-slate-200 rounded-t-lg font-semibold text-slate-700 flex justify-between">
                {stage}
                <span className="bg-white px-2 rounded text-sm text-gray-500">
                  {leads.filter(l => l.stage === stage).length}
                </span>
              </div>
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {leads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} className="bg-white p-4 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-800">{lead.clientName}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${lead.priority === LeadPriority.HIGH ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {lead.priority === LeadPriority.HIGH ? 'Alta' : 'Normal'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{lead.serviceType}</p>
                    <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
                      <span>{formatCurrency(lead.expectedValue || 0)}</span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                      <button onClick={() => navigate('VISITS')} className="text-xs bg-blue-50 text-blue-700 py-1 rounded hover:bg-blue-100 flex items-center justify-center gap-1">
                          <Calendar size={12}/> Visita
                      </button>
                      <button onClick={() => navigate('QUOTES')} className="text-xs bg-green-50 text-green-700 py-1 rounded hover:bg-green-100 flex items-center justify-center gap-1">
                          <Calculator size={12}/> Orçar
                      </button>
                    </div>

                    {stage !== LeadStage.WON && (
                      <div className="mt-2">
                        <button 
                          onClick={() => updateLeadStage(lead.id, stages[stages.indexOf(stage) + 1])}
                          className="w-full text-xs bg-slate-800 text-white py-1 rounded hover:bg-slate-700"
                        >
                          Avançar &rarr;
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

const ClientsView = () => {
  const { clients, addClient, updateClient, deleteClient, user } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: keyof Client, direction: 'asc' | 'desc'} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    let result = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.document && c.document.includes(searchTerm)) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm))
    );

    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key]! < b[sortConfig.key]!) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key]! > b[sortConfig.key]!) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [clients, searchTerm, sortConfig]);

  const handleSort = (key: keyof Client) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteClient(id);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleSave = (client: Client) => {
    if (editingClient) {
      updateClient(client);
    } else {
      addClient(client);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <button 
           onClick={handleCreate}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
         >
           <Plus size={16} /> Novo Cliente
         </button>
      </div>

      <Card title={`Clientes (${filteredClients.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th 
                  className="p-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Nome {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3">Documento</th>
                <th className="p-3">Contato</th>
                <th className="p-3">Email</th>
                <th 
                  className="p-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  Criado em {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length > 0 ? filteredClients.map(client => (
                <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{client.name}</td>
                  <td className="p-3">{client.document || '-'}</td>
                  <td className="p-3">{client.phone || '-'}</td>
                  <td className="p-3">{client.email || '-'}</td>
                  <td className="p-3">{new Date(client.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => handleEdit(client)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                      title="Editar"
                    >
                      <Edit size={16}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(client.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                      title="Excluir"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">Nenhum cliente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingClient}
        companyId={user?.companyId || 'c1'}
      />
    </div>
  );
};

const VisitsView = () => {
  const { visits, leads } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h3 className="font-semibold text-gray-700">Agenda de Medições</h3>
         <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
           <Plus size={16} /> Agendar Nova
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {visits.map(visit => {
           const lead = leads.find(l => l.id === visit.leadId);
           return (
             <div key={visit.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                   <Calendar size={12} />
                   {new Date(visit.scheduledAt).toLocaleDateString()}
                 </div>
                 <Badge color={visit.status === VisitStatus.COMPLETED ? 'green' : 'blue'}>{visit.status}</Badge>
               </div>
               <h4 className="font-bold text-lg text-gray-800 mb-1">{lead?.clientName || 'Cliente'}</h4>
               <p className="text-sm text-gray-500 mb-4 flex items-center gap-1"><MapPin size={14}/> {lead?.notes || 'Endereço não informado'}</p>
               
               <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                 <span className="text-xs text-gray-400">Tech: {visit.assignedUserId}</span>
                 <button className="text-blue-600 text-sm font-medium hover:underline">Ver Detalhes</button>
               </div>
             </div>
           )
         })}
      </div>
    </div>
  );
};

const QuotesView = () => {
  const { quotes, leads, convertQuoteToOrder } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
           <Plus size={16} /> Novo Orçamento
         </button>
      </div>
      
      <Card title="Orçamentos Recentes">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Valor Total</th>
              <th className="p-3">Validade</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(quote => {
              const lead = leads.find(l => l.id === quote.leadId);
              return (
                <tr key={quote.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-mono">{quote.quoteNumber}</td>
                  <td className="p-3 font-medium text-gray-900">{lead?.clientName}</td>
                  <td className="p-3 font-bold">{formatCurrency(quote.total)}</td>
                  <td className="p-3 text-gray-500">{new Date(quote.validUntil).toLocaleDateString()}</td>
                  <td className="p-3"><Badge color={quote.status === QuoteStatus.APPROVED ? 'green' : 'blue'}>{quote.status}</Badge></td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button className="p-1 text-gray-500 hover:text-blue-600" title="Imprimir PDF"><Printer size={16}/></button>
                    {quote.status !== QuoteStatus.APPROVED && (
                      <button 
                        onClick={() => convertQuoteToOrder(quote)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Aprovar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const InventoryView = () => {
  const { stock, reserveStock, suppliers } = useAppContext();
  const suggestions = generatePurchaseSuggestions(stock);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'PURCHASE' | 'SUPPLIERS'>('STOCK');

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200">
        <button 
          className={`pb-2 px-4 font-medium ${activeTab === 'STOCK' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('STOCK')}
        >
          Estoque
        </button>
        <button 
          className={`pb-2 px-4 font-medium ${activeTab === 'PURCHASE' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('PURCHASE')}
        >
          Sugestão de Compra
        </button>
         <button 
          className={`pb-2 px-4 font-medium ${activeTab === 'SUPPLIERS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('SUPPLIERS')}
        >
          Fornecedores
        </button>
      </div>

      {activeTab === 'STOCK' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Qtd Física</th>
                  <th className="p-3 text-right">Reservado</th>
                  <th className="p-3 text-right">Disponível</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Valor un.</th>
                </tr>
              </thead>
              <tbody>
                {stock.map(item => {
                  const health = getStockHealth(item);
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{item.name}</td>
                      <td className="p-3"><Badge color="gray">{item.category}</Badge></td>
                      <td className="p-3 text-right">{item.quantity} {item.unit}</td>
                      <td className="p-3 text-right text-orange-600 font-medium">{item.reserved}</td>
                      <td className="p-3 text-right font-bold">{item.quantity - item.reserved}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${health === 'OK' ? 'bg-green-500' : health === 'LOW' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                      </td>
                      <td className="p-3 text-right">{formatCurrency(item.costAvg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'PURCHASE' && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm flex items-center gap-2">
            <AlertTriangle size={18} />
            O sistema calculou estas sugestões baseado no ponto de reposição, estoque reservado e lead time.
          </div>
          <Card title="Rascunho de Pedido de Compra">
             <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Item Crítico</th>
                  <th className="p-3 text-right">Atual</th>
                  <th className="p-3 text-right">Reservado</th>
                  <th className="p-3 text-right">Sugestão Compra</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.length > 0 ? suggestions.map(s => (
                  <tr key={s.itemId} className="border-b border-gray-100">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-right">{s.current}</td>
                    <td className="p-3 text-right text-red-500">{s.reserved}</td>
                    <td className="p-3 text-right font-bold text-blue-600">{Math.ceil(s.suggestedBuy)}</td>
                    <td className="p-3 text-center">
                      <button className="text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700">Gerar Pedido</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">Tudo certo! Nenhum item precisa de reposição imediata.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {activeTab === 'SUPPLIERS' && (
        <Card title="Lista de Fornecedores">
           <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Contato</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(sup => (
                   <tr key={sup.id} className="border-b border-gray-100">
                     <td className="p-3 font-medium">{sup.name}</td>
                     <td className="p-3">{sup.contactName}</td>
                     <td className="p-3">{sup.phone}</td>
                     <td className="p-3">{sup.email}</td>
                   </tr>
                ))}
              </tbody>
           </table>
        </Card>
      )}
    </div>
  );
};

const ProductionView = () => {
  const { orders } = useAppContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {orders.map(order => (
        <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-start">
            <div>
              <h4 className="font-bold text-gray-800">#{order.orderNumber} - {order.clientName}</h4>
              <p className="text-sm text-gray-500">{order.serviceType}</p>
            </div>
            <Badge color={order.status === 'CONCLUIDO' ? 'green' : 'blue'}>{order.status}</Badge>
          </div>
          <div className="p-4 flex-1 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progresso</span>
                <span>{order.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${order.progress}%` }}></div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg text-xs space-y-1">
               <p className="font-semibold text-blue-800">Materiais (BOM)</p>
               <div className="flex justify-between text-blue-700"><span>Metalon 30x30</span> <span>OK</span></div>
               <div className="flex justify-between text-blue-700"><span>Motor 1/2HP</span> <span className="text-orange-600 font-bold">Reserva Pendente</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <span className="block text-xs text-gray-400">Início</span>
                <span className="font-medium text-gray-700">{order.startDate}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="block text-xs text-gray-400">Prazo</span>
                <span className="font-medium text-gray-700">{order.expectedEndDate || '-'}</span>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-between items-center">
             <button className="text-sm text-slate-600 hover:text-slate-900 font-medium">Ver OS Detalhada</button>
             <button className="text-sm bg-white border border-gray-300 px-3 py-1 rounded shadow-sm hover:bg-gray-50">Apontamentos</button>
          </div>
        </div>
      ))}
    </div>
  );
};

const FinanceView = () => {
   const { receivables, payables } = useAppContext();
   const [tab, setTab] = useState<'IN' | 'OUT'>('IN');

   return (
     <div className="space-y-6">
       <div className="flex gap-4 border-b border-gray-200">
        <button className={`pb-2 px-4 font-medium ${tab === 'IN' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setTab('IN')}>Contas a Receber</button>
        <button className={`pb-2 px-4 font-medium ${tab === 'OUT' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setTab('OUT')}>Contas a Pagar</button>
       </div>

       {tab === 'IN' ? (
         <Card title="Recebíveis">
            <table className="w-full text-left text-sm text-gray-600">
               <thead className="bg-gray-50 text-gray-700 font-semibold">
                  <tr>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {receivables.map(r => (
                    r.installments?.map(inst => (
                      <tr key={inst.id} className="border-b border-gray-100">
                        <td className="p-3">{r.description} (Parc. {inst.installmentNumber})</td>
                        <td className="p-3">{new Date(inst.dueDate).toLocaleDateString()}</td>
                        <td className="p-3 font-bold">{formatCurrency(inst.value)}</td>
                        <td className="p-3"><Badge color={inst.status === PaymentStatus.PAID ? 'green' : inst.status === PaymentStatus.OVERDUE ? 'red' : 'yellow'}>{inst.status}</Badge></td>
                      </tr>
                    ))
                  ))}
               </tbody>
            </table>
         </Card>
       ) : (
         <Card title="Contas a Pagar">
            <table className="w-full text-left text-sm text-gray-600">
               <thead className="bg-gray-50 text-gray-700 font-semibold">
                  <tr>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3">Valor</th>
                  </tr>
               </thead>
               <tbody>
                  {payables.map(p => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="p-3 font-medium">{p.supplierName}</td>
                        <td className="p-3">{p.description}</td>
                        <td className="p-3"><Badge color="gray">{p.category}</Badge></td>
                        <td className="p-3">{new Date(p.dueDate).toLocaleDateString()}</td>
                        <td className="p-3 font-bold text-red-600">- {formatCurrency(p.value)}</td>
                      </tr>
                  ))}
               </tbody>
            </table>
         </Card>
       )}
     </div>
   )
}

const SettingsView = () => {
   const users = MOCK_USERS;

   return (
     <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Configurações e Usuários</h2>
        <Card title="Gestão de Usuários">
           <table className="w-full text-left text-sm text-gray-600">
              <thead>
                 <tr className="bg-gray-50 text-gray-700">
                    <th className="p-3">Nome</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Permissão</th>
                    <th className="p-3">Status</th>
                 </tr>
              </thead>
              <tbody>
                 {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-100">
                       <td className="p-3 font-medium">{u.name}</td>
                       <td className="p-3">{u.email}</td>
                       <td className="p-3"><Badge color="blue">{u.role}</Badge></td>
                       <td className="p-3"><Badge color={u.active ? 'green' : 'red'}>{u.active ? 'Ativo' : 'Inativo'}</Badge></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </Card>
     </div>
   )
}

const DashboardView = () => {
  const { leads, orders, stock, receivables } = useAppContext();

  // Metrics
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.stage === LeadStage.NEW).length;
  const activeOrders = orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED).length;
  const lowStockItems = stock.filter(i => getStockHealth(i) !== 'OK').length;
  
  // Chart Data: Lead Stages
  const leadStageData = Object.values(LeadStage).map(stage => ({
    name: stage,
    value: leads.filter(l => l.stage === stage).length
  })).filter(d => d.value > 0);

  // Mock Chart Data
   const chartData = [
     { name: 'Jan', vendas: 4000 },
     { name: 'Fev', vendas: 3000 },
     { name: 'Mar', vendas: 2000 },
     { name: 'Abr', vendas: 2780 },
     { name: 'Mai', vendas: 1890 },
     { name: 'Jun', vendas: 2390 },
     { name: 'Jul', vendas: 3490 },
   ];
   
   // COLORS for Pie Chart if needed
   const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Novos Leads</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{newLeads}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+12% essa semana</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Em Produção</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{activeOrders}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
              <Wrench size={24} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
             Ordens ativas na fábrica
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Alertas de Estoque</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{lowStockItems}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="mt-4 text-sm text-red-600 font-medium">
             Itens abaixo do mínimo
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Faturamento (Mês)</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">R$ 45.2k</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <DollarSign size={24} />
            </div>
          </div>
           <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+8% vs mês anterior</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Desempenho de Vendas</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Bar dataKey="vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-6">Funil de Vendas</h3>
           <div className="space-y-4">
              {leadStageData.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-sm text-gray-600">{d.name}</span>
                   </div>
                   <span className="font-bold text-gray-800">{d.value}</span>
                </div>
              ))}
           </div>
           
           <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-4">Atividades Recentes</h4>
              <div className="space-y-4">
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                       <FileText size={14} />
                    </div>
                    <div>
                       <p className="text-sm font-medium text-gray-800">Novo orçamento aprovado</p>
                       <p className="text-xs text-gray-500">Cliente: Condomínio Jardins</p>
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">2h</span>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                       <CheckCircle size={14} />
                    </div>
                    <div>
                       <p className="text-sm font-medium text-gray-800">OS #1002 Finalizada</p>
                       <p className="text-xs text-gray-500">Técnico: Pedro</p>
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">5h</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [stock, setStock] = useState<StockItem[]>(MOCK_STOCK);
  const [stockReservations, setStockReservations] = useState<StockReservation[]>([]);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES);
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(MOCK_WORK_ORDERS);
  const [receivables, setReceivables] = useState<Receivable[]>(MOCK_RECEIVABLES);
  const [payables, setPayables] = useState<Payable[]>(MOCK_PAYABLES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const login = (email: string, pass: string) => {
    const foundUser = MOCK_USERS.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      setIsClient(false);
      // Determine initial view based on role
      if (foundUser.role === UserRole.TECH) {
        setActiveView('MOBILE_APP');
      } else if (foundUser.role === UserRole.PRODUCTION) {
        setActiveView('PRODUCTION');
      } else if (foundUser.role === UserRole.SALES) {
        setActiveView('CRM');
      } else {
        setActiveView('DASHBOARD');
      }
      return true;
    }
    return false;
  };

  const loginAsClient = () => {
    setIsClient(true);
    setUser({ id: 'client', companyId: 'c1', name: 'Cliente Demo', role: UserRole.ADMIN, email: 'cliente@demo.com', active: true }); // Mock user object for client
  };

  const logout = () => {
    setUser(null);
    setIsClient(false);
    setActiveView('DASHBOARD');
  };

  const addLead = (lead: Lead) => {
    setLeads(prev => [lead, ...prev]);
  };

  const updateLeadStage = (id: string, stage: LeadStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));
  };
  
  const addClient = (client: Client) => {
    setClients(prev => [client, ...prev]);
  };
  
  const updateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };
  
  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const convertQuoteToOrder = (quote: Quote) => {
    // 1. Update Quote Status
    const updatedQuotes = quotes.map(q => q.id === quote.id ? { ...q, status: QuoteStatus.APPROVED } : q);
    setQuotes(updatedQuotes);

    // 2. Create Order
    const lead = leads.find(l => l.id === quote.leadId);
    const newOrder: Order = {
      id: `o${Date.now()}`,
      companyId: quote.companyId,
      quoteId: quote.id,
      clientName: lead?.clientName || 'Novo Cliente',
      orderNumber: 1000 + orders.length + 1,
      status: OrderStatus.OPEN,
      serviceType: lead?.serviceType || ServiceType.GATE, 
      startDate: new Date().toISOString().split('T')[0],
      progress: 0,
      createdAt: new Date().toISOString()
    };
    setOrders([...orders, newOrder]);

    // 3. Create Receivable (Signal + Balance)
    const signalValue = quote.total * 0.5; // 50% signal
    const balanceValue = quote.total - signalValue;
    
    const newReceivable: Receivable = {
       id: `r${Date.now()}`,
       companyId: quote.companyId,
       orderId: newOrder.id,
       quoteId: quote.id,
       description: `Pedido #${newOrder.orderNumber}`,
       totalValue: quote.total,
       installmentsCount: 2,
       status: PaymentStatus.OPEN,
       createdAt: new Date().toISOString(),
       installments: [
         {
           id: `ri${Date.now()}_1`,
           companyId: quote.companyId,
           receivableId: `r${Date.now()}`,
           installmentNumber: 1,
           dueDate: new Date().toISOString(), // Signal due now
           value: signalValue,
           status: PaymentStatus.OPEN
         },
         {
           id: `ri${Date.now()}_2`,
           companyId: quote.companyId,
           receivableId: `r${Date.now()}`,
           installmentNumber: 2,
           dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), // Balance in 30 days
           value: balanceValue,
           status: PaymentStatus.OPEN
         }
       ]
    };
    setReceivables([...receivables, newReceivable]);
    
    // 4. Create Work Order
    const newWorkOrder: WorkOrder = {
       id: `wo${Date.now()}`,
       companyId: quote.companyId,
       orderId: newOrder.id,
       serviceType: newOrder.serviceType,
       status: WorkOrderStatus.CUTTING,
       assignedTeam: [], // Needs assignment
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
    };
    setWorkOrders([...workOrders, newWorkOrder]);

    // 5. Automatic BOM Reservation Logic
    const visit = visits.find(v => v.id === quote.visitId);

    if (lead?.serviceType && visit?.measurements) {
        const template = MOCK_BOM_TEMPLATES.find(t => t.serviceType === lead.serviceType);
        if (template) {
           const requirements = calculateBOMRequirements(template, visit.measurements);
           const newReservations: StockReservation[] = [];
           
           // Update Stock Reservation State and Quantity Reserved
           setStock(prevStock => prevStock.map(item => {
              const req = requirements.find(r => r.stockItemId === item.id);
              if (req) {
                  // Create Reservation Record
                  newReservations.push({
                     id: `res-${Date.now()}-${item.id}`,
                     companyId: quote.companyId,
                     workOrderId: newWorkOrder.id,
                     stockItemId: item.id,
                     quantityReserved: req.quantity,
                     status: StockReservationStatus.RESERVED,
                     createdAt: new Date().toISOString()
                  });
                  // Increase reserved amount
                  return { ...item, reserved: item.reserved + req.quantity };
              }
              return item;
           }));
           setStockReservations(prev => [...prev, ...newReservations]);
        }
    }

    // Navigate to Orders
    setActiveView('PRODUCTION');
  };

  const reserveStock = (items: { stockItemId: string; quantity: number }[]) => {
    setStock(prev => prev.map(item => {
      const found = items.find(i => i.stockItemId === item.id);
      if (found) {
        return { ...item, reserved: item.reserved + found.quantity };
      }
      return item;
    }));
  };

  const updateWorkOrder = (wo: WorkOrder) => {
    setWorkOrders(prev => prev.map(w => w.id === wo.id ? wo : w));
  };

  const completeWorkOrder = (workOrderId: string) => {
    // 1. Consume Materials (Decrease Quantity and Reserved)
    const activeReservations = stockReservations.filter(r => r.workOrderId === workOrderId && r.status === StockReservationStatus.RESERVED);
    
    setStock(prevStock => prevStock.map(item => {
       const res = activeReservations.find(r => r.stockItemId === item.id);
       if (res) {
           return {
               ...item,
               quantity: item.quantity - res.quantityReserved, // Consume actual stock
               reserved: item.reserved - res.quantityReserved // Release reservation
           };
       }
       return item;
    }));

    // 2. Mark Reservations as Consumed
    setStockReservations(prev => prev.map(r => 
        r.workOrderId === workOrderId ? { ...r, status: StockReservationStatus.CONSUMED } : r
    ));

    // 3. Update Work Order Status
    let associatedOrderId = '';
    const wo = workOrders.find(w => w.id === workOrderId);
    associatedOrderId = wo?.orderId || '';

    setWorkOrders(prev => prev.map(wo => {
        if (wo.id === workOrderId) {
            return { ...wo, status: WorkOrderStatus.FINISHED, updatedAt: new Date().toISOString() };
        }
        return wo;
    }));

    // 4. Update Order Status
    if (associatedOrderId) {
        setOrders(prev => prev.map(o => o.id === associatedOrderId ? { ...o, status: OrderStatus.COMPLETED } : o));
    }

    // 5. Generate Warranty
    const warrantyDays = 365;
    const order = orders.find(o => o.id === associatedOrderId);
    const newWarranty: Warranty = {
      id: `w${Date.now()}`,
      companyId: user?.companyId || 'c1',
      orderId: associatedOrderId,
      clientId: order?.clientId || '',
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().setDate(new Date().getDate() + warrantyDays)).toISOString(),
      terms: 'Garantia de 1 ano contra defeitos de fabricação e instalação.',
      status: 'ACTIVE'
    };
    setWarranties(prev => [...prev, newWarranty]);

    // 6. Visual Feedback
    alert("OS Concluída com Sucesso!\n- Estoque consumido e baixado\n- Pedido marcado como Entregue\n- Garantia de 1 ano gerada");
  };

  const createQuoteFromVisit = (visit: Visit, measurements: Record<string, number>) => {
     const lead = leads.find(l => l.id === visit.leadId);
     const newQuote: Quote = {
        id: `q${Date.now()}`,
        companyId: visit.companyId,
        leadId: visit.leadId,
        visitId: visit.id,
        quoteNumber: 1000 + quotes.length + 1,
        status: QuoteStatus.DRAFT,
        validUntil: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
        subtotal: 0,
        discountValue: 0,
        total: 0,
        items: [],
        createdAt: new Date().toISOString()
     };
     setQuotes([...quotes, newQuote]);
     alert(`Rascunho de Orçamento criado para ${lead?.clientName}`);
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const navigate = (view: string) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const value: AppState = {
    user,
    isClient,
    leads,
    clients,
    stock,
    stockReservations,
    orders,
    quotes,
    visits,
    workOrders,
    receivables,
    payables,
    suppliers,
    warranties,
    activeView,
    isMobile,
    mobileMenuOpen,
    toggleMobileMenu,
    navigate,
    login,
    logout,
    loginAsClient,
    addLead, 
    updateLeadStage,
    addClient,
    updateClient,
    deleteClient,
    convertQuoteToOrder,
    completeWorkOrder,
    reserveStock,
    updateWorkOrder,
    createQuoteFromVisit
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- MAIN LAYOUT & APP ---

const MainLayout = () => {
  const { activeView, navigate, isMobile, mobileMenuOpen, toggleMobileMenu, user, logout, isClient } = useAppContext();

  // Authentication Guard
  if (!user && !isClient) {
    return <LoginView />;
  }

  // Client Portal Mode
  if (isClient) {
    return <ClientPortalView />;
  }

  // Tech Persona Mode (Mobile App View)
  if (activeView === 'MOBILE_APP' || user?.role === UserRole.TECH) {
    return <MobileAppView />;
  }

  // Permissions Helper
  const hasAccess = (allowedRoles: UserRole[]) => {
    return user && allowedRoles.includes(user.role);
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      {!isMobile && (
        <aside className="w-64 bg-slate-900 flex flex-col h-full shadow-xl z-20">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
             <div>
               <h1 className="text-white font-bold text-lg tracking-wide">MetalFlow</h1>
               <p className="text-xs text-slate-500">SaaS Industrial</p>
             </div>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {hasAccess([UserRole.ADMIN, UserRole.FINANCE, UserRole.SALES]) && (
              <>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 pt-2">Principal</div>
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeView === 'DASHBOARD'} onClick={() => navigate('DASHBOARD')} />
              </>
            )}
            
            {hasAccess([UserRole.ADMIN, UserRole.SALES]) && (
              <>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 pt-2">Vendas & Clientes</div>
                <SidebarItem icon={Users} label="CRM & Leads" active={activeView === 'CRM'} onClick={() => navigate('CRM')} />
                <SidebarItem icon={Briefcase} label="Clientes" active={activeView === 'CLIENTS'} onClick={() => navigate('CLIENTS')} />
                <SidebarItem icon={Calendar} label="Visitas" active={activeView === 'VISITS'} onClick={() => navigate('VISITS')} />
                <SidebarItem icon={Calculator} label="Orçamentos" active={activeView === 'QUOTES'} onClick={() => navigate('QUOTES')} />
              </>
            )}
            
            {(hasAccess([UserRole.ADMIN, UserRole.PRODUCTION, UserRole.FINANCE])) && (
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 pt-4">Operação</div>
            )}
            
            {hasAccess([UserRole.ADMIN, UserRole.PRODUCTION]) && (
              <>
                <SidebarItem icon={Wrench} label="Produção / OS" active={activeView === 'PRODUCTION'} onClick={() => navigate('PRODUCTION')} />
                <SidebarItem icon={Package} label="Estoque Smart" active={activeView === 'INVENTORY'} onClick={() => navigate('INVENTORY')} />
              </>
            )}

            {hasAccess([UserRole.ADMIN, UserRole.FINANCE]) && (
              <SidebarItem icon={DollarSign} label="Financeiro" active={activeView === 'FINANCE'} onClick={() => navigate('FINANCE')} />
            )}

            {hasAccess([UserRole.ADMIN]) && (
              <SidebarItem icon={Settings} label="Configurações" active={activeView === 'SETTINGS'} onClick={() => navigate('SETTINGS')} />
            )}
          </nav>
          
          <div className="p-4 border-t border-slate-800">
             {user?.role === UserRole.ADMIN && (
                <button onClick={() => navigate('MOBILE_APP')} className="w-full bg-slate-800 text-slate-300 py-2 rounded flex items-center justify-center gap-2 text-sm hover:bg-slate-700 transition mb-4">
                  <Truck size={16} /> Ver App Técnico
                </button>
             )}
             <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white">
                  {user?.name.charAt(0)}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.toLowerCase()}</p>
                </div>
                <button onClick={logout} className="text-slate-400 hover:text-white"><LogOut size={16} /></button>
             </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button onClick={toggleMobileMenu} className="text-gray-600">
                <Menu size={24} />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-800 capitalize">
              {activeView === 'DASHBOARD' ? 'Visão Geral' : 
               activeView === 'CRM' ? 'Gestão de Leads' :
               activeView === 'CLIENTS' ? 'Carteira de Clientes' :
               activeView === 'INVENTORY' ? 'Estoque Inteligente' :
               activeView === 'PRODUCTION' ? 'Ordens de Serviço' : 
               activeView === 'VISITS' ? 'Agenda de Medições' :
               activeView === 'QUOTES' ? 'Gestão de Orçamentos' :
               activeView === 'FINANCE' ? 'Gestão Financeira' :
               activeView === 'SETTINGS' ? 'Configurações' :
               activeView.toLowerCase()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            {activeView !== 'DASHBOARD' && (
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-md hover:bg-blue-700 transition">
                <Plus size={16} /> Novo
              </button>
            )}
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobile && mobileMenuOpen && (
          <div className="absolute inset-0 bg-slate-900/95 z-50 p-6 flex flex-col">
            <div className="flex justify-end mb-8">
              <button onClick={toggleMobileMenu} className="text-white"><LogOut size={24} /></button>
            </div>
            <nav className="space-y-4">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeView === 'DASHBOARD'} onClick={() => navigate('DASHBOARD')} />
              <SidebarItem icon={Users} label="CRM" active={activeView === 'CRM'} onClick={() => navigate('CRM')} />
              <SidebarItem icon={Briefcase} label="Clientes" active={activeView === 'CLIENTS'} onClick={() => navigate('CLIENTS')} />
              <SidebarItem icon={Calendar} label="Visitas" active={activeView === 'VISITS'} onClick={() => navigate('VISITS')} />
              <SidebarItem icon={Calculator} label="Orçamentos" active={activeView === 'QUOTES'} onClick={() => navigate('QUOTES')} />
              <SidebarItem icon={Package} label="Estoque" active={activeView === 'INVENTORY'} onClick={() => navigate('INVENTORY')} />
              <SidebarItem icon={Wrench} label="OS" active={activeView === 'PRODUCTION'} onClick={() => navigate('PRODUCTION')} />
              <SidebarItem icon={DollarSign} label="Financeiro" active={activeView === 'FINANCE'} onClick={() => navigate('FINANCE')} />
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-slate-800">
                <LogOut size={20} /> <span className="font-medium">Sair</span>
              </button>
            </nav>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          {activeView === 'DASHBOARD' && <DashboardView />}
          {activeView === 'CRM' && <CRMView />}
          {activeView === 'CLIENTS' && <ClientsView />}
          {activeView === 'VISITS' && <VisitsView />}
          {activeView === 'QUOTES' && <QuotesView />}
          {activeView === 'INVENTORY' && <InventoryView />}
          {activeView === 'PRODUCTION' && <ProductionView />}
          {activeView === 'FINANCE' && <FinanceView />}
          {activeView === 'SETTINGS' && <SettingsView />}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}