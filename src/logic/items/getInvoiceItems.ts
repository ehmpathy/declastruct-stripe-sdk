import { Ref } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeInvoice } from '../../domain/objects/DeclaredStripeInvoice';
import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { castToDeclaredStripeInvoiceItem } from '../cast/castToDeclaredStripeInvoiceItem';
import { getInvoice } from '../invoice/getInvoice';

/**
 * .what = gets all invoice items from stripe
 */
export const getInvoiceItems = async (
  input: {
    by: PickOne<{
      invoice: PickOne<{
        by: {
          ref: Ref<typeof DeclaredStripeInvoice>;
        };
      }>;
    }>;
  },
  context: StripeApiContext & VisualogicContext,
): Promise<HasMetadata<DeclaredStripeInvoiceItem>[]> => {
  // handle by invoice
  if (input.by.invoice) {
    // resolve the invoice ref
    const invoiceFound = await getInvoice(
      {
        by: {
          ref: input.by.invoice.by.ref,
        },
      },
      context,
    );
    if (!invoiceFound)
      throw new BadRequestError('can not resolve item.invoiceRef', { input });

    // lookup the items by invoice
    const { data: items } = await context.stripe.invoiceItems.list({
      invoice: invoiceFound.id,
      limit: 100,
      expand: ['data.price', 'data.discounts'], // required to cast to declared item
    });
    if (items.length >= 90)
      // 90 because that's too close for comfort
      throw new UnexpectedCodePathError(
        'todo: handle pagination on invoice.items',
        {
          found: items.length,
          limit: 100,
        },
      );

    // return each
    return items.map(castToDeclaredStripeInvoiceItem);
  }

  // otherwise, unexpected input
  throw new UnexpectedCodePathError('invalid input', { input });
};
