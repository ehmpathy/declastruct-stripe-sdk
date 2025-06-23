import { Price } from 'domain-glossary-price';
import { given, then, when } from 'test-fns';
import { HasMetadata } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { getStripeCredentials } from '../../__test_assets__/getStripeCredentials';
import { DeclaredStripeCustomer } from '../../domain/objects/DeclaredStripeCustomer';
import { DeclaredStripeDiscountCoupon } from '../../domain/objects/DeclaredStripeDiscountCoupon';
import { DeclaredStripeInvoice } from '../../domain/objects/DeclaredStripeInvoice';
import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { DeclaredStripeProduct } from '../../domain/objects/DeclaredStripeProduct';
import { getStripe } from '../auth/getStripe';
import { setCustomer } from '../customer/setCustomer';
import { genInvoiceDraft } from '../invoice/genInvoiceDraft';
import { setProduct } from '../product/setProduct';
import { setInvoiceItem } from './setInvoiceItem';

const log = console;

describe('setInvoiceItem', () => {
  given('a customer, invoice, and product', () => {
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
            metadata: null,
            dueDate: null,
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
    });

    when('we attempt to .finsert a new item', () => {
      let itemDesired: DeclaredStripeInvoiceItem;
      beforeAll(() => {
        itemDesired = new DeclaredStripeInvoiceItem({
          invoiceRef: { id: invoice.id },
          productRef: { id: product.id },
          description: null,
          discounts: null,
          exid: `cnc.${getUuid()}`,
          metadata: null,
        });
      });

      then('it should be able to add the item to the invoice', async () => {
        const itemCreated = await setInvoiceItem(
          {
            finsert: itemDesired,
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(itemCreated).toEqual(
          expect.objectContaining({
            ...itemDesired,
            description: product.name, // !: stripe sets the item.description === product.name by default!
          }),
        );
      });
      then('it should not update the item on subsequent attempts', async () => {
        const newDescription = 'some other description';
        const itemCreated = await setInvoiceItem(
          {
            finsert: {
              ...itemDesired,
              description: newDescription,
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(itemCreated.description).not.toEqual(newDescription);
        expect(itemCreated).toEqual(
          expect.objectContaining({
            ...itemDesired,
            description: product.name, // retained the original description
          }),
        );
      });
    });

    when('we attempt to .upsert a new item', () => {
      let itemDesired: DeclaredStripeInvoiceItem;
      beforeAll(() => {
        itemDesired = new DeclaredStripeInvoiceItem({
          invoiceRef: { id: invoice.id },
          productRef: { id: product.id },
          description: null,
          discounts: null,
          exid: `cnc.${getUuid()}`,
          metadata: null,
        });
      });

      then('it should be able to add the item to the invoice', async () => {
        const itemCreated = await setInvoiceItem(
          {
            upsert: itemDesired,
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(itemCreated).toEqual(
          expect.objectContaining({
            ...itemDesired,
            description: product.name, // !: stripe sets the item.description === product.name by default!
          }),
        );
      });

      then('it should update the item on subsequent attempts', async () => {
        const itemCreated = await setInvoiceItem(
          {
            upsert: {
              ...itemDesired,
              discounts: [
                new DeclaredStripeDiscountCoupon({
                  percentOff: 100,
                  duration: 'once',
                  amountOff: null,
                  metadata: null,
                  name: 'Customer was unreachable',
                }),
              ],
            },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        console.log(itemCreated);
        expect(itemCreated.discounts?.length).toEqual(1);
      });
    });
  });
});
