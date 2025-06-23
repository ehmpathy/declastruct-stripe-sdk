import { createCache } from 'simple-in-memory-cache';
import Stripe from 'stripe';
import { withSimpleCaching } from 'with-simple-caching';

export const getStripe = withSimpleCaching(
  async (input: { stripe: { api: { secretKey: string } } }) => {
    const stripe = new Stripe(input.stripe.api.secretKey, {
      apiVersion: '2024-06-20',
    });
    return stripe;
  },
  {
    cache: createCache(),
  },
);
