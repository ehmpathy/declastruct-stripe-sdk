import { serialize } from 'domain-objects';
import { toHashSha256Sync } from 'hash-fns';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne, omit, pick } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { castToDeclaredStripeInvoiceItem } from '../cast/castToDeclaredStripeInvoiceItem';
import { getCustomer } from '../customer/getCustomer';
import { setCoupon } from '../discount/coupon/setCoupon';
import { getInvoice } from '../invoice/getInvoice';
import { getProduct } from '../product/getProduct';
import { getInvoiceItem } from './getInvoiceItem';

/**
 * .what = sets an invoice item
 */
export const setInvoiceItem = async (
  input: PickOne<{
    finsert: DeclaredStripeInvoiceItem;
    upsert: DeclaredStripeInvoiceItem;
  }>,
  context: StripeApiContext & VisualogicContext,
): Promise<HasMetadata<DeclaredStripeInvoiceItem>> => {
  // define the desired invoice item state
  const itemDesired =
    input.finsert ??
    input.upsert ??
    UnexpectedCodePathError.throw(
      'expected either finsert or upsert to be defined',
      { input },
    );

  // resolve the invoice ref
  const invoiceFound = await getInvoice(
    {
      by: {
        ref: itemDesired.invoiceRef,
      },
    },
    context,
  );
  if (!invoiceFound)
    throw new BadRequestError('can not resolve item.invoiceRef', { input });

  // resolve the customer ref
  const customerFound = await getCustomer(
    {
      by: {
        ref: invoiceFound.customerRef,
      },
    },
    context,
  );
  if (!customerFound)
    throw new BadRequestError('can not resolve item.invoice.customerRef', {
      invoiceFound,
    });

  // resolve the product ref
  const productFound = await getProduct(
    {
      by: {
        ref: itemDesired.productRef,
      },
    },
    context,
  );
  if (!productFound)
    throw new BadRequestError('can not resolve item.productRef', { input });

  // lookup the item
  const itemFound = await getInvoiceItem(
    {
      by: {
        unique: {
          invoiceRef: invoiceFound,
          exid: itemDesired.exid,
        },
      },
    },
    context,
  );

  // define how to get the desired discounts
  const getDiscountsDesired = async () =>
    !itemDesired.discounts
      ? '' // per stripe, "pass an empty string to remove existing discounts"
      : await Promise.all(
          itemDesired.discounts.map(async (discountDesired) => {
            const coupon = await setCoupon(
              { insert: discountDesired }, // unfortunately, stripe has no unique key for coupons, so we must always insert 🥲
              context,
            );
            return { coupon: coupon.id };
          }),
        );

  // sanity check that if the product exists, their id matches the user's expectations, if any
  const primaryIdFound = itemFound?.id;
  const primaryIdExpected = itemDesired.id;
  if (
    primaryIdFound &&
    primaryIdExpected &&
    primaryIdExpected !== primaryIdFound
  )
    throw new UnexpectedCodePathError(
      'asked to setItem with a desired.primary=id which does not match the found.primary=id',
      {
        primaryIdExpected,
        primaryIdFound,
        itemFound,
      },
    );

  // if the item was found, then handle that
  if (itemFound) {
    // if asked to finsert, then we can return it now
    if (input.finsert) return itemFound;

    // if asked to upsert, then we can update it now
    if (input.upsert) {
      const invoiceUpdated = await context.stripe.invoiceItems.update(
        itemFound.id,
        {
          description: input.upsert.description ?? undefined,
          metadata: input.upsert.metadata ?? undefined,
          discounts: await getDiscountsDesired(),
          price: (
            await context.stripe.products.retrieve(productFound.id)
          ).default_price as string,
          expand: ['discounts'],
        },
      );
      return castToDeclaredStripeInvoiceItem(invoiceUpdated);
    }
  }

  // otherwise, create the item
  const itemCreated = await context.stripe.invoiceItems.create(
    {
      invoice: invoiceFound.id,
      customer: customerFound.id,
      description: itemDesired.description ?? undefined,
      metadata: {
        exid: itemDesired.exid,
        ...omit(itemDesired.metadata ?? {}, ['exid']),
      },
      discounts: await getDiscountsDesired(),
      price: (
        await context.stripe.products.retrieve(productFound.id)
      ).default_price as string,
      expand: ['discounts'],
    },
    {
      idempotencyKey: toHashSha256Sync(
        [
          'v1.0.0',
          serialize(pick(itemDesired, ['invoiceRef', 'exid'])), // make it idempotent on the unique keys; // todo: use domain-objects.getUniqueKeys({ of: DeclaredStripeInvoice }) instead of hardcoding the keys
        ].join(';'),
      ),
    },
  );
  return castToDeclaredStripeInvoiceItem(itemCreated);
};
