import { parseISO } from 'date-fns';
import { serialize } from 'domain-objects';
import { toHashSha256Sync } from 'hash-fns';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { omit, pick } from 'type-fns';
import {
  getResourceNameFromFileName,
  VisualogicContext,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeInvoice } from '../../domain/objects/DeclaredStripeInvoice';
import { castToDeclaredStripeInvoice } from '../cast/castToDeclaredStripeInvoice';
import { getCustomer } from '../customer/getCustomer';
import { getInvoice } from './getInvoice';

/**
 * .what = creates a new invoice draft with stripe
 * .what.requirements
 *   - prevents creating duplicate invoice, per customer
 *   - returns invoice in draft state
 *   - throws error if invoice was already issued
 */
export const genInvoiceDraft = withLogTrail(
  async <TIssuerRef, TReceiverRef>(
    input: {
      invoice: Pick<
        DeclaredStripeInvoice,
        | 'customerRef'
        | 'exid'
        | 'config'
        | 'description'
        | 'metadata'
        | 'dueDate'
      >;
    },
    context: StripeApiContext & VisualogicContext,
  ) => {
    // lookup the customer by ref
    const customerFound = await getCustomer(
      { by: { ref: input.invoice.customerRef } },
      context,
    );
    if (!customerFound)
      throw new UnexpectedCodePathError('customer does not exist for by ref', {
        input,
      });

    // check whether the invoice already exists for the customer
    const invoiceFound = await getInvoice(
      {
        by: {
          unique: {
            customerRef: input.invoice.customerRef,
            exid: input.invoice.exid,
          },
        },
      },
      context,
    );

    // if it does, then check that its still drafted; if so, return it
    if (invoiceFound) {
      // if its still drafted, then this can safely be treated as an idempotent retry
      if (invoiceFound.status === 'draft') return invoiceFound;

      // otherwise, the caller is unaware of the actual state of this invoice, and needs to be informed that this is not possible
      throw new BadRequestError(
        'can not draft an invoice that was already issued',
        { invoiceFound },
      );
    }

    // otherwise, create the new invoice
    const stripeInvoiceCreated = await context.stripe.invoices.create(
      {
        customer: customerFound.id,
        auto_advance: input.invoice.config.autoAdvance,
        collection_method: input.invoice.config.collectionMethod,
        description: input.invoice.description ?? undefined,
        due_date: input.invoice.dueDate
          ? Math.ceil(parseISO(input.invoice.dueDate).getTime() / 1000) // https://stackoverflow.com/a/55848218/3068233
          : undefined,
        metadata: {
          exid: input.invoice.exid,
          ...omit(input.invoice.metadata ?? {}, ['exid']),
        },
      },
      {
        idempotencyKey: toHashSha256Sync(
          [
            'v1.0.1',
            serialize(pick(input.invoice, ['customerRef', 'exid'])), // make it idempotent on the unique keys of the invoice; // todo: use domain-objects.getUniqueKeys({ of: DeclaredStripeInvoice }) instead of hardcoding the keys
          ].join(';'),
        ),
      },
    );

    // resolve the created invoice
    return castToDeclaredStripeInvoice(stripeInvoiceCreated);
  },
  { name: getResourceNameFromFileName(__filename) },
);
