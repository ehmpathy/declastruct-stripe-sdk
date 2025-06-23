import { Ref, RefByPrimary, RefByUnique, isUniqueKeyRef } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';
import { castToDeclaredStripeCustomer } from '../cast/castToDeclaredStripeCustomer';

/**
 * .what = gets a customer from stripe
 */
export const getCustomer = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredStripeCustomer>;
      unique: RefByUnique<typeof DeclaredStripeCustomer>;
      ref: Ref<typeof DeclaredStripeCustomer>;
    }>;
  },
  context: StripeApiContext & VisualogicContext,
): Promise<HasMetadata<DeclaredStripeCustomer> | null> => {
  // handle by ref
  if (input.by.ref)
    return isUniqueKeyRef({ of: DeclaredStripeCustomer })(input.by.ref)
      ? getCustomer({ by: { unique: input.by.ref } }, context)
      : getCustomer({ by: { primary: input.by.ref } }, context);

  // handle get by id
  if (input.by.primary) {
    try {
      const customer = await context.stripe.customers.retrieve(
        input.by.primary.id,
      );
      if (customer.deleted) return null;
      return castToDeclaredStripeCustomer(customer);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.message.includes('No such customer')) return null; // handle "null" responses without an error
      throw error;
    }
  }

  // handle get by email
  if (input.by.unique) {
    const {
      data: [customer, ...otherCustomers],
    } = await context.stripe.customers.list({
      email: input.by.unique.email,
    });
    if (otherCustomers.length)
      throw new BadRequestError('more than one customer for this email', {
        input,
        customers: [customer, ...otherCustomers],
      });
    if (!customer) return null;
    return castToDeclaredStripeCustomer(customer);
  }

  // otherwise, unexpected input
  throw new UnexpectedCodePathError('invalid input', { input });
};
