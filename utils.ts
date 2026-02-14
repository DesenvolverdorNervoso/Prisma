import { StockItem, ServiceBOMTemplate } from './types';

// Format currency
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Calculate Material Requirements based on BOM and Measurements
export const calculateBOMRequirements = (
  template: ServiceBOMTemplate,
  measurements: Record<string, number> // e.g. { width: 3, height: 2, area: 6 }
) => {
  const { width = 0, height = 0, area = 0, perimeter = 0 } = measurements;
  
  // Basic calculation for area/perimeter if not provided
  const calcArea = area || (width * height);
  const calcPerimeter = perimeter || ((width + height) * 2);

  return template.items.map(bomItem => {
    let quantity = 0;
    const formula = bomItem.quantityFormula.toLowerCase();

    // Simple parser for the specific rules mentioned
    if (formula.includes('fixed')) {
       // "fixed: 1"
       const parts = formula.split(':');
       quantity = parts.length > 1 ? parseFloat(parts[1]) : 1;
    } else if (formula.includes('area')) {
       // "area * 1.05"
       const multiplier = formula.includes('*') ? parseFloat(formula.split('*')[1]) : 1;
       quantity = calcArea * multiplier;
    } else if (formula.includes('perimeter') || formula.includes('perimetro')) {
       // "perimeter * 1.2"
       const multiplier = formula.includes('*') ? parseFloat(formula.split('*')[1]) : 1;
       quantity = calcPerimeter * multiplier;
    } else if (formula.includes('width') || formula.includes('largura')) {
       const multiplier = formula.includes('*') ? parseFloat(formula.split('*')[1]) : 1;
       quantity = width * multiplier;
    } else if (formula.includes('height') || formula.includes('altura')) {
       const multiplier = formula.includes('*') ? parseFloat(formula.split('*')[1]) : 1;
       quantity = height * multiplier;
    }

    return {
      stockItemId: bomItem.stockItemId,
      quantity: Math.ceil(quantity * 100) / 100 // Round to 2 decimals
    };
  });
};

// Smart Inventory: Check stock health
export const getStockHealth = (item: StockItem) => {
  const available = item.quantity - item.reserved;
  if (available <= 0) return 'CRITICAL';
  if (available <= item.minLevel) return 'LOW';
  return 'OK';
};

// Smart Inventory: Suggest Purchase
export const generatePurchaseSuggestions = (stock: StockItem[]) => {
  return stock
    .filter(item => (item.quantity - item.reserved) < item.reorderPoint)
    .map(item => ({
      itemId: item.id,
      name: item.name,
      current: item.quantity,
      reserved: item.reserved,
      suggestedBuy: (item.reorderPoint * 2) - (item.quantity - item.reserved) // Simple replenishment logic
    }));
};
