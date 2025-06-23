import { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';
import { PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import {
  DeclaredStripeInvoice,
  DeclaredStripeInvoiceStatus,
} from '../../domain/objects/DeclaredStripeInvoice';
import { getInvoice } from './getInvoice';

export const sendInvoice = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredStripeInvoice>;
      unique: RefByUnique<typeof DeclaredStripeInvoice>;
      ref: Ref<typeof DeclaredStripeInvoice>;
    }>;
  },
  context: StripeApiContext & VisualogicContext,
): Promise<void> => {
  // find the invoice
  const invoiceFound = await getInvoice(input, context);
  if (!invoiceFound)
    throw new BadRequestError('can not send an invoice that does not exist', {
      input,
      invoiceFound,
    });

  // verify it is still in issued mode
  if (invoiceFound.status === DeclaredStripeInvoiceStatus.paid)
    throw new BadRequestError('should not send invoice that was already paid'); // if its already "paid", then we should throw a bad request, since folks shouldn't ask to resend
  if (invoiceFound.status !== DeclaredStripeInvoiceStatus.open)
    throw new BadRequestError(
      'can not send an invoice that is not in open mode',
      { invoiceFound },
    );

  // otherwise, send it
  const result = await context.stripe.invoices.sendInvoice(invoiceFound.id);
  console.log(result);
};
