// Parts of this module were taken from narwhal:
//
// http://narwhaljs.org

var observers = [];
var unloaders = [];

var when = exports.when = function when(observer) {
  observers.unshift(observer);
};

var send = exports.send = function send(reason) {
  observers.forEach(function (observer) {
    observer(reason);
  });
};

var addMethod = exports.addMethod = function addMethod(obj, unloader) {
  var called = false;

  function unloadWrapper(reason) {
    if (!called) {
      called = true;
      var index = unloaders.indexOf(unloadWrapper);
      if (index == -1)
        throw new Error("internal error: unloader not found");
      unloaders.splice(index, 1);
      unloader.apply(obj, [reason]);
    }
  };

  unloaders.push(unloadWrapper);
  obj.unload = unloadWrapper;
};

var ensure = exports.ensure = function ensure(obj) {
  if (!("unload" in obj))
    throw new Error("object has no 'unload' property");

  addMethod(obj, obj.unload);
};

when(
  function(reason) {
    unloaders.slice().forEach(
      function(unloadWrapper) {
        unloadWrapper(reason);
      });
  });
