import { Ref, RefByPrimary, RefByUnique, isUniqueKeyRef } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import {
  getResourceNameFromFileName,
  VisualogicContext,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeInvoice } from '../../domain/objects/DeclaredStripeInvoice';
import { castToDeclaredStripeInvoice } from '../cast/castToDeclaredStripeInvoice';
import { getCustomer } from '../customer/getCustomer';

export const getInvoice = withLogTrail(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredStripeInvoice>;
        unique: RefByUnique<typeof DeclaredStripeInvoice>;
        ref: Ref<typeof DeclaredStripeInvoice>;
      }>;
    },
    context: VisualogicContext & StripeApiContext,
  ): Promise<HasMetadata<DeclaredStripeInvoice> | null> => {
    // handle by ref
    if (input.by.ref)
      return isUniqueKeyRef({ of: DeclaredStripeInvoice })(input.by.ref)
        ? getInvoice({ by: { unique: input.by.ref } }, context)
        : getInvoice({ by: { primary: input.by.ref } }, context);

    // handle get by id
    if (input.by.primary) {
      try {
        const invoice = await context.stripe.invoices.retrieve(
          input.by.primary.id,
        );
        if (invoice.deleted) return null;
        return castToDeclaredStripeInvoice(invoice);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        if (error.message.includes('No such invoice')) return null; // handle "null" responses without an error
        throw error;
      }
    }

    // handle get by unique
    if (input.by.unique) {
      // lookup the customer by ref
      const customerFound = await getCustomer(
        { by: { ref: input.by.unique.customerRef } },
        context,
      );
      if (!customerFound)
        throw new UnexpectedCodePathError(
          'customer does not exist for by ref',
          {
            input,
          },
        );

      // lookup the invoices by customer, to filter down to a subset
      const { data: candidates } = await context.stripe.invoices.list({
        customer: customerFound.id,
        limit: 100,
      });

      // now find the one with this exid, for the customer
      const targets = candidates.filter(
        (candidate) => candidate.metadata?.exid === input.by.unique?.exid,
      );
      const [target, ...otherOptions] = targets.filter(
        (thisOption) => thisOption.status !== 'void',
      );
      if (otherOptions.length)
        throw new UnexpectedCodePathError(
          'more than one invoice matches the .unique key',
          { input, matches: targets },
        );
      if (!target) return null;
      return castToDeclaredStripeInvoice(target);
    }

    // otherwise, unexpected input
    throw new UnexpectedCodePathError('invalid input', { input });
  },
  {
    name: getResourceNameFromFileName(__filename),
  },
);
