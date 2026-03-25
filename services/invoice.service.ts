import api from './api';
import type { Invoice, InvoiceDirection } from '@/types/api.types';

interface CurrencyDto { code: string; symbol: string; name?: string }

interface InvoiceDto {
  identifier: string;
  name: string;
  status: string;
  totalPrice: number;
  currency?: CurrencyDto;
  payerContact?: string;
  merchantName?: string;
  expiresAt: string;
  createdAt: string;
  data?: { description?: string };
  processId?: string;
}

interface InvoicePageResponse {
  records: InvoiceDto[];
  total?: number;
  totalCount?: number;
}

function mapInvoice(d: InvoiceDto): Invoice {
  return {
    identifier: d.identifier,
    name: d.name,
    status: d.status as Invoice['status'],
    totalPrice: d.totalPrice,
    currency: d.currency ?? { code: '', symbol: '' },
    payerContact: d.payerContact,
    merchantName: d.merchantName,
    expiresAt: d.expiresAt,
    createdAt: d.createdAt,
    description: d.data?.description,
    processId: d.processId,
  };
}

export const invoiceService = {
  /** Create an invoice (request money from someone) */
  async createInvoice(params: {
    name: string;
    recipientCoin: string;
    amount: number;
    expiresAt: string;
    payerContact?: string;
    description?: string;
  }): Promise<Invoice> {
    const response = await api.post<{ invoice: InvoiceDto }>('/v1/invoices', {
      name: params.name,
      recipientCoin: params.recipientCoin,
      amount: params.amount,
      expiresAt: params.expiresAt,
      payerContact: params.payerContact,
      data: { description: params.description },
    });
    return mapInvoice(response.data.invoice);
  },

  /** List invoices by direction (incoming = to pay, outgoing = created by me) */
  async viewInvoices(direction: InvoiceDirection, pageNumber = 0, pageSize = 20): Promise<{ records: Invoice[]; total: number }> {
    const response = await api.post<InvoicePageResponse>('/v1/invoices/view', {
      filter: { direction },
      sort: { createdAt: 'DESC' },
      pageNumber,
      pageSize,
    });
    return {
      records: (response.data.records ?? []).map(mapInvoice),
      total: response.data.total ?? response.data.totalCount ?? 0,
    };
  },

  /** Get a single invoice by identifier */
  async getInvoice(identifier: string): Promise<Invoice> {
    const response = await api.get<{ invoice: InvoiceDto }>(`/v1/invoices/${identifier}`);
    return mapInvoice(response.data.invoice);
  },

  /** Pay an incoming invoice using a wallet */
  async payInvoice(identifier: string, payerCoin: string): Promise<void> {
    await api.post(`/v1/invoices/${identifier}/pay`, { payerCoin });
  },

  /** Calculate payer fee for an invoice */
  async calculateFee(identifier: string, payerCoin: string): Promise<{
    transactionAmount: number;
    commissionAmountPush: number;
    senderAmountPush: number;
    currency: CurrencyDto;
  }> {
    const response = await api.post(`/v1/invoices/${identifier}/calculate-fee`, { payerCoin });
    return response.data;
  },
};
