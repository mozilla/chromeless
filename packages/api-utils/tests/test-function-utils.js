const { invoke, Enqueued } = require('utils/function');

exports['test forwardApply'] = function(test) {
  function sum(b, c) this.a + b + c
  test.assertEqual(invoke(sum, [2, 3], { a: 1 }), 6,
                   'passed arguments and pseoude-variable are used');
  test.assertEqual(invoke(sum.bind({ a: 2 }), [2, 3], { a: 1 }), 7,
                   'bounded `this` pseoudo variable is used')
}

exports['test enqueued function'] = function(test) {
  test.waitUntilDone();
  let nextTurn = false;
  function sum(b, c) {
    test.assert(nextTurn, 'enqueued is called in next turn of event loop');
    test.assertEqual(this.a + b + c, 6,
                     'passed arguments an pseoude-variable are used');
    test.done();
  }
  let fixture = { a: 1, method: Enqueued(sum) }
  fixture.method(2, 3);
  nextTurn = true;
}
