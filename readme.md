# declastruct-stripe-sdk

![test](https://github.com/ehmpathy/declastruct-stripe-sdk/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/declastruct-stripe-sdk/workflows/publish/badge.svg)

Declarative control of Stripe constructs, via [declastruct](https://github.com/ehmpathy/declastruct).

Declare the structures you want. Plan to see the changes required. Apply to make it so 🪄


# install

```sh
npm install -s declastruct-stripe-sdk
```

# use

### authenticate with stripe

```ts
const stripe = await getStripe({ ...creds });
```

for the below examples, we'll assume that your `context` object has the instantiated `stripe` sdk on it

```ts
const context = { stripe }
```


### set a stripe product

```ts
// declare
const stripeProductDesired = new DeclaredStripeProduct({
  id: plantUuid, // we can customize the primary key of products with whatever value we want
  active: true,
  name: plantName,
  description: `This is a great Banana Palm.`,
  metadata: {
    plantUuid,
  },
  price: plantPrice,
  url: null,
})

// apply
const stripeProductApplied = await setProduct(
  {
    upsert: stripeProductDesired,
  },
  context,
);
```

### set a stripe invoice

```ts
// declare
const stripeInvoiceDesired = new DeclaredStripeInvoice({
  customerRef: { id: payer.stripeCustomerId },
  exid: ['PlantBasketInvoice.uuid=', invoice.uuid].join(''),
  description: `Invoice for Plants purchased in this basket.`,
  metadata: {
    providerAdsInvoiceUuid: invoice.uuid,
  },
  dueDate: addDuration(
    asUniDateTime(addDuration(invoice.overDateUntil, { days: 7 })),
    { hours: 12 },
  ),
  config: {
    autoAdvance: false, // we'll manually charge on our own schedule // !: this is critical to enable charging 7 days in advance
    collectionMethod: 'send_invoice', // note that we can still charge programmatically at any time
  },
})

// apply
const stripeInvoiceApplied = await genInvoiceDraft(
  {
    invoice: stripeInvoiceDesired,
  },
  context,
);

```

### set a stripe invoice item

```ts
// declare
const stripeInvoiceItemDesired = new DeclaredStripeInvoiceItem({
  invoiceRef: {
    id: input.stripeInvoiceId,
  },
  productRef: {
    id: stripeProduct.id,
  },
  exid: ['PlantBasketInvoiceItem.uuid=', item.uuid].join(''),
  metadata: {
    jobUuid: item.miracle.jobUuid,
  },
  description: productName, // it will autofill from the product
  discounts:
    (item.priceBillable?.amount ?? 0) === 0 // if there was a refund / discount, we can apply it here
      ? [
          new DeclaredStripeDiscountCoupon({
            name: item.priceReason,
            percentOff: 100,
            amountOff: null,
            duration: 'once',
            metadata: null,
          }),
        ]
      : null,
});

// apply
const stripeInvoiceItemApplied = await setInvoiceItem(
  {
    upsert: stripeInvoiceItemDesired,
  },
  context,
);
```

### set stripe invoice items to an invoice

```ts
// apply
await setInvoiceItems(
  {
    to: { invoiceRef: { id: stripeInvoice.id } },
    items: invoiceItemsDesiredOnInvoice,
  },
  context,
);
```
