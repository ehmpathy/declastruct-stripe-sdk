import { Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import {
  VisualogicContext,
  getResourceNameFromFileName,
  withLogTrail,
} from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { getInvoiceItem } from './getInvoiceItem';

/**
 * .what = deletes an invoice item
 * .what.intent =
 *   - remove it from an invoice item
 */
export const delInvoiceItem = withLogTrail(
  async (
    input: { by: { ref: Ref<typeof DeclaredStripeInvoiceItem> } },
    context: StripeApiContext & VisualogicContext,
  ): Promise<void> => {
    // find the item
    const item = await getInvoiceItem({ by: { ref: input.by.ref } }, context);
    if (!item)
      throw new UnexpectedCodePathError('item does not exist by ref', {
        input,
      });

    // delete it
    await context.stripe.invoiceItems.del(item.id);
  },
  {
    name: getResourceNameFromFileName(__filename),
  },
);
