import { RefByPrimary } from 'domain-objects';
import { given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { getStripeCredentials } from '../../__test_assets__/getStripeCredentials';
import { DeclaredStripeInvoice } from '../../domain/objects/DeclaredStripeInvoice';
import { getStripe } from '../auth/getStripe';
import { getInvoice } from './getInvoice';

const log = console;

describe('getInvoice', () => {
  given('a ref to an invoice which does not exist yet', () => {
    const ref: RefByPrimary<typeof DeclaredStripeInvoice> = { id: getUuid() };

    when('we try to get it', () => {
      then('we should get null', async () => {
        const result = await getInvoice(
          { by: { primary: ref } },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(result).toEqual(null);
      });
    });
  });
});
