import { RefByUnique, RefByPrimary } from 'domain-objects';
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
 * .what = requests that the customer be charged for the invoice
 * .what.intent
 *   - attempts to .pay the invoice with the customers payment method
 *   - responds with failure via error or success via updated invoice state
 */
export const reqInvoiceCharge = withLogTrail(
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
        'can not charge an invoice that does not exist',
        {
          input,
          invoiceFound,
        },
      );

    // verify it is still in draft mode
    if (invoiceFound.status === DeclaredStripeInvoiceStatus.paid)
      return invoiceFound; // if its already "paid", then this could be an idempotent retry, so just return it
    if (invoiceFound.status !== DeclaredStripeInvoiceStatus.open)
      throw new BadRequestError(
        'can not charge an invoice that is not in open mode',
        { invoiceFound },
      );

    // otherwise, finalize it
    const stripeInvoiceUpdated = await context.stripe.invoices.pay(
      invoiceFound.id,
    );
    return castToDeclaredStripeInvoice(stripeInvoiceUpdated);
  },
  {
    name: getResourceNameFromFileName(__filename),
  },
);
