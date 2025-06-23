import { Ref, RefByPrimary, RefByUnique, isUniqueKeyRef } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import {
  getResourceNameFromFileName,
  VisualogicContext,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { castToDeclaredStripeInvoiceItem } from '../cast/castToDeclaredStripeInvoiceItem';
import { getInvoice } from '../invoice/getInvoice';

/**
 * .what = gets an invoice item from stripe
 */
export const getInvoiceItem = withLogTrail(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredStripeInvoiceItem>;
        unique: RefByUnique<typeof DeclaredStripeInvoiceItem>;
        ref: Ref<typeof DeclaredStripeInvoiceItem>;
      }>;
    },
    context: StripeApiContext & VisualogicContext,
  ): Promise<HasMetadata<DeclaredStripeInvoiceItem> | null> => {
    // handle by ref
    if (input.by.ref)
      return isUniqueKeyRef({ of: DeclaredStripeInvoiceItem })(input.by.ref)
        ? getInvoiceItem({ by: { unique: input.by.ref } }, context)
        : getInvoiceItem({ by: { primary: input.by.ref } }, context);

    // handle get by id
    if (input.by.primary) {
      try {
        const item = await context.stripe.invoiceItems.retrieve(
          input.by.primary.id,
          {
            expand: ['price', 'discounts'], // required to cast to declared item
          },
        );
        if (item.deleted) return null;
        return castToDeclaredStripeInvoiceItem(item);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        if (error.message.includes('No such customer')) return null; // handle "null" responses without an error
        throw error;
      }
    }

    // handle get by unique
    if (input.by.unique) {
      // resolve the invoice ref
      const invoiceFound = await getInvoice(
        {
          by: {
            ref: input.by.unique.invoiceRef,
          },
        },
        context,
      );
      if (!invoiceFound)
        throw new BadRequestError('can not resolve item.invoiceRef', { input });

      // lookup the items by invoice, to filter down to a subset
      const { data: candidates } = await context.stripe.invoiceItems.list({
        invoice: invoiceFound.id,
        limit: 100,
      });
      if (candidates.length >= 90)
        // 90 because that's too close for comfort
        throw new UnexpectedCodePathError(
          'todo: handle pagination on invoices',
          {
            found: candidates.length,
            limit: 100,
          },
        );

      // now find the one with this exid, for the invoice
      const targets = candidates.filter(
        (candidate) => candidate.metadata?.exid === input.by.unique?.exid,
      );
      const [target, ...otherOptions] = targets;
      if (otherOptions.length)
        throw new UnexpectedCodePathError(
          'more than one item matches the .unique key',
          { input, matches: targets },
        );
      if (!target) return null;
      return await getInvoiceItem(
        { by: { primary: { id: target.id } } },
        context,
      ); // find by id, to expand the discounts
    }

    // otherwise, unexpected input
    throw new UnexpectedCodePathError('invalid input', { input });
  },
  {
    name: getResourceNameFromFileName(__filename),
  },
);
