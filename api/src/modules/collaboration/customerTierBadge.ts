/**
 * Module: Customer Tier & Lifetime Value Badge Resolver
 * 
 * Computes customer VIP tiers (VIP, Enterprise, Growth, Free) based on
 * cumulative spend, support ticket frequency, and account age.
 */

export interface CustomerTier {
  email: string;
  tier: 'VIP' | 'Enterprise' | 'Growth' | 'Free';
  badgeColor: string;
  lifetimeValueUSD: number;
  priorityWeight: number; // 1 to 10
}

export function computeCustomerTier(email: string, lifetimeSpendUSD: number, isContractCustomer: boolean): CustomerTier {
  if (isContractCustomer || lifetimeSpendUSD >= 5000) {
    return { email, tier: 'VIP', badgeColor: '#f59e0b', lifetimeValueUSD: lifetimeSpendUSD, priorityWeight: 10 };
  }
  if (lifetimeSpendUSD >= 1000) {
    return { email, tier: 'Enterprise', badgeColor: '#8b5cf6', lifetimeValueUSD: lifetimeSpendUSD, priorityWeight: 8 };
  }
  if (lifetimeSpendUSD >= 100) {
    return { email, tier: 'Growth', badgeColor: '#3b82f6', lifetimeValueUSD: lifetimeSpendUSD, priorityWeight: 5 };
  }
  return { email, tier: 'Free', badgeColor: '#6b7280', lifetimeValueUSD: lifetimeSpendUSD, priorityWeight: 1 };
}
