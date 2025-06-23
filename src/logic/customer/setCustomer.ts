import { serialize } from 'domain-objects';
import { toHashSha256Sync } from 'hash-fns';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import {
  getResourceNameFromFileName,
  VisualogicContext,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';
import { castToDeclaredStripeCustomer } from '../cast/castToDeclaredStripeCustomer';
import { getCustomer } from './getCustomer';

export const setCustomer = withLogTrail(
  async (
    input: PickOne<{
      finsert: DeclaredStripeCustomer;
      upsert: DeclaredStripeCustomer;
    }>,
    context: StripeApiContext & VisualogicContext,
  ): Promise<HasMetadata<DeclaredStripeCustomer>> => {
    // lookup the customer
    const customerFound = await getCustomer(
      {
        by: {
          unique: {
            email:
              input.finsert?.email ??
              input.upsert?.email ??
              UnexpectedCodePathError.throw('no email in input', { input }),
          },
        },
      },
      context,
    );

    // sanity check that if the customer exists, their id matches the user's expectations, if any
    const stripeCustomerIdExpected = input.finsert?.id || input.upsert?.id;
    if (
      customerFound &&
      stripeCustomerIdExpected &&
      stripeCustomerIdExpected !== customerFound.id
    )
      throw new UnexpectedCodePathError(
        'asked to setCustomer with a .primary=id which does not match the .unique=email',
        {
          stripeCustomerIdExpected,
          stripeCustomerIdFound: customerFound.id,
          customerFound,
        },
      );

    // if the customer was found, then handle that
    if (customerFound) {
      // if asked to finsert, then we can return it now
      if (input.finsert) return customerFound;

      // if asked to upsert, then we can update it now
      if (input.upsert)
        return castToDeclaredStripeCustomer(
          await context.stripe.customers.update(customerFound.id, {
            name: input.upsert.name ?? undefined,
            description: input.upsert.description ?? undefined,
            phone: input.upsert.phone ?? undefined,
            metadata: input.upsert.metadata ?? undefined,
          }),
        );
    }

    // otherwise, create the customer
    const customerDesired: DeclaredStripeCustomer =
      input.upsert ?? input.finsert;
    const customerCreated = await context.stripe.customers.create(
      {
        email: customerDesired.email,
        name: customerDesired.name ?? undefined,
        description: customerDesired.description ?? undefined,
        phone: customerDesired.phone ?? undefined,
        metadata: customerDesired.metadata ?? undefined,
      },
      {
        idempotencyKey: toHashSha256Sync(
          [
            // stage, // todo: pull stage from context.environment
            'v1.0.0',
            serialize({ ...customerDesired }),
          ].join(';'),
        ),
      },
    );
    return castToDeclaredStripeCustomer(customerCreated);
  },
  { name: getResourceNameFromFileName(__filename) },
);
