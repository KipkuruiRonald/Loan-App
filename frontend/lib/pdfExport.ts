import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format currency for display
export const formatCurrency = (amount: number, currency: string = 'KSh '): string => {
  return `${currency}${amount.toLocaleString()}`;
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Okoleo brand colors - using tuples for TypeScript compatibility
const BRAND_COLORS = {
  primary: [62, 61, 57] as [number, number, number],    // #3E3D39 - Okoleo dark gray
  secondary: [212, 200, 181] as [number, number, number], // #D4C8B5 - Okoleo cream
  accent: [60, 89, 114] as [number, number, number],      // #3C5972 - Okoleo blue
  muted: [109, 116, 100] as [number, number, number],     // #6D7464 - Okoleo muted
  light: [245, 247, 250] as [number, number, number],     // Light gray for table rows
};

// Load logo as base64 - returns null if not found
async function loadLogoAsBase64(): Promise<string | null> {
  try {
    const response = await fetch('/logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Export Loans to PDF with company branding
export const exportLoansToPDF = async (loans: any[], summary: any): Promise<void> => {
  const doc = new jsPDF();
  
  // Try to add logo
  const logoBase64 = await loadLogoAsBase64();
  if (logoBase64) {
    // Add logo - 40x20mm size
    doc.addImage(logoBase64, 'PNG', 14, 10, 40, 20);
  } else {
    // Fallback: Add text-based header if no logo
    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLORS.primary[0], BRAND_COLORS.primary[1], BRAND_COLORS.primary[2]);
    doc.text('Okoleo', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.muted[0], BRAND_COLORS.muted[1], BRAND_COLORS.muted[2]);
    doc.text('Quick Loans for Kenya', 14, 28);
  }
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(BRAND_COLORS.accent[0], BRAND_COLORS.accent[1], BRAND_COLORS.accent[2]);
  doc.text('Loan Statement', 14, logoBase64 ? 40 : 45);
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.muted[0], BRAND_COLORS.muted[1], BRAND_COLORS.muted[2]);
  const today = new Date().toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Generated on: ${today}`, 14, logoBase64 ? 48 : 53);
  
  // Add summary section
  doc.setFontSize(12);
  doc.setTextColor(BRAND_COLORS.primary[0], BRAND_COLORS.primary[1], BRAND_COLORS.primary[2]);
  doc.text('Summary', 14, logoBase64 ? 60 : 65);
  
  doc.setFontSize(10);
  doc.setTextColor(5, 5, 5); // Near black
  const startY = logoBase64 ? 68 : 73;
  doc.text(`Active Loans: ${summary.active_loans || loans.length}`, 14, startY);
  doc.text(`Total Outstanding: ${formatCurrency(summary.total_outstanding || 0)}`, 14, startY + 7);
  doc.text(`Total Paid: ${formatCurrency(summary.total_paid || 0)}`, 14, startY + 14);
  doc.text(`Credit Tier: ${summary.credit_tier || 1}`, 14, startY + 21);
  doc.text(`Credit Limit: ${formatCurrency(summary.credit_limit || 500)}`, 14, startY + 28);
  
  // Add loans table
  const tableData = loans.map(loan => [
    loan.loan_id || 'N/A',
    formatCurrency(loan.principal),
    `${loan.interest_rate || 0}%`,
    formatCurrency(loan.total_due),
    formatCurrency(loan.remaining_balance || loan.total_due || 0),
    loan.status || 'UNKNOWN',
    loan.due_date ? new Date(loan.due_date).toLocaleDateString('en-KE') : 'N/A',
    loan.perfect_repayment ? 'Yes' : 'No',
  ]);
  
  autoTable(doc, {
    startY: startY + 38,
    head: [['Loan ID', 'Principal', 'Rate', 'Total Due', 'Balance', 'Status', 'Due Date', 'Perfect']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_COLORS.accent,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: BRAND_COLORS.light,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });
  
  // Add footer to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    
    // Footer text
    doc.text(
      'Okoleo - Quick Loans for Kenya | This is a computer-generated document',
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    
    // Page number
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 15,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  // Save the PDF
  const fileName = `okoleo-loans-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Export Transactions to PDF
export const exportTransactionsToPDF = async (transactions: any[]): Promise<void> => {
  const doc = new jsPDF();
  
  // Try to add logo
  const logoBase64 = await loadLogoAsBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, 10, 40, 20);
  } else {
    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLORS.primary[0], BRAND_COLORS.primary[1], BRAND_COLORS.primary[2]);
    doc.text('Okoleo', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.muted[0], BRAND_COLORS.muted[1], BRAND_COLORS.muted[2]);
    doc.text('Quick Loans for Kenya', 14, 28);
  }
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(BRAND_COLORS.accent[0], BRAND_COLORS.accent[1], BRAND_COLORS.accent[2]);
  doc.text('Transaction History', 14, logoBase64 ? 40 : 45);
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.muted[0], BRAND_COLORS.muted[1], BRAND_COLORS.muted[2]);
  const today = new Date().toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Generated on: ${today}`, 14, logoBase64 ? 48 : 53);
  
  // Add summary
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const completedCount = transactions.filter(t => t.status === 'COMPLETED' || t.status === 'PAID').length;
  
  doc.setFontSize(12);
  doc.setTextColor(BRAND_COLORS.primary[0], BRAND_COLORS.primary[1], BRAND_COLORS.primary[2]);
  doc.text('Summary', 14, logoBase64 ? 60 : 65);
  
  doc.setFontSize(10);
  doc.setTextColor(5, 5, 5);
  const startY = logoBase64 ? 68 : 73;
  doc.text(`Total Transactions: ${transactions.length}`, 14, startY);
  doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, 14, startY + 7);
  doc.text(`Completed: ${completedCount}`, 14, startY + 14);
  
  // Add transactions table
  const tableData = transactions.map(txn => [
    txn.transaction_id || 'N/A',
    formatCurrency(txn.amount),
    txn.type || 'PAYMENT',
    txn.status || 'UNKNOWN',
    txn.initiated_at ? new Date(txn.initiated_at).toLocaleDateString('en-KE') : 'N/A',
    txn.completed_at ? new Date(txn.completed_at).toLocaleDateString('en-KE') : 'Pending',
  ]);
  
  autoTable(doc, {
    startY: startY + 24,
    head: [['Transaction ID', 'Amount', 'Type', 'Status', 'Initiated', 'Completed']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_COLORS.accent,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: BRAND_COLORS.light,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Okoleo - Quick Loans for Kenya | This is a computer-generated document',
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 15,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  // Save
  doc.save(`okoleo-transactions-${new Date().toISOString().split('T')[0]}.pdf`);
};
