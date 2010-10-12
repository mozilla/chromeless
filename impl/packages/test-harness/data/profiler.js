function doProfiling() {
  var namedObjects = getNamedObjects();
  var graph = {};
  var rejectedTypes = {};
  var INTERESTING_TYPES = [
    'Object', 'Function', 'Call', 'Window', 'Array', 'RegExp',
    'Block', 'Date', 'String', 'StopIteration', 'Iterator',
    'Error', 'Math', 'JSON', 'Boolean', 'With', 'Number',
    'XML', 'Script', 'CanvasRenderingContext2D',
    'PageTransitionEvent', 'MouseEvent',
    'Location', 'Navigator', 'Generator', 'XPCNativeWrapper',
    'XPCSafeJSObjectWrapper', 'XPCCrossOriginWrapper'
  ];
  var interestingTypes = {};
  INTERESTING_TYPES.forEach(
    function(name) { interestingTypes[name] = true; }
  );

  var shapes = {};
  var maxShapeId = 0;
  var windows = {};
  var totalObjectCount = 0;
  var totalObjectClasses = {};

  for (name in namedObjects) {
    var id = namedObjects[name];
    var info = getObjectInfo(id);
    while (info.wrappedObject) {
      id = info.wrappedObject;
      info = getObjectInfo(info.wrappedObject);
    }
    if (info.innerObject)
      id = info.innerObject;
    namedObjects[name] = id;
    windows[id] = true;
  }

  var table = getObjectTable();
  for (id in table) {
    totalObjectCount++;
    var nativeClass = table[id];

    var classBin = nativeClass;
    if (nativeClass == "Function") {
      var funcInfo = getObjectInfo(parseInt(id));
      if (funcInfo.name)
        classBin += ":" + funcInfo.name + "@" + funcInfo.filename;
    }

    if (classBin in totalObjectClasses)
      totalObjectClasses[classBin]++;
    else
      totalObjectClasses[classBin] = 1;

    if ((nativeClass in interestingTypes) ||
      (nativeClass.indexOf('HTML') == 0) ||
        (nativeClass.indexOf('DOM') == 0) ||
        (nativeClass.indexOf('XPC_WN_') == 0)) {
      var intId = parseInt(id);
      if (intId in windows)
        graph[id] = getObjectInfo(intId);
      else {
        var parent = getObjectParent(intId);
        while (parent) {
          if (parent in windows) {
            graph[id] = getObjectInfo(intId);
            break;
          }
          parent = getObjectParent(parent);
        }
      }
    } else {
      if (!(nativeClass in rejectedTypes))
        rejectedTypes[nativeClass] = true;
    }
  }

  for (id in graph) {
    var info = graph[id];
    if (info.parent in windows && info.nativeClass == "Object") {
      var props = getObjectProperties(parseInt(id));
      props = [name for (name in props)];
      // TODO: If there's a comma in the property name,
      // we can get weird results here, though it's
      // unlikely.
      props = props.join(",");
      if (!(props in shapes)) {
        shapes[props] = maxShapeId;
        maxShapeId++;
      }
      info['shape'] = shapes[props];
    }
  }

  var shapesArray = [];
  for (name in shapes)
    shapesArray[shapes[name]] = name;

  var rejectedList = [];
  for (name in rejectedTypes)
    rejectedList.push(name);
  return {namedObjects: namedObjects,
          totalObjectCount: totalObjectCount,
          totalObjectClasses: totalObjectClasses,
          graph: graph,
          shapes: shapesArray,
          rejectedTypes: rejectedList};
}

// This function uses the Python-inspired traceback functionality of the
// profiling runtime to return a stack trace that looks much like Python's.
function getTraceback(frame) {
  var lines = [];
  if (frame === undefined)
    frame = stack();
  while (frame) {
    var line = ('  File "' + frame.filename + '", line ' +
                frame.lineNo + ', in ' + frame.functionName);
    lines.splice(0, 0, line);
    frame = frame.caller;
  }
  lines.splice(0, 0, "Traceback (most recent call last):");
  return lines.join('\n');
}

(function() {
   var result;
   try {
     result = {success: true,
               data: doProfiling()};
   } catch (e) {
     result = {success: false,
               traceback: getTraceback(lastExceptionTraceback),
               error: String(e)};
   }
   return JSON.stringify(result);
 })();
