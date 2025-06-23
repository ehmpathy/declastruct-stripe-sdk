import { Price, isOfCurrency } from 'domain-glossary-price';
import { UnexpectedCodePathError } from 'helpful-errors';
import Stripe from 'stripe';
import { HasMetadata, hasMetadata, omit } from 'type-fns';

import { DeclaredStripeDiscountCoupon } from '../../domain/objects/DeclaredStripeDiscountCoupon';

export const castToDeclaredStripeDiscountCoupon = (
  input: Stripe.Coupon,
): HasMetadata<DeclaredStripeDiscountCoupon> => {
  const coupon = new DeclaredStripeDiscountCoupon({
    id: input.id,
    name: input.name,
    amountOff:
      input.amount_off && input.currency
        ? new Price({
            amount: input.amount_off,
            currency: isOfCurrency.assure(input.currency.toUpperCase()),
          })
        : null,
    percentOff: input.percent_off ?? null,
    duration:
      input.duration === 'repeating'
        ? {
            choice: input.duration,
            months:
              input.duration_in_months ??
              UnexpectedCodePathError.throw(
                'expected duration.months quantity to be defined when .choice is repeating',
                { input },
              ),
          }
        : input.duration,
    metadata: (() => {
      const obj = input.metadata ? omit(input.metadata, ['exid']) : {};
      if (Object.keys(obj).length === 0) return null;
      return obj;
    })(),
  });
  if (hasMetadata(coupon, ['id'])) return coupon;
  throw new UnexpectedCodePathError('expected coupon to have metadata', {
    coupon,
  });
};
