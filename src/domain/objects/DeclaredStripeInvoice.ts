import { UniDate } from '@ehmpathy/uni-time';
import { Price } from 'domain-glossary-price';
import { DomainEntity, DomainLiteral, Ref } from 'domain-objects';
import { Literalize } from 'type-fns';

import { DeclaredStripeCustomer } from './DeclaredStripeCustomer';

export enum DeclaredStripeInvoiceStatus {
  draft = 'draft',
  open = 'open',
  paid = 'paid',
  uncollectible = 'uncollectible',
  void = 'void',
}

/**
 * declares the configuration that will be used for collecting payment for the invoice
 */
export interface DeclaredStripeInvoiceCollectionConfig {
  /**
   * declares whether or not the invoice will have "automatic collection" performed for it
   *
   * specifically
   * - if .autoAdvance=true, when the invoice is issued, stripe will attempt to charge the customer automatically
   * - if .autoAdvance=false, when the invoice is issued, stripe wont do anything - leaving it up to you when to charge
   *
   * note
   * - you can leave .autoAdvance=false until you are ready for stripe to begin charging, and update it at that time instead
   *
   * ref
   * - https://docs.stripe.com/invoicing/integration/automatic-advancement-collection
   */
  autoAdvance: boolean;

  /**
   * declares how payment will be collected
   *
   * specifically
   * - `charge_automatically` to charge the card the customer has on file programmatically
   *    - if autoAdvance=true, then stripe will decide when to charge on its own (typically, as soon as its finalized)
   *    - if autoAdvance=false, then stripe will wait for you to call .pay OR to change .autoAdvance=true
   * - `send_invoice` to send the customer an email with instructions
   */
  collectionMethod: 'charge_automatically' | 'send_invoice';
}

/**
 * .what = a declarative structure which represents a Stripe Invoice
 */
export interface DeclaredStripeInvoice {
  /**
   * the public stripe invoice id of this invoice
   */
  id?: string;

  /**
   * an external identifier which uniquely references this invoice, per customer
   *
   * note
   * - this exid is persisted via the metadata of the invoice
   */
  exid: string;

  /**
   * the customer to whom the invoice is intended
   */
  customerRef: Ref<typeof DeclaredStripeCustomer>;

  /**
   * the status of the invoice
   */
  status: Literalize<DeclaredStripeInvoiceStatus>;

  /**
   * the total of the invoice, after discounts and taxes.
   */
  totalBillable: Price;

  /**
   * the date that the invoice is due, if specified
   */
  dueDate: null | UniDate;

  /**
   * the config used to collect payment for the invoice
   */
  config: DeclaredStripeInvoiceCollectionConfig;

  /**
   * metadata about the invoice which can be used to crossreference information, if any
   */
  metadata: null | Omit<Record<string, string>, 'exid'>;

  /**
   * a description of the invoice, if set
   */
  description: null | string;

  /**
   * the url via which the invoice can be accessed by customers
   *
   * note
   * - this will be null until the invoice is 'finalized' (i.e,. status = open)
   */
  portalUrl: null | string;

  /**
   * the url via which a pdf of the invoice can be accessed by customers
   *
   * note
   * - this will be null until the invoice is 'finalized' (i.e,. status = open)
   */
  pdfUrl: null | string;

  /**
   * the latest charge for the invoice, if any
   */
  chargeId: null | string;
}
export class DeclaredStripeInvoice
  extends DomainEntity<DeclaredStripeInvoice>
  implements DeclaredStripeInvoice
{
  public static primary = ['id'] as const;
  public static unique = ['customerRef', 'exid'] as const;
  public static nested = {
    customerRef: DomainLiteral,
    metadata: DomainLiteral,
    config: DomainLiteral,
  };
}
