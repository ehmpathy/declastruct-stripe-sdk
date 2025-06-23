import { UnexpectedCodePathError } from 'helpful-errors';
import { ProcedureInput } from 'visualogic';

import { getStripe } from '../logic/auth/getStripe';

export const getStripeCredentials = (): ProcedureInput<typeof getStripe> => {
  return {
    stripe: {
      api: {
        secretKey:
          process.env.PREP_STRIPE_SECRET_KEY ??
          UnexpectedCodePathError.throw(
            'env.PREP_STRIPE_SECRET_KEY was not declared',
          ),
      },
    },
  };
};
