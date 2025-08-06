import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, Client, Company, Quotation } from '../types';
import { formatCurrency, formatDate } from './utils';

// Helper function to add logo to PDF
const addLogoToPDF = async (pdf: jsPDF, logoUrl: string, x: number, y: number, width: number, height: number) => {
  try {
    if (!logoUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        try {
          pdf.addImage(img, 'PNG', x, y, width, height);
          resolve();
        } catch (error) {
          console.warn('Could not add logo to PDF:', error);
          resolve();
        }
      };
      img.onerror = () => {
        console.warn('Could not load logo image');
        resolve();
      };
      img.src = logoUrl;
    });
  } catch (error) {
    console.warn('Error adding logo:', error);
  }
};

// Helper function to create digital stamp
const addDigitalStamp = async (pdf: jsPDF, x: number, y: number, text: string, color: string, stampUrl?: string) => {
  const originalTextColor = pdf.getTextColor();
  const originalFontSize = pdf.getFontSize();
  
  if (stampUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Add stamp image
            pdf.addImage(img, 'PNG', x, y - 10, 30, 30);
            
            // Add stamp text below
            pdf.setTextColor(color);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text(text, x, y + 25);
            
            pdf.setTextColor(originalTextColor);
            pdf.setFontSize(originalFontSize);
            resolve();
          } catch (error) {
            console.warn('Could not add stamp image to PDF:', error);
            // Fallback to text stamp
            addTextStamp(pdf, x, y, text, color);
            resolve();
          }
        };
        img.onerror = () => {
          console.warn('Could not load stamp image');
          // Fallback to text stamp
          addTextStamp(pdf, x, y, text, color);
          resolve();
        };
        img.src = stampUrl;
      });
    } catch (error) {
      console.warn('Error adding stamp image:', error);
      addTextStamp(pdf, x, y, text, color);
    }
  } else {
    addTextStamp(pdf, x, y, text, color);
  }
};

// Helper function for text-based stamp (fallback)
const addTextStamp = (pdf: jsPDF, x: number, y: number, text: string, color: string) => {
  const originalTextColor = pdf.getTextColor();
  const originalFontSize = pdf.getFontSize();
  
  pdf.setTextColor(color);
  pdf.setFontSize(8);
  pdf.text(text, x, y);
  
  pdf.setTextColor(originalTextColor);
  pdf.setFontSize(originalFontSize);
};

// Helper function to create digital signature
const addDigitalSignature = async (pdf: jsPDF, x: number, y: number, companyName: string, color: string, signatureUrl?: string) => {
  const originalTextColor = pdf.getTextColor();
  const originalFontSize = pdf.getFontSize();
  
  if (signatureUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Add signature image
            pdf.addImage(img, 'PNG', x, y - 15, 60, 20);
            
            // Add signature text below
            pdf.setTextColor(color);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text(companyName, x, y + 10);
            pdf.text(new Date().toLocaleDateString(), x, y + 15);
            
            pdf.setTextColor(originalTextColor);
            pdf.setFontSize(originalFontSize);
            resolve();
          } catch (error) {
            console.warn('Could not add signature image to PDF:', error);
            // Fallback to text signature
            addTextSignature(pdf, x, y, companyName, color);
            resolve();
          }
        };
        img.onerror = () => {
          console.warn('Could not load signature image');
          // Fallback to text signature
          addTextSignature(pdf, x, y, companyName, color);
          resolve();
        };
        img.src = signatureUrl;
      });
    } catch (error) {
      console.warn('Error adding signature image:', error);
      addTextSignature(pdf, x, y, companyName, color);
    }
  } else {
    addTextSignature(pdf, x, y, companyName, color);
  }
};

// Helper function for text-based signature (fallback)
const addTextSignature = (pdf: jsPDF, x: number, y: number, companyName: string, color: string) => {
  const originalTextColor = pdf.getTextColor();
  const originalFontSize = pdf.getFontSize();
  
  // Signature line
  pdf.setDrawColor(color);
  pdf.line(x, y, x + 60, y);
  
  // Signature text
  pdf.setTextColor(color);
  pdf.setFontSize(10);
  pdf.text('Digital Signature', x, y - 5);
  pdf.setFontSize(8);
  pdf.text(companyName, x, y + 5);
  pdf.text(new Date().toLocaleDateString(), x, y + 10);
  
  pdf.setTextColor(originalTextColor);
  pdf.setFontSize(originalFontSize);
};

