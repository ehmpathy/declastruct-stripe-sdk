import { asUniDate } from '@ehmpathy/uni-time';
import { Price } from 'domain-glossary-price';
import { UnexpectedCodePathError } from 'helpful-errors';
import Stripe from 'stripe';
import { HasMetadata, omit } from 'type-fns';

import { DeclaredStripeInvoice } from '../../domain/objects/DeclaredStripeInvoice';

export const castToDeclaredStripeInvoice = (
  input: Stripe.Invoice,
): HasMetadata<DeclaredStripeInvoice> => {
  return new DeclaredStripeInvoice({
    id: input.id,
    exid:
      input.metadata?.exid ??
      UnexpectedCodePathError.throw(
        'invoice.metadata.exid was not declared. this is not a valid declarative invoice',
        { input },
      ),
    status:
      input.status ??
      UnexpectedCodePathError.throw('could not extract status from invoice', {
        input,
      }),
    customerRef: {
      id:
        typeof input.customer === 'string'
          ? input.customer
          : input.customer?.id ??
            UnexpectedCodePathError.throw(
              'could not extract customerId from invoice',
              {
                input,
              },
            ),
    },
    chargeId:
      typeof input.charge === 'string'
        ? input.charge
        : input.charge?.id ?? null,
    config: {
      autoAdvance:
        input.auto_advance ??
        UnexpectedCodePathError.throw(
          'invoice.auto_advance was not specified',
          { input },
        ),
      collectionMethod: input.collection_method,
    },
    metadata: (() => {
      const obj = input.metadata ? omit(input.metadata, ['exid']) : {};
      if (Object.keys(obj).length === 0) return null;
      return obj;
    })(),
    pdfUrl: input.invoice_pdf ?? null,
    portalUrl: input.hosted_invoice_url ?? null,
    description: input.description ?? null,
    totalBillable: new Price({ amount: input.total, currency: 'USD' }),
    dueDate: input.due_date ? asUniDate({ mse: input.due_date * 1000 }) : null,
  }) as HasMetadata<DeclaredStripeInvoice>;
};
