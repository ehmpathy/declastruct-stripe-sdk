import { serialize } from 'domain-objects';
import { toHashSha256Sync } from 'hash-fns';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import {
  getResourceNameFromFileName,
  VisualogicContext,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../../domain/constants';
import { DeclaredStripeDiscountCoupon } from '../../../domain/objects/DeclaredStripeDiscountCoupon';
import { castToDeclaredStripeDiscountCoupon } from '../../cast/castToDeclaredStripeDiscountCoupon';

/**
 * .what = sets a coupon
 *
 * .note
 *   - there's no way to find a coupon by unique, so they're always inserted
 */
export const setCoupon = withLogTrail(
  async (
    input: PickOne<{
      insert: DeclaredStripeDiscountCoupon;
    }>,
    context: StripeApiContext & VisualogicContext,
  ): Promise<HasMetadata<DeclaredStripeDiscountCoupon>> => {
    const couponDesired = input.insert;
    const couponCreated = await context.stripe.coupons.create(
      {
        name: couponDesired.name ?? undefined,
        duration:
          typeof couponDesired.duration === 'string'
            ? couponDesired.duration
            : couponDesired.duration.choice,
        duration_in_months:
          typeof couponDesired.duration !== 'string'
            ? couponDesired.duration.months
            : undefined,
        percent_off: couponDesired.percentOff ?? undefined,
        amount_off: couponDesired.amountOff?.amount ?? undefined,
        currency: couponDesired.amountOff
          ? couponDesired.amountOff.currency === 'USD'
            ? 'usd'
            : UnexpectedCodePathError.throw('todo: support other currencies')
          : undefined,
        metadata: couponDesired.metadata ?? undefined,
      },
      {
        idempotencyKey: toHashSha256Sync(
          ['v1.0.1', serialize({ ...couponDesired })].join(';'),
        ),
      },
    );
    return castToDeclaredStripeDiscountCoupon(couponCreated);
  },
  { name: getResourceNameFromFileName(__filename) },
);