// Helper function to create rounded rectangle
const addRoundedRect = (pdf: jsPDF, x: number, y: number, width: number, height: number, color: string, radius: number = 3) => {
  const originalDrawColor = pdf.getDrawColor();
  const originalFillColor = pdf.getFillColor();
  
  pdf.setDrawColor(color);
  pdf.setFillColor(color);
  
  // Simple rounded rectangle approximation
  pdf.rect(x, y, width, height, 'F');
  
  pdf.setDrawColor(originalDrawColor);
  pdf.setFillColor(originalFillColor);
};

export const generateInvoicePDF = async (
  invoice: Invoice,
  client: Client,
  company: Company,
  creator?: { displayName: string } | null
): Promise<void> => {
  const pdf = new jsPDF();

  // Define colors - use company colors or fallback to professional defaults
  const primaryColor = company.primaryColor || '#1e40af'; // Deep blue
  const secondaryColor = company.secondaryColor || '#0d9488'; // Teal
  const accentColor = '#f8fafc'; // Light gray for backgrounds
  const textColor = '#1e293b'; // Dark slate for text
  const borderColor = '#e5e7eb'; // Subtle border color

  // Set initial position
  let yPosition = 20;

  // Header section with logo and company info
  const headerHeight = 60;

  // Add logo if available (larger, more prominent)
  if (company.logo) {
    await addLogoToPDF(pdf, company.logo, 20, yPosition, 50, 35);
  }

  // Company name and details
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.name, company.logo ? 80 : 20, yPosition + 18);

  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.address, company.logo ? 80 : 20, yPosition + 30);
  pdf.text(`Phone: ${company.phone}`, company.logo ? 80 : 20, yPosition + 37);
  pdf.text(`Email: ${company.email}`, company.logo ? 80 : 20, yPosition + 44);
  if (company.website) {
    pdf.text(`Website: ${company.website}`, company.logo ? 80 : 20, yPosition + 51);
  }

  // Invoice title and details (right side)
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', 150, yPosition + 25);

  // Invoice details box
  const invoiceBoxX = 145;
  const invoiceBoxY = yPosition + 35;
  const invoiceBoxWidth = 55;
  const invoiceBoxHeight = 32;
  addRoundedRect(pdf, invoiceBoxX - 5, invoiceBoxY - 5, invoiceBoxWidth + 10, invoiceBoxHeight + 10, accentColor);

  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${invoice.invoiceNumber}`, invoiceBoxX, invoiceBoxY);
  pdf.text(`Date: ${formatDate(invoice.issueDate)}`, invoiceBoxX, invoiceBoxY + 8);
  pdf.text(`Due: ${formatDate(invoice.dueDate)}`, invoiceBoxX, invoiceBoxY + 16);
  if (creator) {
    pdf.text(`Created by: ${creator.displayName}`, invoiceBoxX, invoiceBoxY + 24);
  }

  // Status badge
  const statusColors = {
    paid: '#10b981',
    sent: '#3b82f6',
    overdue: '#ef4444',
    draft: '#6b7280',
  };
  const statusColor = statusColors[invoice.status] || '#6b7280';
  pdf.setTextColor(statusColor);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(invoice.status.toUpperCase(), invoiceBoxX, invoiceBoxY + 32);

  yPosition += headerHeight + 30;

  // Client information section
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill To:', 20, yPosition);

  // Client details box
  addRoundedRect(pdf, 15, yPosition - 5, 85, 38, accentColor);

  pdf.setTextColor(textColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(client.name, 22, yPosition + 8);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(client.address, 22, yPosition + 16);
  pdf.text(client.email, 22, yPosition + 23);
  pdf.text(client.phone, 22, yPosition + 30);

  yPosition += 55;

  // Items table header
  const tableY = yPosition;
  const col1X = 20; // Description
  const col2X = 110; // Qty
  const col3X = 135; // Rate
  const col4X = 170; // Total

  // Table header background
  addRoundedRect(pdf, col1X - 5, tableY - 5, 165, 15, primaryColor);

  pdf.setTextColor('#ffffff');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', col1X, tableY + 4);
  pdf.text('Qty', col2X, tableY + 4);
  pdf.text('Rate', col3X, tableY + 4);
  pdf.text('Total', col4X, tableY + 4);

  yPosition += 20;

  // Items
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  invoice.items.forEach((item, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      addRoundedRect(pdf, col1X - 5, yPosition - 3, 165, 13, '#f1f5f9');
    }
    // Subtle row border
    pdf.setDrawColor(borderColor);
    pdf.line(col1X - 5, yPosition + 8, col1X + 160, yPosition + 8);

    pdf.text(item.description, col1X, yPosition + 5, { maxWidth: 85 });
    pdf.text(item.quantity.toString(), col2X, yPosition + 5, { align: 'right' });
    pdf.text(formatCurrency(item.rate), col3X, yPosition + 5, { align: 'right' });
    pdf.text(formatCurrency(item.total), col4X, yPosition + 5, { align: 'right' });
    yPosition += 13;
  });

  // Totals section
  yPosition += 12;

  // Subtotal
  pdf.setTextColor(textColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', col3X, yPosition, { align: 'right' });
  pdf.text(formatCurrency(invoice.subtotal), col4X, yPosition, { align: 'right' });
  yPosition += 9;

  // VAT
  pdf.text(`VAT (${invoice.tax}%):`, col3X, yPosition, { align: 'right' });
  pdf.text(formatCurrency(invoice.subtotal * (invoice.tax / 100)), col4X, yPosition, { align: 'right' });
  yPosition += 9;

  // Total
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total:', col3X, yPosition, { align: 'right' });
  pdf.text(formatCurrency(invoice.total), col4X, yPosition, { align: 'right' });

  // VAT Registration Number
  if (company.vatRegistrationNumber) {
    yPosition += 12;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(textColor);
    pdf.text(`VAT Reg. Number: ${company.vatRegistrationNumber}`, col3X, yPosition, { align: 'right' });
  }

  // Notes section
  if (invoice.notes) {
    yPosition += 22;
    pdf.setTextColor(primaryColor);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', 20, yPosition);
    pdf.setTextColor(textColor);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(invoice.notes, 150);
    pdf.text(splitNotes, 20, yPosition + 9);
  }

  // Footer section
  const footerY = 270;
  // Digital signature
  await addDigitalSignature(pdf, 20, footerY, company.name, primaryColor, company.digitalSignature);
  // Digital stamp
  await addDigitalStamp(pdf, 150, footerY, 'DIGITALLY GENERATED', secondaryColor, company.digitalStamp);
  await addDigitalStamp(pdf, 150, footerY + 5, `Generated on ${new Date().toLocaleDateString()}`, secondaryColor, company.digitalStamp);

  // Payment terms and thank you
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Payment Terms: Net 30 days', 20, footerY + 20);
  pdf.text('Thank you for your business!', 20, footerY + 27);
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(9);
  pdf.text(company.website || '', 150, footerY + 27, { align: 'right' });

  // Save the PDF
  pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
};

export const generateInvoicePDFAsBlob = async (
  invoice: Invoice,
  client: Client,
  company: Company,
  creator?: { displayName: string } | null
): Promise<jsPDF> => {
  const pdf = new jsPDF();
  
  // Define colors - use company colors or fallback to professional defaults
  const primaryColor = company.primaryColor || '#1e40af'; // Deep blue
  const secondaryColor = company.secondaryColor || '#0d9488'; // Teal
  const accentColor = '#f8fafc'; // Light gray for backgrounds
  const textColor = '#1e293b'; // Dark slate for text
  
  // Set initial position
  let yPosition = 20;
  
  // Header section with logo and company info
  const headerHeight = 60;
  
  // Add logo if available
  if (company.logo) {
    await addLogoToPDF(pdf, company.logo, 20, yPosition, 40, 30);
  }
  
  // Company name and details
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.name, company.logo ? 70 : 20, yPosition + 15);
  
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.address, company.logo ? 70 : 20, yPosition + 25);
  pdf.text(`Phone: ${company.phone}`, company.logo ? 70 : 20, yPosition + 32);
  pdf.text(`Email: ${company.email}`, company.logo ? 70 : 20, yPosition + 39);
  if (company.website) {
    pdf.text(`Website: ${company.website}`, company.logo ? 70 : 20, yPosition + 46);
  }
  
  // Invoice title and details (right side)
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', 150, yPosition + 20);
  
  // Invoice details box
  const invoiceBoxX = 150;
  const invoiceBoxY = yPosition + 30;
  const invoiceBoxWidth = 50;
  const invoiceBoxHeight = 25;
  
  addRoundedRect(pdf, invoiceBoxX - 5, invoiceBoxY - 5, invoiceBoxWidth + 10, invoiceBoxHeight + 10, accentColor);
  
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${invoice.invoiceNumber}`, invoiceBoxX, invoiceBoxY);
  pdf.text(`Date: ${formatDate(invoice.issueDate)}`, invoiceBoxX, invoiceBoxY + 7);
  pdf.text(`Due: ${formatDate(invoice.dueDate)}`, invoiceBoxX, invoiceBoxY + 14);
  
  // Add creator information if available
  if (creator) {
    pdf.text(`Created by: ${creator.displayName}`, invoiceBoxX, invoiceBoxY + 21);
  }
  
  // Status badge
  const statusColors = {
    paid: '#10b981',
    sent: '#3b82f6',
    overdue: '#ef4444',
    draft: '#6b7280'
  };
  
  const statusColor = statusColors[invoice.status] || '#6b7280';
  pdf.setTextColor(statusColor);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(invoice.status.toUpperCase(), invoiceBoxX, invoiceBoxY + 28);
  
  yPosition += headerHeight + 20;
  
  // Client information section
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill To:', 20, yPosition);
  
  // Client details box
  addRoundedRect(pdf, 15, yPosition - 5, 80, 35, accentColor);
  
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(client.name, 20, yPosition + 8);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(client.address, 20, yPosition + 15);
  pdf.text(client.email, 20, yPosition + 22);
  pdf.text(client.phone, 20, yPosition + 29);
  
  yPosition += 50;
  
  // Items table header
  const tableY = yPosition;
  const col1X = 20; // Description
  const col2X = 120; // Qty
  const col3X = 140; // Rate
  const col4X = 170; // Total
  
  // Table header background
  addRoundedRect(pdf, col1X - 5, tableY - 5, 175, 15, primaryColor);
  
  pdf.setTextColor('#ffffff');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', col1X, tableY + 3);
  pdf.text('Qty', col2X, tableY + 3);
  pdf.text('Rate', col3X, tableY + 3);
  pdf.text('Total', col4X, tableY + 3);
  
  yPosition += 20;
  
  // Items
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  invoice.items.forEach((item, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      addRoundedRect(pdf, col1X - 5, yPosition - 3, 175, 12, '#f8fafc');
    }
    
    pdf.text(item.description, col1X, yPosition + 3);
    pdf.text(item.quantity.toString(), col2X, yPosition + 3);
    pdf.text(formatCurrency(item.rate), col3X, yPosition + 3);
    pdf.text(formatCurrency(item.total), col4X, yPosition + 3);
    
    yPosition += 12;
  });
  
  // Totals section
  yPosition += 10;

  // Subtotal
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', col3X, yPosition);
  pdf.text(formatCurrency(invoice.subtotal), col4X, yPosition);
  yPosition += 8;

  // VAT
  pdf.text(`VAT (${invoice.tax}%):`, col3X, yPosition);
  pdf.text(formatCurrency(invoice.subtotal * (invoice.tax / 100)), col4X, yPosition);
  yPosition += 8;

  // Total
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total:', col3X, yPosition);
  pdf.text(formatCurrency(invoice.total), col4X, yPosition);

  // VAT Registration Number
  if (company.vatRegistrationNumber) {
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(textColor);
    pdf.text(`VAT Reg. Number: ${company.vatRegistrationNumber}`, col3X, yPosition);
  }
  
  // Notes section
  if (invoice.notes) {
    yPosition += 20;
    
    pdf.setTextColor(primaryColor);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', 20, yPosition);
    
    pdf.setTextColor(textColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(invoice.notes, 150);
    pdf.text(splitNotes, 20, yPosition + 8);
  }
  
  // Footer section
  const footerY = 270;
  
  // Digital signature
  await addDigitalSignature(pdf, 20, footerY, company.name, primaryColor, company.digitalSignature);
  
  // Digital stamp
  await addDigitalStamp(pdf, 150, footerY, 'DIGITALLY GENERATED', secondaryColor, company.digitalStamp);
  await addDigitalStamp(pdf, 150, footerY + 5, `Generated on ${new Date().toLocaleDateString()}`, secondaryColor, company.digitalStamp);
  
  // Payment terms
  pdf.setTextColor(textColor);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Payment Terms: Net 30 days', 20, footerY + 20);
  pdf.text('Thank you for your business!', 20, footerY + 27);
  
  return pdf;
};

