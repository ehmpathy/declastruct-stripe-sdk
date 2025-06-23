import { Price } from 'domain-glossary-price';
import { given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { getStripeCredentials } from '../../__test_assets__/getStripeCredentials';
import { DeclaredStripeProduct } from '../../domain/objects/DeclaredStripeProduct';
import { getStripe } from '../auth/getStripe';
import { setProduct } from './setProduct';

const log = console;

describe('setProduct', () => {
  given('a new product we want to persist', () => {
    const product = new DeclaredStripeProduct({
      id: `test_${getUuid()}`,
      active: true,
      description: 'A super cool banjo!',
      name: 'Banjo 9000',
      price: new Price({
        amount: 197_00,
        currency: 'USD',
      }),
      metadata: null,
      url: null,
    });

    when('we attempt to .finsert a new item', () => {
      then('it should be able to create the product', async () => {
        const productCreated = await setProduct(
          { finsert: product },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(productCreated).toEqual(product); // should be exactly equal
      });
      then(
        'it should NOT update the product on subsequent attempts',
        async () => {
          const newDescription = 'better description!';
          const productCreated = await setProduct(
            { finsert: { ...product, description: newDescription } },
            { stripe: await getStripe(getStripeCredentials()), log },
          );
          expect(productCreated.description).not.toEqual(newDescription);
          expect(productCreated).toEqual(product); // should still be exactly equal as original
        },
      );
    });
  });

  given('a new product we want to persist', () => {
    const product = new DeclaredStripeProduct({
      id: `test_${getUuid()}`,
      active: true,
      name: 'OpenCNC 9000',
      description: 'A sweet open source cnc machine',
      price: new Price({
        amount: 197_00,
        currency: 'USD',
      }),
      metadata: null,
      url: null,
    });

    when('we attempt to .upsert a new item', () => {
      then('it should be able to create the product', async () => {
        const productCreated = await setProduct(
          { upsert: product },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(productCreated).toEqual(product); // should be exactly equal
      });
      then('it should update the product on subsequent attempts', async () => {
        const newDescription = 'better description!';
        const productCreated = await setProduct(
          { upsert: { ...product, description: newDescription } },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(productCreated.description).toEqual(newDescription);
        expect(productCreated).toEqual({
          ...product,
          description: newDescription,
        });
      });
    });
  });
});
