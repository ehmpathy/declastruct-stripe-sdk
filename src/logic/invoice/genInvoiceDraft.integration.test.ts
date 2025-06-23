import { addDuration, asUniDate } from '@ehmpathy/uni-time';
import { given, then, when } from 'test-fns';
import { HasMetadata } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { getStripeCredentials } from '../../__test_assets__/getStripeCredentials';
import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';
import { getStripe } from '../auth/getStripe';
import { setCustomer } from '../customer/setCustomer';
import { genInvoiceDraft } from './genInvoiceDraft';

const log = console;

describe('genInvoiceDraft', () => {
  given('a customer', () => {
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
        { stripe: await getStripe(getStripeCredentials()), log },
      );
    });

    when('we attempt to generate a new invoice for them', () => {
      const exid = getUuid();
      let invoiceId: string;

      then('we should succeed', async () => {
        const invoice = await genInvoiceDraft(
          {
            invoice: {
              customerRef: customerFound,
              exid,
              config: {
                autoAdvance: false,
                collectionMethod: 'charge_automatically',
              },
              description: null,
              dueDate: null,
              metadata: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        console.log(invoice);
        expect(invoice.status).toEqual('draft');
        invoiceId = invoice.id;
      });

      then('it should be idempotent', async () => {
        const invoice = await genInvoiceDraft(
          {
            invoice: {
              customerRef: customerFound,
              exid,
              config: {
                autoAdvance: false,
                collectionMethod: 'charge_automatically',
              },
              description: null,
              metadata: null,
              dueDate: null,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        console.log(invoice);
        expect(invoice.status).toEqual('draft');
        expect(invoice.id).toEqual(invoiceId); // same invoice, not a new one
      });
    });
  });

  given('a customer', () => {
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
        { stripe: await getStripe(getStripeCredentials()), log },
      );
    });

    when(
      'we attempt to generate a new invoice for them with a due date',
      () => {
        const exid = getUuid();
        let invoiceId: string;

        then('we should succeed', async () => {
          const invoice = await genInvoiceDraft(
            {
              invoice: {
                customerRef: customerFound,
                exid,
                config: {
                  autoAdvance: false,
                  collectionMethod: 'send_invoice',
                },
                description: null,
                dueDate: addDuration(asUniDate(new Date()), { days: 7 }),
                metadata: null,
              },
            },
            { stripe: await getStripe(getStripeCredentials()), log },
          );
          expect(invoice.status).toEqual('draft');
          expect(invoice.dueDate).not.toEqual(null);
        });
      },
    );
  });

  when('we attempt to generate an invoice which was previously issued', () => {
    then.todo('it should throw a bad request error');
  });
});