export const generateReceiptPDF = async (
  receipt: any,
  invoice: Invoice,
  client: Client,
  company: Company
): Promise<void> => {
  const pdf = new jsPDF();
  const primaryColor = company.primaryColor || '#1e40af';
  const secondaryColor = company.secondaryColor || '#0d9488';
  const accentColor = '#f8fafc';
  const textColor = '#1e293b';
  const borderColor = '#e5e7eb';
  let yPosition = 20;
  // Header with logo
  if (company.logo) {
    await addLogoToPDF(pdf, company.logo, 20, yPosition, 50, 35);
  }
  // Company name
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.name, company.logo ? 80 : 20, yPosition + 18);
  // Company details
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.address, company.logo ? 80 : 20, yPosition + 30);
  pdf.text(`Phone: ${company.phone}`, company.logo ? 80 : 20, yPosition + 37);
  pdf.text(`Email: ${company.email}`, company.logo ? 80 : 20, yPosition + 44);
  // Receipt title
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEIPT', 150, yPosition + 25);
  // Receipt details box
  addRoundedRect(pdf, 145, yPosition + 35, 55, 32, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${receipt.id}`, 150, yPosition + 40);
  pdf.text(`Date: ${formatDate(receipt.date)}`, 150, yPosition + 48);
  pdf.text(`Invoice: ${invoice.invoiceNumber}`, 150, yPosition + 56);
  yPosition += 80;
  // Client information
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Received From:', 20, yPosition);
  addRoundedRect(pdf, 15, yPosition - 5, 85, 30, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(client.name, 22, yPosition + 8);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(client.address, 22, yPosition + 16);
  pdf.text(client.email, 22, yPosition + 23);
  yPosition += 40;
  // Payment details
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Details:', 20, yPosition);
  addRoundedRect(pdf, 15, yPosition - 5, 85, 30, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Amount: ${formatCurrency(receipt.amount)}`, 22, yPosition + 8);
  pdf.text(`Method: ${receipt.method}`, 22, yPosition + 16);
  pdf.text(`Date: ${formatDate(receipt.date)}`, 22, yPosition + 23);
  yPosition += 40;
  // Notes
  if (receipt.notes) {
    pdf.setTextColor(primaryColor);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', 20, yPosition);
    pdf.setTextColor(textColor);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(receipt.notes, 150);
    pdf.text(splitNotes, 20, yPosition + 9);
    yPosition += 22;
  }
  // Footer
  const footerY = 270;
  await addDigitalSignature(pdf, 20, footerY, company.name, primaryColor, company.digitalSignature);
  await addDigitalStamp(pdf, 150, footerY, 'PAYMENT RECEIVED', secondaryColor, company.digitalStamp);
  await addDigitalStamp(pdf, 150, footerY + 5, `Generated on ${new Date().toLocaleDateString()}`, secondaryColor, company.digitalStamp);
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Thank you for your payment!', 20, footerY + 20);
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(9);
  pdf.text(company.website || '', 150, footerY + 27, { align: 'right' });
  pdf.save(`receipt-${receipt.id}.pdf`);
};

