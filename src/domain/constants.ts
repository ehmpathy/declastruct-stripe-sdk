import Stripe from 'stripe';

export interface StripeApiContext {
  /**
   * an authenticated instance of stripe
   */
  stripe: Stripe;
}
