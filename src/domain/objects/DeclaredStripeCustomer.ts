import { DomainEntity, DomainLiteral } from 'domain-objects';

/**
 * .what = a declarative structure which represents a Stripe Customer
 */
export interface DeclaredStripeCustomer {
  /**
   * the public stripe customer id of this customer
   */
  id?: string;

  /**
   * the email address of the customer
   *
   * note
   * - stripe does not enforce this to be a unique key
   * - however, to create a pit-of-success, this is used as the unique key with declastruct, since it is the only non-id field that we can search on
   */
  email: string;

  /**
   * then name of the customer, if set
   */
  name: null | string;

  /**
   * a description of the customer, if set
   */
  description: null | string;

  /**
   * then phone of the customer, if set
   */
  phone: null | string;

  /**
   * metadata that the customer was tagged with
   */
  metadata: null | Record<string, string>;
}

export class DeclaredStripeCustomer
  extends DomainEntity<DeclaredStripeCustomer>
  implements DeclaredStripeCustomer
{
  public static primary = ['id'] as const;
  public static unique = ['email'] as const;
  public static nested = {
    metadata: DomainLiteral,
  };
}
