// --- ENUMS ---
export enum UserRole {
  ADMIN = 'ADMIN',
  SALES = 'VENDAS',
  TECH = 'TECNICO',
  PRODUCTION = 'PRODUCAO',
  FINANCE = 'FINANCEIRO',
}

export enum LeadStage {
  NEW = 'NOVO',
  CONTACT = 'CONTATO',
  VISIT = 'VISITA',
  QUOTE = 'ORCAMENTO',
  NEGOCIACAO = 'NEGOCIACAO',
  WON = 'FECHADO',
  EXECUTING = 'EM_EXECUCAO',
  COMPLETED = 'CONCLUIDO',
  POST_SALES = 'POS_VENDA',
  LOST = 'PERDIDO',
}

export enum LeadPriority {
  LOW = 'BAIXA',
  MEDIUM = 'MEDIA',
  HIGH = 'ALTA',
}

export enum ServiceType {
  GATE = 'PORTAO',
  POLYCARBONATE = 'POLICARBONATO',
  AWNING = 'TOLDO',
  FUNNEL = 'FUNILARIA',
  WELDING = 'SOLDA',
  OTHER = 'OUTROS',
}

export enum QuoteStatus {
  DRAFT = 'RASCUNHO',
  SENT = 'ENVIADO',
  APPROVED = 'APROVADO',
  REJECTED = 'REJEITADO',
  EXPIRED = 'EXPIRADO',
}

export enum OrderStatus {
  OPEN = 'ABERTO',
  PRODUCTION = 'EM_PRODUCAO',
  INSTALLATION = 'EM_INSTALACAO',
  PAUSED = 'PAUSADO',
  COMPLETED = 'CONCLUIDO',
  CANCELLED = 'CANCELADO',
}

export enum WorkOrderStatus {
  CUTTING = 'CORTE',
  WELDING = 'SOLDA',
  FINISHING = 'ACABAMENTO',
  PINTURA = 'PINTURA',
  INSTALLATION = 'INSTALACAO',
  TESTING = 'TESTE_ENTREGA',
  FINISHED = 'FINALIZADA',
}

export enum VisitStatus {
  SCHEDULED = 'AGENDADA',
  COMPLETED = 'REALIZADA',
  RESCHEDULED = 'REMARCADA',
  CANCELLED = 'CANCELADA',
}

export enum StockCategory {
  METAL = 'METAL',
  SHEET = 'CHAPA',
  POLY = 'POLICARBONATO',
  AUTOMATION = 'AUTOMACAO',
  TOOLS = 'FERRAMENTAS',
  CONSUMABLE = 'CONSUMIVEIS',
  PAINT = 'PINTURA',
  FIXING = 'FIXACAO',
  OTHER = 'OUTROS',
}

export enum StockMovementType {
  IN = 'ENTRADA',
  OUT = 'SAIDA',
  ADJUST = 'AJUSTE',
  RESERVE = 'RESERVA',
  UNRESERVE = 'DESRESERVA',
}

export enum StockReservationStatus {
  RESERVED = 'RESERVADO',
  CONSUMED = 'CONSUMIDO',
  CANCELLED = 'CANCELADO',
}

export enum PurchaseOrderStatus {
  DRAFT = 'RASCUNHO',
  SENT = 'ENVIADO',
  RECEIVED = 'RECEBIDO',
  CANCELLED = 'CANCELADO',
}

export enum PaymentMethod {
  PIX = 'PIX',
  CARD = 'CARTAO',
  BOLETO = 'BOLETO',
  CASH = 'DINHEIRO',
  TRANSFER = 'TRANSFERENCIA',
}

export enum PaymentStatus {
  OPEN = 'ABERTO',
  PARTIAL = 'PARCIAL',
  PAID = 'PAGO',
  OVERDUE = 'ATRASADO',
  CANCELLED = 'CANCELADO',
}

export enum PayableCategory {
  MATERIAL = 'MATERIAL',
  OUTSOURCED = 'SERVICO_TERCEIRO',
  FIXED_COST = 'DESPESA_FIXA',
  OTHER = 'OUTROS',
}

