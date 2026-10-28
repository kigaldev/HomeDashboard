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

export type MatchedShoppingItem = {
  id: number;
  name: string;
  matchedWith: string;
};

export type ParsedReceiptWithMatches = ParsedReceipt & {
  matchedShoppingItems: MatchedShoppingItem[];
};

export type ReceiptActionConfig = {
  saveExpense: boolean;
  shoppingItemIds: number[];
  updatePantry: boolean;
  trackPerishables: boolean;
  registerWarranty?: {
    itemName: string;
    warrantyYears: number;
    price: number;
  } | null;
};

export type ReceiptExecutionResult = {
  receiptId?: number;
  expensesSaved: boolean;
  checkedShoppingCount: number;
  checkedShoppingNames: string[];
  pantryCount: number;
  perishablesCount: number;
  warrantyCreated: boolean;
  summaryMessage: string;
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

