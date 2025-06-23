import { serialize } from 'domain-objects';
import { toHashSha256Sync } from 'hash-fns';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne, pick } from 'type-fns';
import {
  getResourceNameFromFileName,
  VisualogicContext,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeProduct } from '../../domain/objects/DeclaredStripeProduct';
import { castToDeclaredStripeProduct } from '../cast/castToDeclaredStripeProduct';
import { getProduct } from './getProduct';

/**
 * .what = sets a product
 */
export const setProduct = withLogTrail(
  async (
    input: PickOne<{
      finsert: DeclaredStripeProduct;
      upsert: DeclaredStripeProduct;
    }>,
    context: StripeApiContext & VisualogicContext,
  ): Promise<HasMetadata<DeclaredStripeProduct>> => {
    // define the desired product
    const productDesired = input.upsert ?? input.finsert;

    // lookup the product
    const productFound = await getProduct(
      {
        by: {
          unique: {
            id:
              input.finsert?.id ??
              input.upsert?.id ??
              UnexpectedCodePathError.throw('no id in input', { input }),
          },
        },
      },
      context,
    );

    // sanity check that if the product exists, their id matches the user's expectations, if any
    const primaryIdExpected = productDesired.id;
    if (
      productFound &&
      primaryIdExpected &&
      primaryIdExpected !== productFound.id
    )
      throw new UnexpectedCodePathError(
        'asked to setProduct with a desired.primary=id which does not match the found.primary=id',
        {
          primaryIdExpected,
          primaryIdFound: productFound.id,
          productFound,
        },
      );

    // if the product was found, then handle that
    if (productFound) {
      // if asked to finsert, then we can return it now
      if (input.finsert) return productFound;

      // if asked to upsert, then we can update it now
      if (input.upsert) {
        // if the price has changed, create the new price explicitly
        const priceDesired =
          productFound.price.amount === productDesired.price.amount
            ? undefined
            : await context.stripe.prices.create({
                currency:
                  productDesired.price.currency === 'USD'
                    ? 'usd'
                    : UnexpectedCodePathError.throw(
                        'todo: support non usd currencies',
                        {
                          productDesired,
                        },
                      ),
                unit_amount: productDesired.price.amount,
                product: productFound.id,
              });

        // cast to the new price
        return castToDeclaredStripeProduct(
          await context.stripe.products.update(productFound.id, {
            name: input.upsert.name ?? undefined,
            description: input.upsert.description ?? undefined,
            default_price: priceDesired?.id,
            metadata: input.upsert.metadata ?? undefined,
            // images: input.upsert.images // todo: support images
            expand: ['default_price'],
          }),
        );
      }
    }

    // otherwise, create the product
    const productCreated = await context.stripe.products.create(
      {
        id: productDesired.id, // stripe allows us to choose a custom id... so, this is really an exid...
        url: productDesired.url ?? undefined,
        name: productDesired.name,
        active: productDesired.active,
        description: productDesired.description ?? undefined,
        default_price_data: {
          currency:
            productDesired.price.currency === 'USD'
              ? 'usd'
              : UnexpectedCodePathError.throw(
                  'todo: support non usd currencies',
                  {
                    productDesired,
                  },
                ),
          unit_amount: productDesired.price.amount,
        },
        // images: input.upsert.images // todo: support images
        metadata: productDesired.metadata ?? undefined,
        expand: ['default_price'],
      },
      {
        idempotencyKey: toHashSha256Sync(
          [
            'v1.0.0',
            serialize(pick(productDesired, ['id'])), // make it idempotent on the unique keys; // todo: use domain-objects.getUniqueKeys({ of: DeclaredStripeInvoice }) instead of hardcoding the keys
          ].join(';'),
        ),
      },
    );
    return castToDeclaredStripeProduct(productCreated);
  },
  {
    name: getResourceNameFromFileName(__filename),
  },
);
