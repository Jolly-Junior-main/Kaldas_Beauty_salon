/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'am';

// Payment Method enum as specified strictly in instructions
export type PaymentMethod = 'Telebirr' | 'CBE Birr' | 'M-Pesa' | 'Bank Transfer' | 'Cash' | 'Card';

// Predefined list of typical premium salon services & products
export interface SalonService {
  id: string;
  name: string;
  category: 'Hair' | 'Nails' | 'Skin' | 'Massage' | 'Product';
  defaultPrice: number;
}

export interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  birth_date?: string; // Format: YYYY-MM-DD
  created_at: string; // ISO string
  notes_preferences?: string; // Hair/skin type, allergies, styling notes
}

export interface Visit {
  id: string;
  customer_id: string;
  items_used: string[]; // List of SalonService IDs
  price_charged: number;
  payment_method: PaymentMethod;
  visit_date: string; // ISO string
  assigned_staff_id?: string; // ID of the staff who performed the service
  equipment_used?: string; // What equipment was used for the customer
}

// Retention statuses for client segment telemetry
export type RetentionStatus = 'Frequent' | 'Occasional' | 'At-Risk';

export interface CustomerWithRetention extends Customer {
  retentionStatus: RetentionStatus;
  lastVisitDate?: string;
  visitCountInLast30Days: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'cashier' | 'assistant';
  created_at: string;
  password?: string;
}

export interface TreatmentArtist {
  id: string;
  name: string;
  skills: string; // e.g., "Hair Coloring, Balayage, Cuts"
  specialty: 'Hair' | 'Nails' | 'Skin' | 'Massage' | 'General';
  created_at: string;
}

export interface CRMData {
  customers: Customer[];
  visits: Visit[];
  staff?: StaffMember[];
}

export interface BirthdayWish {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  message_text: string;
  offer_type: 'none' | '50_percent' | 'free';
  sent_at: string;
  sent_by: string;
  status: 'pending_api' | 'sent_mock';
}

export const PREDEFINED_SERVICES: SalonService[] = [
  { id: 'srv_1', name: 'Balayage Premium Hair Coloring', category: 'Hair', defaultPrice: 120.00 },
  { id: 'srv_2', name: 'Signature Hydrafacial Treatment', category: 'Skin', defaultPrice: 85.00 },
  { id: 'srv_3', name: 'Luxury Gel Manicure & Hand Massage', category: 'Nails', defaultPrice: 45.00 },
  { id: 'srv_4', name: 'Reluxe Pedicare & Paraffin Therapy', category: 'Nails', defaultPrice: 55.00 },
  { id: 'srv_5', name: 'Deep Tissue Silk Massage (60 Min)', category: 'Massage', defaultPrice: 95.00 },
  { id: 'srv_6', name: 'Keratin Nourishing Therapy', category: 'Hair', defaultPrice: 150.00 },
  { id: 'srv_7', name: 'Chic Style Blowout & Styling', category: 'Hair', defaultPrice: 40.00 },
  { id: 'srv_8', name: 'Collagen Face Mask Refresh', category: 'Skin', defaultPrice: 30.00 },
  { id: 'prod_9', name: 'Argan Recovery Styling Oil (Retail)', category: 'Product', defaultPrice: 35.00 },
  { id: 'prod_10', name: 'Organic Herbal Cleansing Gel (Retail)', category: 'Product', defaultPrice: 28.00 }
];
