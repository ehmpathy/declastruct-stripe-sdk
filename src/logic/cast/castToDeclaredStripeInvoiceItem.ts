import { UnexpectedCodePathError } from 'helpful-errors';
import Stripe from 'stripe';
import { HasMetadata, omit } from 'type-fns';

import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { castToDeclaredStripeDiscountCoupon } from './castToDeclaredStripeDiscountCoupon';

export const castToDeclaredStripeInvoiceItem = (
  input: Stripe.InvoiceItem,
): HasMetadata<DeclaredStripeInvoiceItem> => {
  return new DeclaredStripeInvoiceItem({
    id: input.id,
    exid:
      input.metadata?.exid ??
      UnexpectedCodePathError.throw(
        'invoice.metadata.exid was not declared. this is not a valid declarative invoice',
        { input },
      ),
    metadata: (() => {
      const obj = input.metadata ? omit(input.metadata, ['exid']) : {};
      if (Object.keys(obj).length === 0) return null;
      return obj;
    })(),
    description: input.description,
    discounts: (() => {
      const array =
        input.discounts?.map((discount) => {
          if (typeof discount === 'string')
            throw new UnexpectedCodePathError(
              'expected discount to be expanded',
              {
                input,
                discount,
              },
            );
          if (discount.coupon)
            return castToDeclaredStripeDiscountCoupon(discount.coupon);
          throw new UnexpectedCodePathError('unsupported discount type', {
            input,
            discount,
          });
        }) ?? [];
      if (!array.length) return null;
      return array;
    })(),
    invoiceRef: {
      id: !input.invoice
        ? UnexpectedCodePathError.throw(
            'expected stripe.invoice.item to have invoice assigned',
            { input },
          )
        : typeof input.invoice !== 'string'
        ? UnexpectedCodePathError.throw(
            'expected stripe.invoice.item.invoice to be a string',
            { input },
          )
        : input.invoice,
    },
    productRef: {
      id: !input.price
        ? UnexpectedCodePathError.throw(
            'price not defined on stripe.invoice.item',
            { input },
          )
        : typeof input.price === 'string'
        ? UnexpectedCodePathError.throw(
            'stripe.invoice.item.price was not an object',
            { input },
          )
        : input.price.deleted
        ? UnexpectedCodePathError.throw('invoice.item.price was deleted')
        : typeof input.price.product !== 'string'
        ? UnexpectedCodePathError.throw(
            'invoice.item.price.product was not a string',
            { input },
          )
        : input.price.product,
    },
  }) as HasMetadata<DeclaredStripeInvoiceItem>;
};
