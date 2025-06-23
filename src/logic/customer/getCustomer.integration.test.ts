import { given, then, when } from 'test-fns';
import { HasMetadata } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { getStripeCredentials } from '../../__test_assets__/getStripeCredentials';
import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';
import { getStripe } from '../auth/getStripe';
import { getCustomer } from './getCustomer';
import { setCustomer } from './setCustomer';

describe('getCustomer', () => {
  given('a by.primary', () => {
    when('the customer does not exist', () => {
      const stripeCustomerId = getUuid();

      then('we should get null', async () => {
        const customer = await getCustomer(
          { by: { primary: { id: stripeCustomerId } } },
          { stripe: await getStripe(getStripeCredentials()), log: console },
        );
        expect(customer).toEqual(null);
      });
    });

    when('the customer does exist', () => {
      let customerFound: HasMetadata<DeclaredStripeCustomer>;
      beforeAll(async () => {
        customerFound = await setCustomer(
          {
            finsert: {
              email: 'svc-protools@ahbode.dev',
              name: 'svc-protools.test',
              description: 'test',
              metadata: null,
              phone: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log: console },
        );
      });

      when('we attempt to get the customer', () => {
        then('we should get null', async () => {
          const customer = await getCustomer(
            { by: { primary: { id: customerFound.id } } },
            { stripe: await getStripe(getStripeCredentials()), log: console },
          );
          expect(customer?.id).toEqual(customerFound.id);
        });
      });
    });
  });
});