export const generateReceiptPDFAsBlob = async (
  receipt: any,
  invoice: Invoice,
  client: Client,
  company: Company
): Promise<jsPDF> => {
  const pdf = new jsPDF();
  // Copy the content from generateReceiptPDF, but do not call pdf.save()
  // --- BEGIN COPY ---
  // Header
  const primaryColor = company.primaryColor || '#1e40af';
  const secondaryColor = company.secondaryColor || '#0d9488';
  const accentColor = '#f8fafc';
  const textColor = '#1e293b';
  let yPosition = 20;
  if (company.logo) {
    await addLogoToPDF(pdf, company.logo, 20, yPosition, 40, 30);
  }
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.name, company.logo ? 70 : 20, yPosition + 15);
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.address, company.logo ? 70 : 20, yPosition + 25);
  pdf.text(`Phone: ${company.phone}`, company.logo ? 70 : 20, yPosition + 32);
  pdf.text(`Email: ${company.email}`, company.logo ? 70 : 20, yPosition + 39);
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEIPT', 150, yPosition + 20);
  addRoundedRect(pdf, 145, yPosition + 25, 55, 35, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${receipt.id}`, 150, yPosition + 35);
  pdf.text(`Date: ${formatDate(receipt.date)}`, 150, yPosition + 42);
  pdf.text(`Invoice: ${invoice.invoiceNumber}`, 150, yPosition + 49);
  yPosition += 80;
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Receipt For:', 20, yPosition);
  addRoundedRect(pdf, 15, yPosition - 5, 80, 25, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(client.name, 20, yPosition + 8);
  yPosition += 40;
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Details', 20, yPosition);
  yPosition += 10;
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Amount Paid: ${formatCurrency(receipt.amount)}`, 20, yPosition);
  pdf.text(`Method: ${receipt.method}`, 80, yPosition);
  pdf.text(`Date: ${formatDate(receipt.date)}`, 140, yPosition);
  yPosition += 10;
  pdf.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, yPosition);
  pdf.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 80, yPosition);
  pdf.text(`VAT (${invoice.tax}%): ${formatCurrency(invoice.subtotal * (invoice.tax / 100))}`, 140, yPosition);
  yPosition += 10;
  pdf.text(`Total: ${formatCurrency(invoice.total)}`, 20, yPosition);
  if (company.vatRegistrationNumber) {
    pdf.text(`VAT Reg. Number: ${company.vatRegistrationNumber}`, 80, yPosition);
  }
  if (receipt.notes) {
    yPosition += 15;
    pdf.setTextColor(primaryColor);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', 20, yPosition);
    pdf.setTextColor(textColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(receipt.notes, 150);
    pdf.text(splitNotes, 20, yPosition + 8);
  }
  const footerY = 270;
  await addDigitalSignature(pdf, 20, footerY, company.name, primaryColor, company.digitalSignature);
  await addDigitalStamp(pdf, 150, footerY, 'RECEIPT', secondaryColor, company.digitalStamp);
  await addDigitalStamp(pdf, 150, footerY + 5, `Generated on ${new Date().toLocaleDateString()}`, secondaryColor, company.digitalStamp);
  pdf.setTextColor(textColor);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Thank you for your payment!', 20, footerY + 20);
  // --- END COPY ---
  return pdf;
};

