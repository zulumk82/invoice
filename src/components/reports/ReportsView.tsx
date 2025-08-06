import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Calendar, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Invoice, Receipt } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { convertFirestoreTimestampToDate } from '../../lib/utils';
import { invoiceService, receiptService } from '../../lib/dataService';
import { clientService, companyService } from '../../lib/dataService';
import { Client, Company } from '../../types';

export const ReportsView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('revenue');
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.companyId) return;
      try {
        // Fetch invoices
        let invoicesData = await invoiceService.getInvoices(userProfile.companyId);
        invoicesData = convertFirestoreTimestampToDate(invoicesData);
        invoicesData = invoicesData.map(inv => ({
          ...inv,
          issueDate: inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate),
          dueDate: inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate),
          createdAt: inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt),
          updatedAt: inv.updatedAt instanceof Date ? inv.updatedAt : new Date(inv.updatedAt)
        }));
        setInvoices(invoicesData);
        // Fetch receipts
        let receiptsData = await receiptService.getReceipts(userProfile.companyId);
        receiptsData = convertFirestoreTimestampToDate(receiptsData);
        receiptsData = receiptsData.map(rec => ({
          ...rec,
          date: rec.date instanceof Date ? rec.date : new Date(rec.date),
          createdAt: rec.createdAt instanceof Date ? rec.createdAt : new Date(rec.createdAt),
          updatedAt: rec.updatedAt instanceof Date ? rec.updatedAt : new Date(rec.updatedAt)
        }));
        setReceipts(receiptsData);
        // Fetch clients
        const clientsData = await clientService.getClients(userProfile.companyId);
        setClients(clientsData);
        // Fetch company
        const companyData = await companyService.getCompany(userProfile.companyId);
        setCompany(companyData);
        setError(null);
        // Debug logging
        console.log('Fetched invoices:', invoicesData);
        console.log('Fetched receipts:', receiptsData);
        console.log('Fetched clients:', clientsData);
        console.log('Fetched company:', companyData);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        if (
          error?.message?.includes('permission') ||
          error?.code === 'permission-denied' ||
          error?.toString().includes('permission')
        ) {
          setError('You do not have permission to view this data. Please contact your administrator.');
        } else {
          setError('An error occurred while fetching data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userProfile?.companyId]);

  const filteredInvoices = invoices.filter(invoice => {
    if (!invoice.issueDate) return false;
    const dateVal = invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate);
    if (isNaN(dateVal.getTime())) return false;
    const invoiceDate = dateVal.toISOString().split('T')[0];
    return invoiceDate >= dateRange.start && invoiceDate <= dateRange.end;
  });

  const filteredReceipts = receipts.filter(receipt => {
    if (!receipt.date) return false;
    const dateVal = receipt.date instanceof Date ? receipt.date : new Date(receipt.date);
    if (isNaN(dateVal.getTime())) return false;
    const receiptDate = dateVal.toISOString().split('T')[0];
    return receiptDate >= dateRange.start && receiptDate <= dateRange.end;
  });

  // Debug logging for filtered data
  console.log('Filtered invoices:', filteredInvoices);
  console.log('Filtered receipts:', filteredReceipts);

  // Calculate metrics
  const totalRevenue = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalInvoiced = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalOutstanding = filteredInvoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const totalOverdue = filteredInvoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  // Monthly revenue data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2024, i, 1);
    const monthName = month.toLocaleDateString('en-US', { month: 'short' });
    const monthlyRevenue = filteredReceipts
      .filter(receipt => receipt.date.getMonth() === i)
      .reduce((sum, receipt) => sum + receipt.amount, 0);
    return { month: monthName, revenue: monthlyRevenue };
  });

  // Status distribution
  const statusData = [
    { name: 'Paid', value: filteredInvoices.filter(inv => inv.status === 'paid').length, color: '#10B981' },
    { name: 'Sent', value: filteredInvoices.filter(inv => inv.status === 'sent').length, color: '#3B82F6' },
    { name: 'Draft', value: filteredInvoices.filter(inv => inv.status === 'draft').length, color: '#6B7280' },
    { name: 'Overdue', value: filteredInvoices.filter(inv => inv.status === 'overdue').length, color: '#EF4444' }
  ];

  // Helper to get client name by clientId
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : clientId || '';
  };

  // Enhanced export function for all report types
  const exportToCSV = () => {
    let csvData: any[] = [];
    let filename = '';
    if (reportType === 'invoices') {
      csvData = filteredInvoices.map(invoice => {
        const issueDate = invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate);
        const dueDate = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate);
        const client = clients.find(c => c.id === invoice.clientId);
        return {
          'Invoice Number': invoice.invoiceNumber,
          'Title': invoice.title,
          'Client': client ? client.name : invoice.clientId,
          'Client Email': client ? client.email : '',
          'Client Phone': client ? client.phone : '',
          'Subtotal': invoice.subtotal,
          'VAT %': invoice.tax,
          'VAT Amount': (invoice.subtotal * (invoice.tax / 100)).toFixed(2),
          'Total': invoice.total,
          'Status': invoice.status,
          'Issue Date': issueDate.toISOString().split('T')[0],
          'Due Date': dueDate.toISOString().split('T')[0],
          'Notes': invoice.notes || '',
          'Company VAT': company?.vatRegistrationNumber || '',
        };
      });
      filename = `invoices-report-${dateRange.start}-to-${dateRange.end}.csv`;
    } else if (reportType === 'payments') {
      csvData = filteredReceipts.map(receipt => {
        const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
        const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
        return {
          'Receipt ID': receipt.id,
          'Invoice Number': invoice?.invoiceNumber || '',
          'Client': client ? client.name : invoice?.clientId || '',
          'Client Email': client ? client.email : '',
          'Client Phone': client ? client.phone : '',
          'Subtotal': invoice?.subtotal ?? '',
          'VAT %': invoice?.tax ?? '',
          'VAT Amount': invoice ? ((invoice.subtotal * (invoice.tax / 100)).toFixed(2)) : '',
          'Total': invoice?.total ?? '',
          'Amount Paid': receipt.amount,
          'Method': receipt.method,
          'Date': (receipt.date instanceof Date ? receipt.date : new Date(receipt.date)).toISOString().split('T')[0],
          'Company VAT': company?.vatRegistrationNumber || '',
        };
      });
      filename = `payments-report-${dateRange.start}-to-${dateRange.end}.csv`;
    } else if (reportType === 'revenue') {
      // Revenue report: monthly revenue summary
      csvData = monthlyData.map(row => ({
        'Month': row.month,
        'Revenue': row.revenue,
        'Company VAT': company?.vatRegistrationNumber || '',
      }));
      filename = `revenue-report-${dateRange.start}-to-${dateRange.end}.csv`;
    }

    if (csvData.length === 0) return;

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reportTypeOptions = [
    { value: 'revenue', label: 'Revenue Report' },
    { value: 'invoices', label: 'Invoice Report' },
    { value: 'payments', label: 'Payment Report' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400 text-lg font-semibold text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <Button className="w-full sm:w-auto" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export {reportType === 'invoices' ? 'Invoices' : reportType === 'payments' ? 'Payments' : 'Revenue'} CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={reportTypeOptions}
          />
          <Input
            label="Start Date"
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
          <div className="flex items-end">
            <Button className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Apply Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalInvoiced)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalOverdue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Revenue
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Invoice Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Transactions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Reference</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.slice(0, 10).map((receipt) => {
                const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
                return (
                  <tr key={receipt.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {receipt.date.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Payment</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-green-600">
                      {formatCurrency(receipt.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};