// --- INTERFACES ---

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  settings?: {
    taxRate?: number;
    minMargin?: number;
    quoteValidityDays?: number;
  };
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  addressFull?: string;
  notes?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  companyId: string;
  clientId?: string;
  clientName: string;
  phone: string;
  source?: string;
  serviceType: ServiceType;
  stage: LeadStage;
  priority: LeadPriority;
  expectedValue?: number;
  nextActionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  companyId: string;
  leadId?: string;
  clientId?: string;
  scheduledAt: string;
  assignedUserId?: string;
  addressOverride?: string;
  checklist?: Record<string, boolean>;
  measurements?: Record<string, number>; // e.g. { width: 3.5, height: 2.2, area: 7.7 }
  photos?: string[];
  clientSignatureUrl?: string;
  status: VisitStatus;
  createdAt: string;
}

export interface Quote {
  id: string;
  companyId: string;
  leadId?: string;
  clientId?: string;
  visitId?: string;
  quoteNumber: number;
  status: QuoteStatus;
  validUntil: string;
  subtotal: number;
  discountValue: number;
  total: number;
  deliveryTimeDays?: number;
  warrantyDays?: number;
  termsText?: string;
  pdfFileId?: string;
  createdByUserId?: string;
  createdAt: string;
  items: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  companyId: string;
  quoteId: string;
  type: 'SERVICO' | 'MATERIAL';
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  relatedStockItemId?: string;
}

export interface Order {
  id: string;
  companyId: string;
  quoteId?: string;
  clientId?: string;
  clientName?: string;
  orderNumber: number;
  status: OrderStatus;
  startDate?: string;
  expectedEndDate?: string;
  serviceType: ServiceType;
  notes?: string;
  progress: number;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  companyId: string;
  orderId: string;
  serviceType: ServiceType;
  status: WorkOrderStatus;
  assignedTeam: string[];
  checklist?: Record<string, boolean>;
  measurements?: Record<string, number>;
  photosBefore?: string[];
  photosAfter?: string[];
  clientSignatureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog {
  id: string;
  companyId: string;
  workOrderId: string;
  userId: string;
  date: string;
  hoursWorked: number;
  notes?: string;
}

// --- INVENTORY ---

export interface StockItem {
  id: string;
  companyId: string;
  name: string;
  category: StockCategory;
  unit: string;
  sku?: string;
  costAvg: number;
  minLevel: number;
  reorderPoint: number;
  leadTimeDays: number;
  location?: string;
  active: boolean;
  quantity: number; // Snapshot of current available (calc from movements)
  reserved: number; // Snapshot of current reserved
}

export interface StockMovement {
  id: string;
  companyId: string;
  stockItemId: string;
  type: StockMovementType;
  quantity: number;
  costUnit?: number;
  relatedWorkOrderId?: string;
  relatedPurchaseId?: string;
  notes?: string;
  createdByUserId?: string;
  date: string; // created_at
}

export interface StockReservation {
  id: string;
  companyId: string;
  workOrderId: string;
  stockItemId: string;
  quantityReserved: number;
  status: StockReservationStatus;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  expectedDeliveryDate?: string;
  totalEstimated: number;
  createdAt: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  companyId: string;
  purchaseOrderId: string;
  stockItemId: string;
  quantity: number;
  unitCostEstimated?: number;
}

// --- BOM (Bill of Materials) ---

export interface ServiceBOMTemplate {
  id: string;
  companyId: string;
  serviceType: ServiceType;
  name: string;
  items: ServiceBOMItem[];
}

export interface ServiceBOMItem {
  id: string;
  companyId: string;
  bomTemplateId: string;
  stockItemId: string;
  quantityFormula: string; // e.g. "area * 1.05", "width * 2", "fixed: 1"
  unit?: string;
}

// --- FINANCE ---

export interface Receivable {
  id: string;
  companyId: string;
  clientId?: string;
  orderId?: string;
  quoteId?: string;
  description: string;
  totalValue: number;
  installmentsCount: number;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  installments?: ReceivableInstallment[];
}

export interface ReceivableInstallment {
  id: string;
  companyId: string;
  receivableId: string;
  installmentNumber: number;
  dueDate: string;
  value: number;
  paidAt?: string;
  paidValue?: number;
  status: PaymentStatus;
}

export interface Payable {
  id: string;
  companyId: string;
  supplierName?: string;
  description: string;
  category: PayableCategory;
  dueDate: string;
  value: number;
  status: PaymentStatus;
}

// --- WARRANTY ---

export interface Warranty {
  id: string;
  companyId: string;
  orderId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  terms: string;
  status: 'ACTIVE' | 'EXPIRED';
}