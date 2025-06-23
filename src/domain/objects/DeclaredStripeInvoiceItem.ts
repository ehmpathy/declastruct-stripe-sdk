import { DomainEntity, DomainLiteral, Ref } from 'domain-objects';

import { DeclaredStripeDiscountCoupon } from './DeclaredStripeDiscountCoupon';
import { DeclaredStripeInvoice } from './DeclaredStripeInvoice';
import { DeclaredStripeProduct } from './DeclaredStripeProduct';

/**
 * .what = a declarative structure which represents a Stripe Invoice Item
 *
 * ref
 * - https://docs.stripe.com/api/invoiceitems
 */
export interface DeclaredStripeInvoiceItem {
  /**
   * the public stripe id of this invoice item
   */
  id?: string;

  /**
   * an external identifier which uniquely references this item, per customer
   *
   * note
   * - this exid is persisted via the metadata of the item
   */
  exid: string;

  /**
   * the invoice this item should be assigned to
   */
  invoiceRef: Ref<typeof DeclaredStripeInvoice>;

  /**
   * the product of the item, which contains the price of the item
   */
  productRef: Ref<typeof DeclaredStripeProduct>;

  /**
   * the discounts to apply, if any
   */
  discounts: null | DeclaredStripeDiscountCoupon[];

  /**
   * metadata about the item which can be used to crossreference information, if any
   */
  metadata: null | Omit<Record<string, string>, 'exid'>;

  /**
   * a description of the item used to display to consumers, if set
   */
  description: null | string;
}
export class DeclaredStripeInvoiceItem
  extends DomainEntity<DeclaredStripeInvoiceItem>
  implements DeclaredStripeInvoiceItem
{
  public static primary = ['id'] as const;
  public static unique = ['invoiceRef', 'exid'] as const;
  public static nested = {
    metadata: DomainLiteral,
  };
}
