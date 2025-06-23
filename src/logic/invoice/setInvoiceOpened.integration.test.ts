import { Price } from 'domain-glossary-price';
import { given, then, when } from 'test-fns';
import { HasMetadata } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { getStripeCredentials } from '../../__test_assets__/getStripeCredentials';
import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';
import { DeclaredStripeInvoice } from '../../domain/objects/DeclaredStripeInvoice';
import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { DeclaredStripeProduct } from '../../domain/objects/DeclaredStripeProduct';
import { getStripe } from '../auth/getStripe';
import { setCustomer } from '../customer/setCustomer';
import { setInvoiceItem } from '../items/setInvoiceItem';
import { setProduct } from '../product/setProduct';
import { genInvoiceDraft } from './genInvoiceDraft';
import { setInvoiceOpened } from './setInvoiceOpened';

const log = console;

describe('setInvoiceIssued', () => {
  given('a drafted invoice', () => {
    let customer: HasMetadata<DeclaredStripeCustomer>;
    let invoice: HasMetadata<DeclaredStripeInvoice>;
    let product: HasMetadata<DeclaredStripeProduct>;
    beforeAll(async () => {
      customer = await setCustomer(
        {
          finsert: {
            email: 'svc-protools.test.items@ahbode.dev',
            name: 'svc-protools.test.items',
            description: 'test',
            metadata: null,
            phone: null,
          },
        },
        { stripe: await getStripe(getStripeCredentials()), log },
      );
      invoice = await genInvoiceDraft(
        {
          invoice: {
            customerRef: customer,
            exid: getUuid(),
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
      product = await setProduct(
        {
          finsert: new DeclaredStripeProduct({
            id: `test_${getUuid()}`,
            active: true,
            name: 'Ads Lead: Junk Removal, Jul 31 at 11:03am',
            description: null,
            price: new Price({
              amount: 197_00,
              currency: 'USD',
            }),
            metadata: null,
            url: null,
          }),
        },
        { stripe: await getStripe(getStripeCredentials()), log },
      );
      await setInvoiceItem(
        {
          upsert: new DeclaredStripeInvoiceItem({
            invoiceRef: { id: invoice.id },
            productRef: { id: product.id },
            description: null,
            discounts: null,
            exid: `cnc.${getUuid()}`,
            metadata: null,
          }),
        },
        { stripe: await getStripe(getStripeCredentials()), log },
      );
    });

    when('we attempt to issue it', () => {
      then('it should succeed', async () => {
        const invoiceOpened = await setInvoiceOpened(
          {
            by: {
              primary: {
                id: invoice.id,
              },
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(invoiceOpened.status).toEqual('open');
      });

      then('it should be idempotent', async () => {
        const invoiceOpened = await setInvoiceOpened(
          {
            by: {
              primary: {
                id: invoice.id,
              },
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(invoiceOpened.status).toEqual('open');
      });
    });
  });

  given('a paid invoice', () => {
    when('we attempt to issue it', () => {
      then.todo(
        'it should throw a bad request error',
        {
          because: 'you cant re-issue an invoice that was already paid',
        },
        () => {},
      );
    });
  });

  given('a voided invoice', () => {
    when('we attempt to issue it', () => {
      then.todo(
        'it should throw a bad request error',
        {
          because: 'you cant re-issue an invoice that was already voided',
        },
        () => {},
      );
    });
  });
});
