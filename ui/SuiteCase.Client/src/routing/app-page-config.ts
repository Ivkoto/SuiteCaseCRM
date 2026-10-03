import type { ComponentType } from 'react'
import { CustomersPage } from '../features/customers/customers-page'

export type NavigationIconName =
  | 'dashboard'
  | 'customers'
  | 'programs'
  | 'bookings'
  | 'documents'
  | 'payments'
  | 'administration'

export type AppPageDefinition = Readonly<{
  path: string
  title: string
  eyebrow: string
  icon: NavigationIconName
  Component: ComponentType | null
}>

export type AppPageMetadata = Readonly<
  Omit<AppPageDefinition, 'Component'> & { isAvailable: boolean }
>

export const APP_PAGES = {
  dashboard: {
    path: '/',
    title: 'Dashboard',
    eyebrow: 'Overview',
    icon: 'dashboard',
    Component: null,
  },
  customers: {
    path: '/customers',
    title: 'Customers',
    eyebrow: 'Customer management',
    icon: 'customers',
    Component: CustomersPage,
  },
  programs: {
    path: '/programs',
    title: 'Programs & Groups',
    eyebrow: 'Travel planning',
    icon: 'programs',
    Component: null,
  },
  bookings: {
    path: '/bookings',
    title: 'Bookings',
    eyebrow: 'Booking management',
    icon: 'bookings',
    Component: null,
  },
  documents: {
    path: '/documents',
    title: 'Documents',
    eyebrow: 'Document management',
    icon: 'documents',
    Component: null,
  },
  payments: {
    path: '/payments',
    title: 'Payments',
    eyebrow: 'Payment management',
    icon: 'payments',
    Component: null,
  },
  administration: {
    path: '/administration',
    title: 'Administration',
    eyebrow: 'System administration',
    icon: 'administration',
    Component: null,
  },
} as const satisfies Record<string, AppPageDefinition>
