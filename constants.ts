import { Lead, LeadStage, ServiceType, StockCategory, StockItem, User, UserRole, ServiceBOMTemplate, Order, OrderStatus, LeadPriority, Visit, VisitStatus, Quote, QuoteStatus, Receivable, PaymentStatus, Payable, PayableCategory, Supplier, PaymentMethod, WorkOrder, WorkOrderStatus } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', companyId: 'c1', name: 'Carlos Admin', role: UserRole.ADMIN, email: 'admin@metalflow.com', active: true },
  { id: 'u2', companyId: 'c1', name: 'João Vendas', role: UserRole.SALES, email: 'vendas@metalflow.com', active: true },
  { id: 'u3', companyId: 'c1', name: 'Pedro Técnico', role: UserRole.TECH, email: 'tech@metalflow.com', active: true },
  { id: 'u4', companyId: 'c1', name: 'Maria Financeiro', role: UserRole.FINANCE, email: 'fin@metalflow.com', active: true },
  { id: 'u5', companyId: 'c1', name: 'Roberto Produção', role: UserRole.PRODUCTION, email: 'prod@metalflow.com', active: true },
];

export const MOCK_STOCK: StockItem[] = [
  { id: 's1', companyId: 'c1', name: 'Metalon 30x30 Galv.', category: StockCategory.METAL, unit: 'bar', quantity: 45, reserved: 10, minLevel: 20, reorderPoint: 30, costAvg: 85.00, leadTimeDays: 2, active: true },
  { id: 's2', companyId: 'c1', name: 'Chapa Lambril 0.65', category: StockCategory.SHEET, unit: 'm2', quantity: 120, reserved: 40, minLevel: 50, reorderPoint: 60, costAvg: 45.50, leadTimeDays: 3, active: true },
  { id: 's3', companyId: 'c1', name: 'Policarbonato Compacto 6mm', category: StockCategory.POLY, unit: 'm2', quantity: 15, reserved: 0, minLevel: 10, reorderPoint: 15, costAvg: 350.00, leadTimeDays: 5, active: true },
  { id: 's4', companyId: 'c1', name: 'Kit Motor Deslizante 1/2HP', category: StockCategory.AUTOMATION, unit: 'un', quantity: 3, reserved: 1, minLevel: 2, reorderPoint: 4, costAvg: 450.00, leadTimeDays: 1, active: true },
  { id: 's5', companyId: 'c1', name: 'Cremalheira Industrial', category: StockCategory.AUTOMATION, unit: 'm', quantity: 30, reserved: 5, minLevel: 10, reorderPoint: 15, costAvg: 25.00, leadTimeDays: 1, active: true },
  { id: 's6', companyId: 'c1', name: 'Eletrodo 6013', category: StockCategory.CONSUMABLE, unit: 'kg', quantity: 10, reserved: 0, minLevel: 5, reorderPoint: 8, costAvg: 35.00, leadTimeDays: 0, active: true },
  { id: 's7', companyId: 'c1', name: 'Disco Corte 7"', category: StockCategory.CONSUMABLE, unit: 'un', quantity: 50, reserved: 0, minLevel: 20, reorderPoint: 30, costAvg: 8.50, leadTimeDays: 0, active: true },
  { id: 's8', companyId: 'c1', name: 'Parafuso Autobrocante', category: StockCategory.FIXING, unit: 'cx', quantity: 8, reserved: 1, minLevel: 2, reorderPoint: 4, costAvg: 45.00, leadTimeDays: 1, active: true },
];

export const MOCK_BOM_TEMPLATES: ServiceBOMTemplate[] = [
  {
    id: 't1',
    companyId: 'c1',
    name: 'Portão Deslizante Padrão',
    serviceType: ServiceType.GATE,
    items: [
      { id: 'bi1', companyId: 'c1', bomTemplateId: 't1', stockItemId: 's1', quantityFormula: 'perimeter * 1.2' }, 
      { id: 'bi2', companyId: 'c1', bomTemplateId: 't1', stockItemId: 's2', quantityFormula: 'area * 1.1' }, 
      { id: 'bi3', companyId: 'c1', bomTemplateId: 't1', stockItemId: 's4', quantityFormula: 'fixed: 1' }, 
      { id: 'bi4', companyId: 'c1', bomTemplateId: 't1', stockItemId: 's5', quantityFormula: 'width * 1.1' }, 
      { id: 'bi5', companyId: 'c1', bomTemplateId: 't1', stockItemId: 's7', quantityFormula: 'fixed: 4' },
    ]
  }
];

