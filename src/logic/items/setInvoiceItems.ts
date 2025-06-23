import Bottleneck from 'bottleneck';
import { serialize } from 'domain-objects';
import { pick } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { StripeApiContext } from '../../domain/constants';
import { DeclaredStripeInvoiceItem } from '../../domain/objects/DeclaredStripeInvoiceItem';
import { delInvoiceItem } from './delInvoiceItem';
import { getInvoiceItems } from './getInvoiceItems';
import { setInvoiceItem } from './setInvoiceItem';

const oneByOne = new Bottleneck({ maxConcurrent: 1 });

/**
 * .what = sets the items on the invoice to exactly equal the given items
 * .what.intent
 *   - insert items which dont exist
 *   - update items which changed
 *   - delete items which were removed
 */
export const setInvoiceItems = async (
  input: {
    to: {
      invoiceRef: DeclaredStripeInvoiceItem['invoiceRef'];
    };
    items: DeclaredStripeInvoiceItem[];
  },
  context: StripeApiContext & VisualogicContext,
) => {
  // sanity check that all the items are for the same invoice
  // todo

  // get the current items
  const itemsFound = await getInvoiceItems(
    {
      by: { invoice: { by: { ref: input.to.invoiceRef } } },
    },
    context,
  );

  // determine which items need to be deleted
  const getComparableUniqueIdentifier = (item: DeclaredStripeInvoiceItem) =>
    serialize(
      pick(item, [
        'exid',
        // 'invoiceRef'; // note: we omit the invoice ref, since it could be in either unique or primary form and would cause false positives; however, we already know that the invoice refs are all the same in this case, so we can skip it
      ]),
    );
  const itemsDesiredUniqueIdentifiers = input.items.map(
    getComparableUniqueIdentifier,
  );
  const itemsToDelete = itemsFound.filter(
    (itemFound) =>
      !itemsDesiredUniqueIdentifiers.includes(
        getComparableUniqueIdentifier(itemFound),
      ),
  );

  // delete the items that should no longer be on there
  await Promise.all(
    itemsToDelete.map(
      async (itemToDelete) =>
        await delInvoiceItem({ by: { ref: itemToDelete } }, context),
    ),
  );

  // now set all of the desired ones
  await Promise.all(
    input.items.map((item) =>
      // run one by one to guarantee sort order // todo: is there a declarative way to do this?
      oneByOne.schedule(async () => setInvoiceItem({ upsert: item }, context)),
    ),
  );
};
