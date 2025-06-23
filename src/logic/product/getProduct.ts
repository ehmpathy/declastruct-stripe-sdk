import { Ref, RefByPrimary, RefByUnique, isUniqueKeyRef } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeProduct } from '../../domain/objects/DeclaredStripeProduct';
import { castToDeclaredStripeProduct } from '../cast/castToDeclaredStripeProduct';

/**
 * .what = gets a product from stripe
 */
export const getProduct = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredStripeProduct>;
      unique: RefByUnique<typeof DeclaredStripeProduct>;
      ref: Ref<typeof DeclaredStripeProduct>;
    }>;
  },
  context: StripeApiContext & VisualogicContext,
): Promise<HasMetadata<DeclaredStripeProduct> | null> => {
  // handle by ref
  if (input.by.ref)
    return isUniqueKeyRef({ of: DeclaredStripeProduct })(input.by.ref)
      ? getProduct({ by: { unique: input.by.ref } }, context)
      : getProduct({ by: { primary: input.by.ref } }, context);

  // handle get by id
  if (input.by.primary) {
    try {
      const product = await context.stripe.products.retrieve(
        input.by.primary.id,
        {
          expand: ['default_price'],
        },
      );
      if (product.deleted) return null;
      return castToDeclaredStripeProduct(product);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.message.includes('No such product')) return null; // handle "null" responses without an error
      throw error;
    }
  }

  // handle get by unique
  if (input.by.unique)
    return await getProduct(
      { by: { primary: { id: input.by.unique.id } } },
      context,
    ); // unique key === primary key, in this scenario, cause stripe hates unique keys

  // otherwise, unexpected input
  throw new UnexpectedCodePathError('invalid input', { input });
};
