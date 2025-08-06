import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Timestamp } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Invoice } from "../types";
import { databaseService } from "./database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SZL'
  }).format(amount);
}

export function convertFirestoreTimestampToDate(obj: any): any {
  if (!obj) return obj;
  
  if (obj instanceof Timestamp) {
    return obj.toDate();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertFirestoreTimestampToDate(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertFirestoreTimestampToDate(value);
    }
    return converted;
  }
  
  return obj;
}
export function formatDate(dateInput: Date | string | number): string {
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    return 'N/A';
  }
  if (!date || isNaN(date.getTime()) || date.getFullYear() < 1980) {
    return 'N/A';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `INV-${timestamp}-${random}`;
}

export const createReceiptFromInvoice = async (invoice: Invoice, method: 'cash' | 'card' | 'transfer' | 'other' = 'cash', createdBy?: string) => {
  try {
    console.log('Creating receipt for invoice:', invoice.id, invoice.invoiceNumber);
    
    const receiptData = {
      companyId: invoice.companyId,
      invoiceId: invoice.id,
      amount: invoice.total,
      method,
      date: new Date(),
      notes: `Payment received for invoice ${invoice.invoiceNumber}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: createdBy || invoice.createdBy || 'unknown'
    };

    console.log('Receipt data to be created:', receiptData);

    // Use the database service instead of direct Firebase call
    const receiptId = await databaseService.add('receipts', receiptData, createdBy || 'unknown');
    
    console.log('Receipt created successfully with ID:', receiptId);
    
    return {
      success: true,
      receiptId: receiptId,
      message: 'Receipt created successfully'
    };
  } catch (error) {
    console.error('Error creating receipt:', error);
    console.error('Invoice data:', invoice);
    console.error('Method:', method);
    
    // Log more specific error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create receipt'
    };
  }
};

// SRA (Swaziland Revenue Authority) Compliance Utilities
export function formatDateForSRA(dateInput: Date | string | number): string {
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    return '';
  }
  
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  
  // Format as DD/MM/YYYY for SRA compliance
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

export function validateSRAReportData(data: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    if (!row['Customer/Supplier Name'] || row['Customer/Supplier Name'].trim() === '') {
      errors.push(`Row ${index + 1}: Missing Customer/Supplier Name`);
    }
    if (!row['Invoice Number'] || row['Invoice Number'].trim() === '') {
      errors.push(`Row ${index + 1}: Missing Invoice Number`);
    }
    if (!row['Invoice Date'] || row['Invoice Date'].trim() === '') {
      errors.push(`Row ${index + 1}: Missing Invoice Date`);
    }
    if (!row['Amount (excl. VAT)'] || isNaN(parseFloat(row['Amount (excl. VAT)']))) {
      errors.push(`Row ${index + 1}: Invalid Amount (excl. VAT)`);
    }
    if (!row['VAT Amount'] || isNaN(parseFloat(row['VAT Amount']))) {
      errors.push(`Row ${index + 1}: Invalid VAT Amount`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Invoice calculation validation
export function validateInvoiceCalculations(invoice: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Calculate expected subtotal from items
  const expectedSubtotal = invoice.items.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.rate);
  }, 0);
  
  // Check if subtotal matches
  if (Math.abs(invoice.subtotal - expectedSubtotal) > 0.01) {
    errors.push(`Invoice subtotal (${invoice.subtotal}) doesn't match sum of items (${expectedSubtotal})`);
  }
  
  // Check if total matches subtotal + tax
  const expectedTotal = invoice.subtotal + (invoice.subtotal * (invoice.tax / 100));
  if (Math.abs(invoice.total - expectedTotal) > 0.01) {
    errors.push(`Invoice total (${invoice.total}) doesn't match subtotal + tax (${expectedTotal})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Receipt validation
export function validateReceiptAmount(receipt: any, invoice: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (receipt.amount > invoice.total) {
    errors.push(`Receipt amount (${receipt.amount}) exceeds invoice total (${invoice.total})`);
  }
  
  if (receipt.amount <= 0) {
    errors.push(`Receipt amount must be greater than 0`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}