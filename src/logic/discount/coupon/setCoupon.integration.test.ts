import { given, then, when } from 'test-fns';

import { getStripeCredentials } from '../../../__test_assets__/getStripeCredentials';
import { DeclaredStripeDiscountCoupon } from '../../../domain/objects/DeclaredStripeDiscountCoupon';
import { getStripe } from '../../auth/getStripe';
import { setCoupon } from './setCoupon';

const log = console;

describe('setCoupon', () => {
  given('a coupon to insert', () => {
    when('we try to insert it', () => {
      then('it should succeed', async () => {
        const coupon = await setCoupon(
          {
            insert: new DeclaredStripeDiscountCoupon({
              percentOff: 100,
              duration: 'once',
              name: 'Customer was unresponsive',
              amountOff: null,
              metadata: null,
            }),
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
      });
    });
  });
});
