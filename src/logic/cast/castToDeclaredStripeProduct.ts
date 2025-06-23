import { Price } from 'domain-glossary-price';
import { UnexpectedCodePathError } from 'helpful-errors';
import Stripe from 'stripe';
import { HasMetadata, hasMetadata, isPresent, omit } from 'type-fns';

import { DeclaredStripeProduct } from '../../domain/objects/DeclaredStripeProduct';

export const castToDeclaredStripeProduct = (
  input: Stripe.Product,
): HasMetadata<DeclaredStripeProduct> => {
  const product = new DeclaredStripeProduct({
    id: input.id,
    url: input.url ?? null,
    name: input.name,
    description: input.description,
    active: input.active,
    price: new Price({
      amount:
        typeof input.default_price === 'string'
          ? UnexpectedCodePathError.throw(
              'product.default_price was defined as a string. please have stripe hydrate this into an object',
              { input },
            )
          : !isPresent(input.default_price)
          ? UnexpectedCodePathError.throw(
              'product.default_price was not defined. why?',
              { input },
            )
          : input.default_price.deleted
          ? UnexpectedCodePathError.throw(
              'product.default_price has a deleted status. why?',
              { input },
            )
          : input.default_price.unit_amount ??
            UnexpectedCodePathError.throw(
              'product.default_price.unit_amount is not defined. why?',
              { input },
            ),
      currency: 'USD',
    }),
    metadata: (() => {
      const obj = input.metadata ? omit(input.metadata, ['exid']) : {};
      if (Object.keys(obj).length === 0) return null;
      return obj;
    })(),
  });
  if (hasMetadata(product, ['id'])) return product;
  throw new UnexpectedCodePathError('expected product to have metadata', {
    product,
  });
};
