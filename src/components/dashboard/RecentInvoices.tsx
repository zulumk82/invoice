import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Invoice } from '../../types';

interface RecentInvoicesProps {
  invoices: Invoice[];
  userRole?: 'admin' | 'seller';
}

export const RecentInvoices: React.FC<RecentInvoicesProps> = ({ invoices, userRole = 'admin' }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {userRole === 'admin' ? 'Recent Invoices' : 'My Recent Invoices'}
      </h3>
      <div className="space-y-4">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {invoice.invoiceNumber}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(invoice.issueDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(invoice.total)}
              </p>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};