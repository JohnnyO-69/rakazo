import type { Actor, BillingStatus } from "@rakazo/contracts";

/** Product-side billing: access rules, checkout, and pull-based sync from the provider. */
export interface BillingService {
  status(actor: Actor): Promise<BillingStatus>;
  checkout(actor: Actor): Promise<{ url: string }>;
  portal(actor: Actor): Promise<{ url: string }>;
  /** Re-fetches the customer's subscription from the provider and overwrites the stored snapshot. */
  sync(customerId: string): Promise<void>;
  /** Pushes the organization's member count to the provider. Call when members change. */
  syncSeats(organizationId: string): Promise<void>;
  cancelForDeletedUser(userId: string): Promise<void>;
}