export const generateQuotationPDF = async (
  quotation: Quotation,
  company: Company
): Promise<void> => {
  const pdf = new jsPDF();
  const primaryColor = company.primaryColor || '#1e40af';
  const secondaryColor = company.secondaryColor || '#0d9488';
  const accentColor = '#f8fafc';
  const textColor = '#1e293b';
  const borderColor = '#e5e7eb';
  let yPosition = 20;
  // Header with logo
  if (company.logo) {
    await addLogoToPDF(pdf, company.logo, 20, yPosition, 50, 35);
  }
  // Company name
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.name, company.logo ? 80 : 20, yPosition + 18);
  // Company details
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.address, company.logo ? 80 : 20, yPosition + 30);
  pdf.text(`Phone: ${company.phone}`, company.logo ? 80 : 20, yPosition + 37);
  pdf.text(`Email: ${company.email}`, company.logo ? 80 : 20, yPosition + 44);
  // Quotation title
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('QUOTATION', 150, yPosition + 25);
  // Quotation details box
  addRoundedRect(pdf, 145, yPosition + 35, 55, 32, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${quotation.id}`, 150, yPosition + 40);
  pdf.text(`Date: ${quotation.date}`, 150, yPosition + 48);
  pdf.text(`Expires: ${quotation.expiryDate}`, 150, yPosition + 56);
  // Status badge
  const statusColors = {
    Draft: '#6b7280',
    Sent: '#3b82f6',
    Accepted: '#10b981',
    Declined: '#ef4444',
    Expired: '#f59e0b',
  };
  const statusColor = statusColors[quotation.status] || '#6b7280';
  pdf.setTextColor(statusColor);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(quotation.status.toUpperCase(), 150, yPosition + 64);
  yPosition += 90;
  // Client information
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Quotation For:', 20, yPosition);
  addRoundedRect(pdf, 15, yPosition - 5, 85, 30, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(quotation.clientName, 22, yPosition + 8);
  yPosition += 40;
  // Items table header
  const tableY = yPosition;
  const col1X = 20; // Description
  const col2X = 110; // Qty
  const col3X = 135; // Unit Price
  const col4X = 170; // Total
  addRoundedRect(pdf, col1X - 5, tableY - 5, 165, 15, primaryColor);
  pdf.setTextColor('#ffffff');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', col1X, tableY + 4);
  pdf.text('Qty', col2X, tableY + 4);
  pdf.text('Unit Price', col3X, tableY + 4);
  pdf.text('Total', col4X, tableY + 4);
  yPosition += 20;
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  quotation.items.forEach((item, index) => {
    if (index % 2 === 0) {
      addRoundedRect(pdf, col1X - 5, yPosition - 3, 165, 13, '#f1f5f9');
    }
    pdf.setDrawColor(borderColor);
    pdf.line(col1X - 5, yPosition + 8, col1X + 160, yPosition + 8);
    pdf.text(item.description, col1X, yPosition + 5, { maxWidth: 85 });
    pdf.text(item.quantity.toString(), col2X, yPosition + 5, { align: 'right' });
    pdf.text(formatCurrency(item.unitPrice), col3X, yPosition + 5, { align: 'right' });
    pdf.text(formatCurrency(item.quantity * item.unitPrice), col4X, yPosition + 5, { align: 'right' });
    yPosition += 13;
  });
  // Totals and VAT breakdown
  yPosition += 12;
  pdf.setTextColor(textColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', col3X, yPosition, { align: 'right' });
  pdf.text(formatCurrency(quotation.subtotal), col4X, yPosition, { align: 'right' });
  yPosition += 9;
  pdf.text(`VAT (${quotation.tax}%):`, col3X, yPosition, { align: 'right' });
  pdf.text(formatCurrency(quotation.subtotal * (quotation.tax / 100)), col4X, yPosition, { align: 'right' });
  yPosition += 9;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(15);
  pdf.text('Total:', col3X, yPosition, { align: 'right' });
  pdf.text(formatCurrency(quotation.total), col4X, yPosition, { align: 'right' });
  // VAT Registration Number
  if (company.vatRegistrationNumber) {
    yPosition += 12;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(textColor);
    pdf.text(`VAT Reg. Number: ${company.vatRegistrationNumber}`, col3X, yPosition, { align: 'right' });
  }
  // Notes
  if (quotation.notes) {
    yPosition += 22;
    pdf.setTextColor(primaryColor);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', 20, yPosition);
    pdf.setTextColor(textColor);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(quotation.notes, 150);
    pdf.text(splitNotes, 20, yPosition + 9);
  }
  // Footer
  const footerY = 270;
  await addDigitalSignature(pdf, 20, footerY, company.name, primaryColor, company.digitalSignature);
  await addDigitalStamp(pdf, 150, footerY, 'QUOTATION', secondaryColor, company.digitalStamp);
  await addDigitalStamp(pdf, 150, footerY + 5, `Generated on ${new Date().toLocaleDateString()}`, secondaryColor, company.digitalStamp);
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('This quotation is valid until the expiry date shown above.', 20, footerY + 20);
  pdf.text('Thank you for considering our services!', 20, footerY + 27);
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(9);
  pdf.text(company.website || '', 150, footerY + 27, { align: 'right' });
  pdf.save(`quotation-${quotation.id}.pdf`);
};

export const generateQuotationPDFAsBlob = async (
  quotation: Quotation,
  company: Company
): Promise<jsPDF> => {
  const pdf = new jsPDF();
  // --- Copy the content from generateQuotationPDF, but do not call pdf.save() ---
  // Define colors
  const primaryColor = company.primaryColor || '#1e40af';
  const secondaryColor = company.secondaryColor || '#0d9488';
  const accentColor = '#f8fafc';
  const textColor = '#1e293b';
  let yPosition = 20;
  if (company.logo) {
    await addLogoToPDF(pdf, company.logo, 20, yPosition, 40, 30);
  }
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.name, company.logo ? 70 : 20, yPosition + 15);
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(company.address, company.logo ? 70 : 20, yPosition + 25);
  pdf.text(`Phone: ${company.phone}`, company.logo ? 70 : 20, yPosition + 32);
  pdf.text(`Email: ${company.email}`, company.logo ? 70 : 20, yPosition + 39);
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('QUOTATION', 150, yPosition + 20);
  addRoundedRect(pdf, 145, yPosition + 25, 55, 35, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${quotation.id}`, 150, yPosition + 35);
  pdf.text(`Date: ${quotation.date}`, 150, yPosition + 42);
  pdf.text(`Expires: ${quotation.expiryDate}`, 150, yPosition + 49);
  const statusColors = {
    Draft: '#6b7280',
    Sent: '#3b82f6',
    Accepted: '#10b981',
    Declined: '#ef4444',
    Expired: '#f59e0b'
  };
  const statusColor = statusColors[quotation.status] || '#6b7280';
  pdf.setTextColor(statusColor);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(quotation.status.toUpperCase(), 150, yPosition + 56);
  yPosition += 80;
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Quotation For:', 20, yPosition);
  addRoundedRect(pdf, 15, yPosition - 5, 80, 25, accentColor);
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(quotation.clientName, 20, yPosition + 8);
  yPosition += 40;
  const tableY = yPosition;
  const col1X = 20;
  const col2X = 120;
  const col3X = 140;
  const col4X = 170;
  addRoundedRect(pdf, col1X - 5, tableY - 5, 175, 15, primaryColor);
  pdf.setTextColor('#ffffff');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', col1X, tableY + 3);
  pdf.text('Qty', col2X, tableY + 3);
  pdf.text('Unit Price', col3X, tableY + 3);
  pdf.text('Total', col4X, tableY + 3);
  yPosition += 20;
  pdf.setTextColor(textColor);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  quotation.items.forEach((item, index) => {
    if (index % 2 === 0) {
      addRoundedRect(pdf, col1X - 5, yPosition - 3, 175, 12, '#f8fafc');
    }
    pdf.text(item.description, col1X, yPosition + 3);
    pdf.text(item.quantity.toString(), col2X, yPosition + 3);
    pdf.text(formatCurrency(item.unitPrice), col3X, yPosition + 3);
    pdf.text(formatCurrency(item.quantity * item.unitPrice), col4X, yPosition + 3);
    yPosition += 12;
  });
  yPosition += 10;
  pdf.setTextColor(textColor);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', col3X, yPosition);
  pdf.text(formatCurrency(quotation.subtotal), col4X, yPosition);
  yPosition += 7;
  pdf.text(`VAT (${quotation.tax}%):`, col3X, yPosition);
  pdf.text(formatCurrency(quotation.subtotal * (quotation.tax / 100)), col4X, yPosition);
  yPosition += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(14);
  pdf.text('Total:', col3X, yPosition);
  pdf.text(formatCurrency(quotation.total), col4X, yPosition);
  if (company.vatRegistrationNumber) {
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(textColor);
    pdf.text(`VAT Reg. Number: ${company.vatRegistrationNumber}`, col3X, yPosition);
  }
  if (quotation.notes) {
    yPosition += 20;
    pdf.setTextColor(primaryColor);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', 20, yPosition);
    pdf.setTextColor(textColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(quotation.notes, 150);
    pdf.text(splitNotes, 20, yPosition + 8);
  }
  const footerY = 270;
  await addDigitalSignature(pdf, 20, footerY, company.name, primaryColor, company.digitalSignature);
  await addDigitalStamp(pdf, 150, footerY, 'QUOTATION', secondaryColor, company.digitalStamp);
  await addDigitalStamp(pdf, 150, footerY + 5, `Generated on ${new Date().toLocaleDateString()}`, secondaryColor, company.digitalStamp);
  pdf.setTextColor(textColor);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('This quotation is valid until the expiry date shown above.', 20, footerY + 20);
  pdf.text('Thank you for considering our services!', 20, footerY + 27);
  return pdf;
};