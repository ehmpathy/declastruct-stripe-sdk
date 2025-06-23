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
import { genInvoiceDraft } from '../invoice/genInvoiceDraft';
import { setProduct } from '../product/setProduct';
import { getInvoiceItems } from './getInvoiceItems';
import { setInvoiceItems } from './setInvoiceItems';

const log = console;

describe('setInvoiceItems', () => {
  given('a customer, invoice, and a few products', () => {
    let customer: HasMetadata<DeclaredStripeCustomer>;
    let invoice: HasMetadata<DeclaredStripeInvoice>;
    let productOne: HasMetadata<DeclaredStripeProduct>;
    let productTwo: HasMetadata<DeclaredStripeProduct>;
    let productThree: HasMetadata<DeclaredStripeProduct>;
    beforeAll(async () => {
      customer = await setCustomer(
        {
          finsert: {
            email: 'svc-protools.test.items@ehmpathy.dev',
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
      productOne = await setProduct(
        {
          finsert: new DeclaredStripeProduct({
            id: `test_${getUuid()}`,
            active: true,
            name: 'Ads Lead: Junk Removal, Jul 30 at 9:36pm',
            description: null,
            price: new Price({
              amount: 13_69,
              currency: 'USD',
            }),
            metadata: null,
            url: null,
          }),
        },
        { stripe: await getStripe(getStripeCredentials()), log },
      );
      productTwo = await setProduct(
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
      productThree = await setProduct(
        {
          finsert: new DeclaredStripeProduct({
            id: `test_${getUuid()}`,
            active: true,
            name: 'Ads Lead: Junk Removal, Jul 31 at 3:21pm',
            description: null,
            price: new Price({
              amount: 17_21,
              currency: 'USD',
            }),
            metadata: null,
            url: null,
          }),
        },
        { stripe: await getStripe(getStripeCredentials()), log },
      );
    });

    const itemExidToRetain = `cnc.${getUuid()}`;

    when('we want to set multiple items on a new invoice', () => {
      let itemsDesired: DeclaredStripeInvoiceItem[];
      beforeAll(() => {
        itemsDesired = [
          new DeclaredStripeInvoiceItem({
            invoiceRef: { id: invoice.id },
            productRef: { id: productOne.id },
            description: null,
            discounts: null,
            exid: itemExidToRetain,
            metadata: null,
          }),
          new DeclaredStripeInvoiceItem({
            invoiceRef: { id: invoice.id },
            productRef: { id: productTwo.id },
            description: null,
            discounts: null,
            exid: `cnc.${getUuid()}`,
            metadata: null,
          }),
          new DeclaredStripeInvoiceItem({
            invoiceRef: { id: invoice.id },
            productRef: { id: productThree.id },
            description: null,
            discounts: null,
            exid: `cnc.${getUuid()}`,
            metadata: null,
          }),
        ];
      });

      then('it should be able to add the items to the invoice', async () => {
        // set the items
        await setInvoiceItems(
          {
            to: {
              invoiceRef: invoice,
            },
            items: itemsDesired,
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );

        // verify they were all added
        const itemsFound = await getInvoiceItems(
          {
            by: { invoice: { by: { ref: invoice } } },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(itemsFound.length).toEqual(3);
      });

      then('it should be idempotent', async () => {
        // set the items
        await setInvoiceItems(
          {
            to: {
              invoiceRef: invoice,
            },
            items: itemsDesired,
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );

        // verify they were all added
        const itemsFound = await getInvoiceItems(
          {
            by: { invoice: { by: { ref: invoice } } },
          },
          { stripe: await getStripe(getStripeCredentials()), log },
        );
        expect(itemsFound.length).toEqual(3);
      });
    });

    when('we want to add and remove items on an existing invoice', () => {
      let itemsDesired: DeclaredStripeInvoiceItem[];
      beforeAll(() => {
        itemsDesired = [
          new DeclaredStripeInvoiceItem({
            invoiceRef: { id: invoice.id },
            productRef: { id: productOne.id },
            description: null,
            discounts: null,
            exid: itemExidToRetain,
            metadata: null,
          }),
          new DeclaredStripeInvoiceItem({
            invoiceRef: { id: invoice.id },
            productRef: { id: productTwo.id },
            description: null,
            discounts: null,
            exid: `cnc.${getUuid()}`,
            metadata: null,
          }),
        ];
      });

      then(
        'it should be able to add and remove items on the invoice',
        async () => {
          // set the items
          await setInvoiceItems(
            {
              to: {
                invoiceRef: invoice,
              },
              items: itemsDesired,
            },
            { stripe: await getStripe(getStripeCredentials()), log },
          );

          // verify they were added and removed
          const itemsFound = await getInvoiceItems(
            {
              by: { invoice: { by: { ref: invoice } } },
            },
            { stripe: await getStripe(getStripeCredentials()), log },
          );
          expect(itemsFound.length).toEqual(2);
        },
      );
    });
  });
});
