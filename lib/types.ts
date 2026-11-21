export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface Address {
  name: string;
  phone: string;
  line: string;
  city: string;
  pin: string;
}

export interface Kyc {
  status: KycStatus;
  basicStatus?: 'checked' | 'not_started';
  panLast4?: string;
  bankLast4?: string;
  ifsc?: string;
  legalName?: string;
  pan?: string;
  bank?: string;
  acct?: string;
  at?: number;
  reviewedAt?: number;
}

export type UserRole = 'member' | 'ops';

export interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  role: UserRole;
  joined: number;
  deals: number;
  kyc: Kyc;
  address?: Address;
}

export type ListingStatus =
  | 'pending'
  | 'live'
  | 'reserved'
  | 'sold'
  | 'rejected'
  | 'withdrawn';

export type HandoverMode = 'ship' | 'onsite';
export type ListingMode = 'order' | 'hub';

export interface CheckItem {
  label: string;
  result: 'pass' | 'fail' | 'na' | '';
}

export interface InspectionReport {
  id: string;
  at: number;
  agent: string;
  grade: string;
  tier: 'basic' | 'full';
  seal: string | null;
  serial: string;
  notes: string;
  checks: CheckItem[];
  failed?: boolean;
}

export interface Listing {
  id: string;
  revision?: number;
  sellerId: string;
  category: string;
  img: string;
  imagePath?: string;
  imagePaths?: string[];
  images?: string[];
  title: string;
  brand: string;
  price: number;
  newPrice: number;
  condition: string;
  ageMonths: number;
  warranty: string;
  city: string;
  status: ListingStatus;
  mode: ListingMode;
  handover: HandoverMode;
  invoice: boolean;
  box: boolean;
  serial: string;
  createdAt: number;
  specs: [string, string][];
  description: string;
  report?: InspectionReport;
}

export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_review'
  | 'refund_pending'
  | 'release_pending'
  | 'paid'
  | 'in_transit'
  | 'at_hub'
  | 'verified'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export interface TimelineEntry {
  status: OrderStatus;
  at: number;
  note?: string;
}

export interface Dispute {
  reason: string;
  detail: string;
  at: number;
  resolution?: 'refund' | 'release';
}

export interface Tracking {
  courier: string;
  awb: string;
}

export interface Order {
  financialDecision?: 'release' | 'refund' | null;
  fundsStatus?: 'held' | 'release_authorized' | 'settled' | 'reversed' | 'failed' | null;
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  shipping: number;
  tier: 'basic' | 'full';
  inspectionFee: number;
  handover: HandoverMode | 'hub';
  visitFee: number;
  total: number;
  fee: number;
  payout: number;
  address: Address;
  payMethod: string;
  status: OrderStatus;
  createdAt: number;
  handoverCode: string;
  timeline: TimelineEntry[];
  report?: InspectionReport;
  tracking?: Tracking;
  dispute?: Dispute;
  windowEnds?: number;
  fromStock?: boolean;
}

export interface Category {
  label: string;
  ship: number;
  bench: number;
}

export interface Condition {
  label: string;
  note: string;
}

export interface Tier {
  label: string;
  short: string;
  note: string;
}

export interface Status {
  label: string;
  tone: 'amber' | 'green' | 'ink' | 'red' | 'muted';
}

export interface Step {
  key: OrderStatus;
  title: string;
  onsite?: string;
}

export interface AppState {
  v: 1;
  users: User[];
  listings: Listing[];
  orders: Order[];
  seq: { order: number; report: number; listing: number };
}
