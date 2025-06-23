import { UnexpectedCodePathError } from 'helpful-errors';
import Stripe from 'stripe';
import { HasMetadata, omit } from 'type-fns';

import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';

export const castToDeclaredStripeCustomer = (
  input: Stripe.Customer,
): HasMetadata<DeclaredStripeCustomer> => {
  return new DeclaredStripeCustomer({
    id: input.id,
    email:
      input.email ??
      UnexpectedCodePathError.throw(
        'no email found for customer. not a valid declared stripe customer',
        { input },
      ),
    description: input.description ?? null,
    name: input.name ?? null,
    phone: input.phone ?? null,
    metadata: (() => {
      const obj = input.metadata ? omit(input.metadata, ['exid']) : {};
      if (Object.keys(obj).length === 0) return null;
      return obj;
    })(),
  }) as HasMetadata<DeclaredStripeCustomer>;
};