export const MOCK_LEADS: Lead[] = [
  { id: 'l1', companyId: 'c1', clientName: 'Condomínio Jardins', phone: '11999999999', serviceType: ServiceType.GATE, stage: LeadStage.NEGOCIACAO, expectedValue: 12500, priority: LeadPriority.HIGH, notes: 'Portão principal quebrado', createdAt: '2023-10-25', updatedAt: '2023-10-25' },
  { id: 'l2', companyId: 'c1', clientName: 'Padaria Central', phone: '11888888888', serviceType: ServiceType.AWNING, stage: LeadStage.VISIT, expectedValue: 3200, priority: LeadPriority.MEDIUM, notes: 'Troca de lona', createdAt: '2023-10-26', updatedAt: '2023-10-26' },
  { id: 'l3', companyId: 'c1', clientName: 'Roberto Silva', phone: '11777777777', serviceType: ServiceType.POLYCARBONATE, stage: LeadStage.NEW, expectedValue: 5000, priority: LeadPriority.LOW, notes: 'Cobertura garagem', createdAt: '2023-10-27', updatedAt: '2023-10-27' },
];

export const MOCK_VISITS: Visit[] = [
  { id: 'v1', companyId: 'c1', leadId: 'l2', scheduledAt: '2023-10-30T14:00:00', assignedUserId: 'u3', status: VisitStatus.SCHEDULED, createdAt: '2023-10-26' },
  { id: 'v2', companyId: 'c1', leadId: 'l1', scheduledAt: '2023-10-28T09:00:00', assignedUserId: 'u3', status: VisitStatus.COMPLETED, checklist: { 'Medidas OK': true, 'Fotos OK': true }, createdAt: '2023-10-25' }
];

export const MOCK_QUOTES: Quote[] = [
  { 
    id: 'q1', companyId: 'c1', leadId: 'l1', quoteNumber: 1050, status: QuoteStatus.SENT, validUntil: '2023-11-10', 
    subtotal: 12000, discountValue: 0, total: 12000, 
    items: [
      { id: 'qi1', companyId: 'c1', quoteId: 'q1', type: 'MATERIAL', description: 'Portão Deslizante 4x2.20', quantity: 1, unitPrice: 9000, totalPrice: 9000 },
      { id: 'qi2', companyId: 'c1', quoteId: 'q1', type: 'SERVICO', description: 'Instalação e Automação', quantity: 1, unitPrice: 3000, totalPrice: 3000 }
    ],
    createdAt: '2023-10-28' 
  }
];

export const MOCK_ORDERS: Order[] = [
  { id: 'o1', companyId: 'c1', orderNumber: 1001, quoteId: 'q10', clientName: 'Escola Futuro', serviceType: ServiceType.GATE, status: OrderStatus.PRODUCTION, startDate: '2023-10-20', expectedEndDate: '2023-11-05', progress: 60, createdAt: '2023-10-18' }
];

export const MOCK_WORK_ORDERS: WorkOrder[] = [
  { 
    id: 'wo1', companyId: 'c1', orderId: 'o1', serviceType: ServiceType.GATE, 
    status: WorkOrderStatus.CUTTING, assignedTeam: ['u3'], 
    checklist: { 'Material Separado': true, 'EPI Ok': true },
    measurements: { width: 3.5, height: 2.4 },
    createdAt: '2023-10-21', updatedAt: '2023-10-21'
  }
];

export const MOCK_RECEIVABLES: Receivable[] = [
  { 
    id: 'r1', companyId: 'c1', orderId: 'o1', description: 'Entrada Pedido Escola Futuro', totalValue: 4500, installmentsCount: 1, status: PaymentStatus.PAID, createdAt: '2023-10-18',
    installments: [{ id: 'ri1', companyId: 'c1', receivableId: 'r1', installmentNumber: 1, dueDate: '2023-10-18', value: 4500, paidAt: '2023-10-18', paidValue: 4500, status: PaymentStatus.PAID }]
  },
  { 
    id: 'r2', companyId: 'c1', orderId: 'o1', description: 'Final Pedido Escola Futuro', totalValue: 4500, installmentsCount: 1, status: PaymentStatus.OPEN, createdAt: '2023-10-18',
    installments: [{ id: 'ri2', companyId: 'c1', receivableId: 'r2', installmentNumber: 1, dueDate: '2023-11-05', value: 4500, status: PaymentStatus.OPEN }]
  }
];

export const MOCK_PAYABLES: Payable[] = [
  { id: 'p1', companyId: 'c1', supplierName: 'Aço Forte Ltda', description: 'Compra de Material #442', category: PayableCategory.MATERIAL, dueDate: '2023-11-02', value: 1250.00, status: PaymentStatus.OPEN },
  { id: 'p2', companyId: 'c1', supplierName: 'Energia Local', description: 'Conta de Luz Outubro', category: PayableCategory.FIXED_COST, dueDate: '2023-11-10', value: 380.00, status: PaymentStatus.OPEN }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'sup1', companyId: 'c1', name: 'Aço Forte Ltda', contactName: 'Marcos', phone: '11999990000', email: 'vendas@acoforte.com' },
  { id: 'sup2', companyId: 'c1', name: 'Casa dos Parafusos', contactName: 'Julia', phone: '11988880000', email: 'contato@parafusos.com' }
];