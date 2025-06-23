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
 * .what = set the status of an invoice to "open"
 * .what.intent
 *   - issues / finalizes the invoice in order to make it payable
 *   - enables autoAdvance to issue automaticPayment once collection config has it enabled
 */
export const setInvoiceOpened = withLogTrail(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredStripeInvoice>;
        primary: RefByPrimary<typeof DeclaredStripeInvoice>;
      }>;
      with?: {
        autoAdvance?: boolean;
      };
    },
    context: StripeApiContext & VisualogicContext,
  ) => {
    // find the invoice
    const invoiceFound = await getInvoice(input, context);
    if (!invoiceFound)
      throw new BadRequestError('can not open an invoice that does not exist', {
        input,
        invoiceFound,
      });

    // verify it is still in draft mode
    if (invoiceFound.status === DeclaredStripeInvoiceStatus.open)
      return invoiceFound; // if its already "open", then this could be an idempotent retry, so just return it
    if (invoiceFound.status !== DeclaredStripeInvoiceStatus.draft)
      throw new BadRequestError(
        'can not open an invoice that is not in draft mode',
        { invoiceFound },
      );

    // otherwise, finalize it
    const stripeInvoiceUpdated = await context.stripe.invoices.finalizeInvoice(
      invoiceFound.id,
      {
        auto_advance: input.with?.autoAdvance,
      },
    );
    return castToDeclaredStripeInvoice(stripeInvoiceUpdated);
  },
  {
    name: getResourceNameFromFileName(__filename),
  },
);
