import { Price } from 'domain-glossary-price';
import { DomainEntity, DomainLiteral } from 'domain-objects';

/**
 * .what = a declarative structure which represents a Stripe Product
 *
 * note
 * - these are required in order to define price
 *
 * ref
 * - https://docs.stripe.com/api/invoiceitems
 */
export interface DeclaredStripeProduct {
  /**
   * the public stripe id of this entity
   *
   * note
   * - you should choose this id upon creation, but ensure it is unique across all products in your Stripe account
   */
  id: string;

  /**
   * The product’s name, meant to be displayable to the customer.
   */
  name: string;

  /**
   * Whether the product is currently available for purchase.
   */
  active: boolean;

  /**
   * The product’s description, meant to be displayable to the customer.
   *
   * note
   * - Use this field to optionally store a long form explanation of the product being sold for your own rendering purposes.
   */
  description: null | string;

  /**
   * a url which publically identifies this product
   */
  url: null | string;

  /**
   * the default price of the product
   */
  price: Price;

  /**
   * metadata about the item which can be used to crossreference information, if any
   */
  metadata: null | Omit<Record<string, string>, 'exid'>;
}
export class DeclaredStripeProduct
  extends DomainEntity<DeclaredStripeProduct>
  implements DeclaredStripeProduct
{
  public static primary = ['id'] as const;
  public static unique = ['id'] as const;
  public static nested = {
    metadata: DomainLiteral,
  };
}
