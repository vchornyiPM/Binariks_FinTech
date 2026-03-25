// ─── Auth ─────────────────────────────────────────────────────────────────────

interface AuthTokenInfo {
  expiresAt: string;
  token: string;
}

interface AuthMember {
  organization: {
    id: string;
    type: string;
    name: string;
    organizationStatus: string;
  };
  permissions: string[];
  role: string;
  token: AuthTokenInfo;
  refreshToken: AuthTokenInfo;
  user: {
    id: string;
    name: string;
    profileOrganizationId?: string;
  };
}

export interface AuthResponse {
  action: string;
  members: AuthMember[];
  maskedPhoneNumber?: string;
}

export interface ParsedAuthTokens {
  token: string;
  refreshToken: string;
  user: { id: string; name: string };
  organizationId: string;
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export interface Currency {
  id?: string;
  code: string;
  symbol: string;
  name?: string;
}

// ─── Coins / Wallets ──────────────────────────────────────────────────────────

export interface Coin {
  coinSerial: string;        // mapped from API field "serial"
  name: string;
  type: string;
  balance: number;
  availableBalance: number;
  currency: Currency;
  ownerFullName?: string;
  isMain?: boolean;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** Raw TransactionDto from the API (single ledger entry within a BusinessProcessDto) */
export interface LedgerTransaction {
  id: string;
  /** Ledger type: 'transfer' | 'commission' | 'split' | 'issue' | 'redeem' | etc. */
  type: string;
  amount: number;
  from?: { serial: string; name?: string; organizationName?: string; currency: Currency; technical?: boolean };
  to?: { serial: string; name?: string; organizationName?: string; currency: Currency; technical?: boolean };
}

/** Display-ready transaction — service maps BusinessProcessDto into this shape */
export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;           // positive = credit to user, negative = debit
  fee?: number;
  date: string;             // mapped from createdAt
  currency: string;         // currency code
  counterparty?: string;
  rawTransactions?: LedgerTransaction[];
}

export interface TransactionFilters {
  pageNumber: number;
  pageSize: number;
  /** Array of API business-process type strings, e.g. ['client_transaction_transfer'] */
  types?: string[];
  coinSerial?: string;
}

// ─── Transfers ────────────────────────────────────────────────────────────────

/** Mapped from API ExtendedPushResultResp */
export interface TransferCalculateResponse {
  transactionAmount: number;   // amount user entered
  senderAmountPush: number;    // total deducted from sender (amount + fee, negative)
  recipientAmountPush: number; // amount credited to recipient
  commissionAmountPush: number; // fee charged
  currency: Currency;
}

/** Mapped from API BusinessProcessClientTransactionResp */
export interface TransferExecuteResponse {
  id: string;
  type: string;
  status: string;
}

// ─── Exchange ─────────────────────────────────────────────────────────────────

export interface ExchangeCalculateResponse {
  toAmount: number;   // mapped from topUpAmount
  fee: number;
  rate: number;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;  // none | pending | approved | declined | review_required | closed
  type?: string;    // base | standart | gold | vip | invest
}

export type KycStatus = 'VERIFIED' | 'PENDING' | 'NOT_STARTED';

// ─── Invoices ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'initiated' | 'pending' | 'approved' | 'paid' | 'declined' | 'expired' | 'hidden';
export type InvoiceDirection = 'incoming' | 'outgoing';

export interface Invoice {
  identifier: string;
  name: string;
  status: InvoiceStatus;
  totalPrice: number;
  currency: Currency;
  payerContact?: string;
  merchantName?: string;
  expiresAt: string;
  createdAt: string;
  description?: string;
  processId?: string;
}

export interface InvoiceFilters {
  direction: InvoiceDirection;
  pageNumber: number;
  pageSize: number;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export interface InSystemCard {
  id: string;
  number: string;           // card number (masked for display)
  coinSerial: string;       // linked wallet
  status: string;           // active | blocked | closed
  expiryDate?: string;
  name?: string;
}

// ─── Address ──────────────────────────────────────────────────────────────────

export interface UserAddress {
  country?: string;
  city?: string;
  street?: string;
  zip?: string;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
