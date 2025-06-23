import { Price } from 'domain-glossary-price';
import { DomainEntity, DomainLiteral } from 'domain-objects';

/**
 * .what = a declarative structure which represents a Stripe Coupon
 *
 * ref
 * - https://docs.stripe.com/api/coupons/object
 */
export interface DeclaredStripeDiscountCoupon {
  /**
   * the public stripe id of this entity
   */
  id?: string;

  /**
   * The coupon’s name, meant to be displayable to the customer.
   *
   * note
   * - this is displayed on invoices && receipts
   */
  name: null | string;

  /**
   * the price to discount, if an absolute number
   *
   * note
   * - either amountOff or percentOff must be specified
   */
  amountOff: null | Price;

  /**
   * the percent to discount, if a relative number
   *
   * note
   * - either amountOff or percentOff must be specified
   */
  percentOff: null | number;

  /**
   * how long this discount will apply
   */
  duration: 'once' | 'forever' | { choice: 'repeating'; months: number };

  /**
   * metadata about the item which can be used to crossreference information, if any
   */
  metadata: null | Record<string, string>;
}
export class DeclaredStripeDiscountCoupon
  extends DomainEntity<DeclaredStripeDiscountCoupon>
  implements DeclaredStripeDiscountCoupon
{
  public static primary = ['id'] as const;
  // public static unique = [] as const; // ?: really, stripe? there's no alternate key we can list coupons by?
  public static nested = {
    metadata: DomainLiteral,
  };
}
