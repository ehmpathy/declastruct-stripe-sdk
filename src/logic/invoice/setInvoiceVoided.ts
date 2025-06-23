import { RefByPrimary, RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';
import { PickOne } from 'type-fns';
import {
  getResourceNameFromFileName,
  VisualogicContext,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import {
  DeclaredStripeInvoice,
  DeclaredStripeInvoiceStatus,
} from '../../domain/objects/DeclaredStripeInvoice';
import { castToDeclaredStripeInvoice } from '../cast/castToDeclaredStripeInvoice';
import { getInvoice } from './getInvoice';

/**
 * .what = set the status of an invoice to "void"
 * .what.intent
 *   - marks the invoice as one that does not have to be paid
 */
export const setInvoiceVoided = withLogTrail(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredStripeInvoice>;
        primary: RefByPrimary<typeof DeclaredStripeInvoice>;
      }>;
    },
    context: StripeApiContext & VisualogicContext,
  ) => {
    // find the invoice
    const invoiceFound = await getInvoice(input, context);
    if (!invoiceFound)
      throw new BadRequestError(
        'can not issue an invoice that does not exist',
        {
          input,
          invoiceFound,
        },
      );

    // verify it is still in draft mode
    if (invoiceFound.status === DeclaredStripeInvoiceStatus.void)
      return invoiceFound; // if its already "void", then this could be an idempotent retry, so just return it
    if (invoiceFound.status !== DeclaredStripeInvoiceStatus.open)
      throw new BadRequestError(
        'can not void an invoice that is not in open mode',
        { invoiceFound },
      );

    // otherwise, finalize it
    const stripeInvoiceUpdated = await context.stripe.invoices.voidInvoice(
      invoiceFound.id,
    );
    return castToDeclaredStripeInvoice(stripeInvoiceUpdated);
  },
  {
    name: getResourceNameFromFileName(__filename),
  },
);
