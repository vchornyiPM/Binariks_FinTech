import api from './api';
import type { Transaction, TransactionFilters, LedgerTransaction } from '@/types/api.types';

interface TransactionCoinDto {
  serial: string;
  organizationName: string;
  technical: boolean;
  currency: { code: string; symbol: string };
  name?: string;
}

interface TransactionDto {
  id: string;
  type: string;
  amount: number;
  from?: TransactionCoinDto;
  to?: TransactionCoinDto;
  currency?: { code: string; symbol: string };
  performedAt?: string;
  parentId?: string;
}

interface ApiBusinessProcess {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  categoryName?: string;
  description?: string;
  amount?: number;
  commissionAmount?: number;
  sourceCurrency?: { code: string; symbol: string };
  destinationCurrency?: { code: string; symbol: string };
  transactions?: TransactionDto[];
}

interface TransactionsViewResponse {
  records: ApiBusinessProcess[];
  totalRecords: number;
  totalPages: number;
}

/** Normalize raw business-process type to one of the UI category keys */
function normalizeType(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('exchange')) return 'EXCHANGE';
  if (t.includes('transfer')) return 'TRANSFER';
  if (t.includes('top') || t.includes('deposit') || t.includes('issue')) return 'TOP_UP';
  if (t.includes('withdraw') || t.includes('redeem')) return 'WITHDRAW';
  return 'TRANSFER';
}

/**
 * Determine sign from ledger transactions:
 * - Find the main (non-commission) transfer transaction
 * - If from.technical === true → money came from system account → credit (+)
 * - Otherwise → user is the sender → debit (-)
 */
function resolveSign(transactions: TransactionDto[]): 1 | -1 {
  const main = transactions.find((t) => t.type === 'transfer' || t.type === 'split' || t.type === 'issue');
  if (!main) return 1; // default positive (e.g. top-up, unknown)
  if (main.from?.technical) return 1;  // money came from a system/technical account
  return -1;
}

function mapRecord(r: ApiBusinessProcess): Transaction {
  const txs = r.transactions ?? [];
  const sign = resolveSign(txs);
  const amount = (r.amount ?? 0) * sign;
  const currency = r.sourceCurrency?.code ?? txs[0]?.from?.currency?.code ?? '';

  // Counterparty: prefer description, then from/to name
  const main = txs.find((t) => t.type === 'transfer' || t.type === 'split');
  const counterparty =
    r.description ??
    r.categoryName ??
    (sign > 0 ? main?.from?.organizationName : main?.to?.organizationName) ??
    undefined;

  return {
    id: r.id,
    type: normalizeType(r.type),
    status: r.status,
    amount,
    fee: r.commissionAmount,
    date: r.createdAt,
    currency,
    counterparty,
    rawTransactions: txs as unknown as LedgerTransaction[],
  };
}

export const transactionsService = {
  async getTransactions(filters: TransactionFilters): Promise<{ items: Transaction[]; total: number }> {
    const filterBody: Record<string, unknown> = {};
    if (filters.types && filters.types.length > 0) filterBody.types = filters.types;
    if (filters.coinSerial) filterBody.coinSerials = [filters.coinSerial];

    const body = {
      pageNumber: filters.pageNumber,
      pageSize: filters.pageSize,
      filter: filterBody,
      sort: { createdAt: 'desc' },
    };

    const response = await api.post<TransactionsViewResponse>('/v1/transactions/view', body);
    return {
      items: response.data.records.map(mapRecord),
      total: response.data.totalRecords,
    };
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get<ApiBusinessProcess>(`/v1/transactions/${id}`);
    return mapRecord(response.data);
  },
};
