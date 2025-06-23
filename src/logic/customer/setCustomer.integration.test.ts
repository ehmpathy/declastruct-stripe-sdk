import { given, then, when } from 'test-fns';
import { HasMetadata } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { getStripeCredentials } from '../../__test_assets__/getStripeCredentials';
import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';
import { getStripe } from '../auth/getStripe';
import { setCustomer } from './setCustomer';

const log = console;

describe('setCustomer', () => {
  given('a .finsert', () => {
    when('the customer does not exist yet', () => {
      const email = `svc-protools.test.${getUuid()}@ahbode.dev`; // random uuid => new customer

      then('we should create it', async () => {
        const customer = await setCustomer(
          {
            finsert: {
              email,
              name: 'svc-protools.test',
              description: 'test',
              metadata: null,
              phone: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        console.log(customer);
        expect(customer.id).toContain('cus_');
      });
    });

    when('the customer already exists', () => {
      const email = `svc-protools.test.${getUuid()}@ahbode.dev`; // random uuid => new customer
      let customerBefore: HasMetadata<DeclaredStripeCustomer>;
      beforeAll(async () => {
        customerBefore = await setCustomer(
          {
            finsert: {
              email,
              name: 'svc-protools.test',
              description: 'test',
              metadata: null,
              phone: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
      });

      then('it should not update the customers attributes', async () => {
        const customerAfter = await setCustomer(
          {
            finsert: {
              email,
              name: 'new name',
              description: 'test',
              metadata: null,
              phone: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(customerAfter.name).not.toEqual('new name');
        expect(customerAfter.name).toEqual(customerBefore.name);
      });
    });
  });
  given('a .upsert', () => {
    when('the customer does not exist yet', () => {
      const email = `svc-protools.test.${getUuid()}@ahbode.dev`; // random uuid => new customer

      then('we should create it', async () => {
        const customer = await setCustomer(
          {
            upsert: {
              email,
              name: 'svc-protools.test',
              description: 'test',
              metadata: null,
              phone: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        console.log(customer);
        expect(customer.id).toContain('cus_');
      });
    });

    when('the customer already exists', () => {
      const email = `svc-protools.test.${getUuid()}@ahbode.dev`; // random uuid => new customer
      let customerBefore: HasMetadata<DeclaredStripeCustomer>;
      beforeAll(async () => {
        customerBefore = await setCustomer(
          {
            upsert: {
              email,
              name: 'svc-protools.test',
              description: 'test',
              metadata: null,
              phone: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
      });

      then('it should update the customers attributes', async () => {
        const customerAfter = await setCustomer(
          {
            upsert: {
              email,
              name: 'new name',
              description: 'test',
              metadata: null,
              phone: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(customerAfter.name).toEqual('new name');
        expect(customerAfter.name).not.toEqual(customerBefore.name);
      });
    });
  });
});
