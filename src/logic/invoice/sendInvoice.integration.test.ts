import { given, then, when } from 'test-fns';

describe('sendInvoice', () => {
  given('a drafted invoice', () => {
    when('we request to charge', () => {
      then.todo(
        'it should throw a bad request error',
        { because: 'the invoice has not been issued yet' },
        () => {},
      );
    });
  });
  given('an issued invoice', () => {
    when('we request to send', () => {
      then.todo('it should succeed');
    });
  });

  given('a paid invoice', () => {
    when('we request to charge', () => {
      then.todo(
        'it should throw a bad request error',
        {
          because: 'the invoice is already in a terminal state',
        },
        () => {},
      );
    });
  });

  given('a voided invoice', () => {
    when('we request to charge', () => {
      then.todo(
        'it should throw a bad request error',
        {
          because: 'the invoice is already in a terminal state',
        },
        () => {},
      );
    });
  });
});
