export type ParsedReceiptItem = {
  name: string;
  quantity?: string;
  unitPrice?: number;
  totalPrice: number;
  category: string;
  isPerishable: boolean;
  expiryDays?: number;
};

export type ParsedReceipt = {
  storeName: string;
  date: string;
  totalAmount: number;
  items: ParsedReceiptItem[];
  notes?: string;
};

export type ReceiptReconciliationResult = {
  receiptId: number;
  storeName: string;
  totalAmount: number;
  matchedCount: number;
  pendingRemainingCount: number;
  matchedNames: string[];
  remainingNames: string[];
  pantryUpdatedCount: number;
  summaryMessage: string;
};
