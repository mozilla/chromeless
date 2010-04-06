/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#include "jsdhash.h"

#include "tcb.h"
#include "memory_profiler.h"
#include "server_socket.h"

// **********************************************************************
// Class Declarations
// **********************************************************************

// Structure to track information with when tracing GC roots.
struct RootMapStruct {
  JSBool rval;
  int length;
  JSContext *cx;
  JSObject *array;
};

// A class that encapsulates the profiler's JS runtime and
// associated data.
class ProfilerRuntime {
private:
  // Disallow copy constructors and assignment.
  ProfilerRuntime(const ProfilerRuntime&);
  ProfilerRuntime& operator= (const ProfilerRuntime&);

public:
  // JS runtime for our profiler.
  JSRuntime *rt;

  // JS context for any code that runs.
  JSContext *cx;

  // Global object for any code that runs.
  JSObject *global;

  // The runtime's global functions.
  static JSFunctionSpec globalFunctions[];

  ProfilerRuntime(void);
  ~ProfilerRuntime();
  JSBool init(void);
};

// A class to 'mirror' strings in the target runtime as external strings
// in the profiling runtime. This allows us both to conserve memory and
// save time by not needlessly copying strings, and it also allows us
// to figure out how much space is being taken up by strings.
class ExtStringManager {
private:
  // Hashtable entry subclass mapping external strings (in the target
  // runtime) to profiler runtime strings.
  struct StringHashEntry {
    // base.key points to a JSString * in the target runtime.
    JSDHashEntryStub base;

    // Mirrored string in profiler runtime.
    JSString *string;

    // Numeric ID for mirrored string.
    int index;
  };

  // Disallow copy constructors and assignment.
  ExtStringManager(const ExtStringManager&);
  ExtStringManager& operator= (const ExtStringManager&);

  // Memory profiling runtime.
  ProfilerRuntime *profiler;

  // A hash table mapping strings in the external (target) runtime to
  // their 'mirrors' in the profiling runtime.
  JSDHashTable strings;

  // A rooted JavaScript Array that contains all the mirrored strings
  // in the profiling runtime, so we don't need to deal with GC'ing
  // them until we shut down the profiling runtime.
  JSObject *strArray;

  // Length of the mirrored string array.
  int strArrayLen;

  // Type index for our custom external string type.
  intN type;

  // The finalizer for our custom external string type.
  static void finalizeExtString(JSContext *cx, JSString *str) {
    // We've set things up so that this won't get called until
    // the memory profiling runtime is about to be shut down.
    // Since this 'external' string actually points to strings
    // owned by the target runtime, we do nothing here.
  }

public:
  ExtStringManager(void);
  ~ExtStringManager();

  // Converts a string from the target runtime to an 'external' string
  // in the profiling runtime, returning NULL on failure.
  JSString *getExt(JSString *extString);

  // Initializes the string manager. If it returns JS_FALSE, an
  // exception will be pending on the context.
  JSBool init(ProfilerRuntime *aProfiler);
};

class ExtObjectManager {
private:
  // Hashtable entry subclass mapping JSObject * in the target runtime
  // to numeric IDs in the profiling runtime.
  struct ObjectHashEntry {
    // base.key is a JSObject * in the target runtime.
    JSDHashEntryStub base;

    // Numeric ID of the object in the profiling runtime.
    unsigned int id;
  };

  // JSTracer subclass that includes additional properties used when
  // tracing objects in the target runtime.
  struct ProfilerTracer {
    JSTracer base;
    ExtObjectManager *self;
    JSBool result;

    // These are used only when using the childBuilder tracer.
    int numObjects;
    JSObject *objects;

    ProfilerTracer(ExtObjectManager *parent) :
      self(parent),
      result(JS_TRUE),
      numObjects(0),
      objects(NULL)
      {
        base.context = parent->targetCx;
      }
  };

  // Disallow copy constructors and assignment.
  ExtObjectManager(const ExtObjectManager&);
  ExtObjectManager& operator= (const ExtObjectManager&);

  // C array that maps from object IDs to JSObject *'s in the runtime
  // that we're profiling.
  JSObject **ids;

  // The latest object ID that we've assigned while tracing the
  // objects in the runtime we're profiling.
  unsigned int currId;

  // Keeps track of what objects we've visited so far while tracing
  // the objects in the runtime we're profiling.
  JSDHashTable visited;

  // JSContext of the target runtime.
  JSContext *targetCx;

  // JSContext of the profiling runtime.
  JSContext *cx;

  // External strings in the target runtime mirrored to the profiling
  // runtime.
  ExtStringManager *strings;

  // Adds properties to the given info object containing information
  // about the object's children (in the JS heap) in the target
  // runtime.
  JSBool getChildrenInfo(JSObject *info, JSObject *target);

  // Adds properties to the given info object containing
  // information about the given function in the target runtime.
  JSBool getFunctionInfo(JSObject *info, JSObject *target);

  // If obj is a non-NULL object in the target runtime, adds a
  // property with the given name to the given info object whose value
  // is the object ID of the target object.
  JSBool maybeIncludeObject(JSObject *info, const char *objName,
                            JSObject *obj);

  // If objOp is non-NULL, adds a property with the given name
  // to the given info object whose value is the object ID of
  // the objOp applied to the given target object.
  JSBool maybeIncludeObjectOp(JSObject *info, const char *objName,
                              JSObjectOp objOp, JSObject *target);

  // Attempts to look up a named object in the target runtime with the
  // given name, placing its object ID in rid if it's found.
  JSBool lookupNamedObject(const char *name, uint32 *rid);

  // JSTraceCallback to build a hashtable of existing object references.
  static void visitedBuilder(JSTracer *trc, void *thing, uint32 kind);

  // JSTraceCallback to build object children.
  static void childBuilder(JSTracer *trc, void *thing, uint32 kind);

  // JSDHashEnumerator that maps each JSObject * in the target runtime
  // to a numeric object ID in the profiling runtime.
  static JSDHashOperator mapObjectsToIds(JSDHashTable *table,
                                         JSDHashEntryHdr *hdr,
                                         uint32 number,
                                         void *arg);

public:
  ExtObjectManager(void);
  ~ExtObjectManager();

  // Initialize the object manager. Must be called before using
  // any other methods.
  JSBool init(ProfilerRuntime *aprofiler,
              ExtStringManager *astrings,
              JSContext *atargetCx,
              JSObject *anamedTargetObjects);

  // Copy information about the given property (name or ID) on the
  // given object in the target runtime, and assign it to a property
  // with the same name on propInfo in the profiling runtime. If the
  // property is a primitive value or string, its value is
  // copied/mirrored; if it's a JSObject *, its value is set to the
  // object's numeric object ID in the profiling runtime.
  JSBool copyPropertyInfo(JSObject *propInfo, jsid targetPropId,
                          const char *name, JSObject *target);

  // Uses JS_Enumerate to put information about all the
  // target runtime object's properties on propInfo.
  JSBool getPropertiesInfo(JSObject *propInfo, JSObject *target);

  // Uses JS_NewPropertyIterator to put information about all the
  // target runtime object's properties on propInfo.
  JSBool getPropertiesInfo2(JSObject *propInfo, JSObject *target);

  // Returns, into rval, a memory profiling runtime JSObject * mapping
  // object IDs to their native JSClass names. rval is assumed to be
  // rooted.
  JSBool getTargetTable(jsval *rval);

  // Mapping from strings to objects for the profiler's convenience.
  // This object is owned by the target runtime.
  JSObject *namedTargetObjects;

  // Create a 'dictionary' of information about the target object
  // and put it in rval. rval is assumed to be rooted.
  JSBool getInfoForTarget(JSObject *target, jsval *rval);

  // Given a named object string or an object ID at the front of argv,
  // get the object in the JS runtime we're profiling and put it in
  // rtarget. If it doesn't exist, put NULL in rtarget. If an error
  // occurs, return JS_FALSE.
  JSBool getTarget(uintN argc, jsval *argv, JSObject **rtarget);

  // Given a JSObject * in the target runtime, return the small
  // positive integer ID mapping to it, or 0 if no such object exists.
  uint32 lookupIdForTarget(JSObject *target);

  // Given a small positive integer ID, return the JSObject * mapping to
  // it, or NULL if no such object exists. The JSObject * is property
  // of the target runtime.
  JSObject *lookupTargetForId(uint32 id);
};

// A class that encapsulates the entire state of the memory profiler.
class MemoryProfiler {
private:
  // Disallow copy constructors and assignment.
  MemoryProfiler(const MemoryProfiler&);
  MemoryProfiler& operator= (const MemoryProfiler&);

public:
  MemoryProfiler();
  ~MemoryProfiler();

  // JS context of the target JS runtime that called us.
  JSContext *targetCx;

  // JS runtime that we're profiling (and which called us).
  JSRuntime *targetRt;

  // The order in which these are listed is the order in which their
  // constructors are called, and the reverse order in which their
  // destructors are called.
  ProfilerRuntime runtime;
  ExtStringManager strings;
  ExtObjectManager objects;

  // Return the profiler instance associated with the given profiler
  // JS context.
  static MemoryProfiler *get(JSContext *cx) {
    return (MemoryProfiler *) JS_GetContextPrivate(cx);
  }

  // Run a profiling script.
  JSBool profile(JSContext *cx, JSString *code, const char *filename,
                 uint32 lineNumber, JSObject *namedObjects,
                 JSString *argument, jsval *rval);
};

// **********************************************************************
// Method Definitions
// **********************************************************************

void ExtObjectManager::childBuilder(JSTracer *trc, void *thing,
                                    uint32 kind)
{
  ProfilerTracer *tracer = (ProfilerTracer *) trc;

  if (kind == JSTRACE_OBJECT) {
    if (!tracer->result)
      return;

    uint32 id = tracer->self->lookupIdForTarget((JSObject *) thing);

    if (!JS_DefineElement(trc->context,
                          tracer->objects,
                          tracer->numObjects,
                          INT_TO_JSVAL(id),
                          NULL, NULL, JSPROP_ENUMERATE))
      tracer->result = JS_FALSE;
    else
      tracer->numObjects++;
  }
}

void ExtObjectManager::visitedBuilder(JSTracer *trc, void *thing,
                                      uint32 kind)
{
  ProfilerTracer *tracer = (ProfilerTracer *) trc;
  ObjectHashEntry *entry;

  if (!tracer->result)
    return;

  switch (kind) {
  case JSTRACE_OBJECT:
    entry = (ObjectHashEntry *)
      JS_DHashTableOperate(&tracer->self->visited,
                           thing,
                           JS_DHASH_LOOKUP);
    if (JS_DHASH_ENTRY_IS_FREE((JSDHashEntryHdr *)entry)) {
      entry = (ObjectHashEntry *) JS_DHashTableOperate(
        &tracer->self->visited,
        thing,
        JS_DHASH_ADD
        );
      if (entry == NULL) {
        JS_ReportOutOfMemory(trc->context);
        tracer->result = JS_FALSE;
        return;
      }
      entry->base.key = thing;
      entry->id = tracer->self->currId++;
      JS_TraceChildren(trc, thing, kind);
    }
    break;
  case JSTRACE_DOUBLE:
    break;
  case JSTRACE_STRING:
    break;
  }
}

JSObject *ExtObjectManager::lookupTargetForId(uint32 id)
{
  if (id > 0 && id < currId)
    return ids[id];
  return NULL;
}

uint32 ExtObjectManager::lookupIdForTarget(JSObject *target)
{
  ObjectHashEntry *entry;
  entry = (ObjectHashEntry *)
    JS_DHashTableOperate(&visited,
                         target,
                         JS_DHASH_LOOKUP);
  
  if (entry == NULL)
    return 0;

  if (JS_DHASH_ENTRY_IS_BUSY((JSDHashEntryHdr *)entry))
    return entry->id;
  else
    return 0;
}

ExtObjectManager::ExtObjectManager(void) :
  ids(NULL),
  currId(1),
  targetCx(NULL),
  cx(NULL),
  strings(NULL),
  namedTargetObjects(NULL)
{
  visited.ops = NULL;
}

ExtObjectManager::~ExtObjectManager()
{
  if (ids) {
    PR_Free(ids);
    ids = NULL;
  }

  if (visited.ops) {
    JS_DHashTableFinish(&visited);
    visited.ops = NULL;
  }

  cx = NULL;
  targetCx = NULL;
  strings = NULL;
  namedTargetObjects = NULL;
}

JSDHashOperator ExtObjectManager::mapObjectsToIds(JSDHashTable *table,
                                                  JSDHashEntryHdr *hdr,
                                                  uint32 number,
                                                  void *arg)
{
  ExtObjectManager *self = (ExtObjectManager *) arg;
  ObjectHashEntry *entry = (ObjectHashEntry *) hdr;
  self->ids[entry->id] = (JSObject *) entry->base.key;
  return JS_DHASH_NEXT;
}

JSBool ExtObjectManager::init(ProfilerRuntime *aprofiler,
                              ExtStringManager *astrings,
                              JSContext *atargetCx,
                              JSObject *anamedTargetObjects)
{
  if (cx) {
    JS_ReportError(atargetCx, "ExtObjectManager already inited");
    return JS_FALSE;
  }

  cx = aprofiler->cx;
  strings = astrings;
  targetCx = atargetCx;
  namedTargetObjects = anamedTargetObjects;

  if (!JS_DHashTableInit(&visited, JS_DHashGetStubOps(),
                         NULL, sizeof(ObjectHashEntry),
                         JS_DHASH_DEFAULT_CAPACITY(100))) {
    JS_ReportOutOfMemory(targetCx);
    return JS_FALSE;
  }

  ProfilerTracer tracer(this);

  tracer.base.callback = visitedBuilder;
  JS_TraceRuntime(&tracer.base);

  if (!tracer.result)
    return JS_FALSE;

  ids = (JSObject **)PR_Malloc((currId) * sizeof(JSObject *));
  if (ids == NULL) {
    JS_ReportOutOfMemory(targetCx);
    return JS_FALSE;
  }
  ids[0] = NULL;
  JS_DHashTableEnumerate(&visited,
                         mapObjectsToIds,
                         this);

  return JS_TRUE;
}

JSBool ExtObjectManager::getChildrenInfo(JSObject *info, JSObject *target)
{
  ProfilerTracer tracer(this);

  tracer.base.callback = childBuilder;

  JSObject *objects = JS_NewArrayObject(cx, 0, NULL);
  if (!objects) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  tracer.objects = objects;
  JS_TraceChildren(&tracer.base, target, JSTRACE_OBJECT);

  if (!(tracer.result &&
        JS_SetArrayLength(cx, objects, tracer.numObjects)))
    return JS_FALSE;

  return JS_DefineProperty(cx, info, "children", OBJECT_TO_JSVAL(objects),
                           NULL, NULL, JSPROP_ENUMERATE);
}

JSBool ExtObjectManager::getFunctionInfo(JSObject *info, JSObject *target)
{
  // Thanks to dbaron's leakmon code for this:
  //
  // http://hg.mozilla.org/users/dbaron_mozilla.com/leak-monitor/file/88274af9f629/src/leakmonJSObjectInfo.cpp#l208

  JSFunction *fun = JS_ValueToFunction(
    targetCx,
    OBJECT_TO_JSVAL(target)
    );
  if (fun == NULL) {
    JS_ReportError(cx, "JS_ValueToFunction() failed.");
    return JS_FALSE;
  }

  if (!JS_DefineProperty(
        cx, info, "functionSize",
        INT_TO_JSVAL(JS_GetFunctionTotalSize(targetCx, fun)),
        NULL, NULL, JSPROP_ENUMERATE)) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  JSScript *script = JS_GetFunctionScript(targetCx, fun);
  // script is null for native code.      
  if (script) {
    jsval name = JSVAL_NULL;

    JSString *targetFuncName = JS_GetFunctionId(fun);
    if (targetFuncName) {
      JSString *funcName = strings->getExt(targetFuncName);
      if (!funcName) {
        JS_ReportOutOfMemory(cx);
        return JS_FALSE;
      }
      name = STRING_TO_JSVAL(funcName);
    }

    if (!JS_DefineProperty(
          cx, info, "scriptSize",
          INT_TO_JSVAL(JS_GetScriptTotalSize(targetCx, script)),
          NULL, NULL, JSPROP_ENUMERATE)) {
      JS_ReportOutOfMemory(cx);
      return JS_FALSE;
    }

    JSString *filename = JS_NewStringCopyZ(
      cx,
      JS_GetScriptFilename(targetCx, script)
      );
    uintN lineStart = JS_GetScriptBaseLineNumber(targetCx, script);
    uintN lineEnd = (lineStart +
                     JS_GetScriptLineExtent(targetCx, script) - 1);
    if (!JS_DefineProperty(cx, info, "name", name,
                           NULL, NULL, JSPROP_ENUMERATE) ||
        !JS_DefineProperty(cx, info, "filename",
                           STRING_TO_JSVAL(filename),
                           NULL, NULL, JSPROP_ENUMERATE) ||
        !JS_DefineProperty(cx, info, "lineStart",
                           INT_TO_JSVAL(lineStart),
                           NULL, NULL, JSPROP_ENUMERATE) ||
        !JS_DefineProperty(cx, info, "lineEnd",
                           INT_TO_JSVAL(lineEnd),
                           NULL, NULL, JSPROP_ENUMERATE))
      return JS_FALSE;
  }
  return JS_TRUE;
}

JSBool ExtObjectManager::copyPropertyInfo(JSObject *propInfo,
                                          jsid targetPropId,
                                          const char *name,
                                          JSObject *target)
{
  jsval value;
  if (name == NULL) {
    JSObject *valueObj;
    if (!JS_LookupPropertyWithFlagsById(
          targetCx,
          target,
          targetPropId,
          JSRESOLVE_DETECTING,
          &valueObj,
          &value)) {
      JS_ReportError(cx, "JS_LookupPropertyWithFlagsById() failed.");
      return JS_FALSE;
    }
  } else {
    if (!JS_LookupPropertyWithFlags(
          targetCx,
          target,
          name,
          JSRESOLVE_DETECTING,
          &value)) {
      JS_ReportError(cx, "JS_LookupPropertyWithFlags() failed.");
      return JS_FALSE;
    }
  }

  if (JSVAL_IS_OBJECT(value)) {
    JSObject *valueObj = JSVAL_TO_OBJECT(value);
    value = INT_TO_JSVAL(lookupIdForTarget(valueObj));
  } else if (JSVAL_IS_STRING(value)) {
    JSString *valueStr = strings->getExt(JSVAL_TO_STRING(value));
    if (valueStr == NULL) {
      JS_ReportOutOfMemory(cx);
      return JS_FALSE;
    }
    value = STRING_TO_JSVAL(valueStr);
  } else
    value = JSVAL_NULL;

  if (name == NULL) {
    if (!JS_DefinePropertyById(
          cx, propInfo,
          // TODO: Is it OK to use this ID from a different JSRuntime?
          targetPropId,
          value,
          NULL,
          NULL,
          JSPROP_ENUMERATE))
      return JS_FALSE;
  } else {
    if (!JS_DefineProperty(
          cx, propInfo,
          name,
          value,
          NULL,
          NULL,
          JSPROP_ENUMERATE))
      return JS_FALSE;
  }

  return JS_TRUE;
}

JSBool ExtObjectManager::getPropertiesInfo(JSObject *propInfo,
                                           JSObject *target)
{
  // TODO: It'd be nice if we could use the OBJ_IS_NATIVE() macro here,
  // but that appears to be defined in a private header, jsobj.h. Still,
  // leakmon uses it, so it might be OK if we do too:
  //
  // http://hg.mozilla.org/users/dbaron_mozilla.com/leak-monitor/file/88274af9f629/src/leakmonJSObjectInfo.cpp#l208
  //
  // It looks like JS_NewPropertyIterator() solves this issue and that
  // we should use it, but I keep getting an assertion in JS_NextProperty()
  // at "JS_ASSERT(scope->object == obj)" when doing this.

  JSBool success = JS_TRUE;
  JSIdArray *ids = JS_Enumerate(targetCx, target);
  if (ids == NULL)
    return JS_TRUE;

  for (int i = 0; i < ids->length; i++) {
    if (!copyPropertyInfo(propInfo,
                          ids->vector[i], NULL, target)) {
      success = JS_FALSE;
      break;
    }
  }

  JS_DestroyIdArray(targetCx, ids);

  return success;
}

JSBool ExtObjectManager::getPropertiesInfo2(JSObject *propInfo,
                                            JSObject *target)
{
  JSObject *iterator = JS_NewPropertyIterator(targetCx, target);
  if (iterator == NULL)
    return JS_TRUE;

  jsid iterId;
  while (1) {
    if (!JS_NextProperty(targetCx, iterator, &iterId)) {
      JS_ReportError(cx, "Iterating to next property failed.");
      return JS_FALSE;
    }
    if (iterId == JSVAL_VOID)
      break;

    if (!copyPropertyInfo(propInfo, iterId, NULL, target))
      return JS_FALSE;
  }

  return JS_TRUE;
}

JSBool ExtObjectManager::maybeIncludeObject(JSObject *info,
                                            const char *objName,
                                            JSObject *obj)
{
  if (obj != NULL)
    if (!JS_DefineProperty(cx, info, objName,
                           INT_TO_JSVAL(lookupIdForTarget(obj)),
                           NULL, NULL, JSPROP_ENUMERATE))
      return JS_FALSE;
  return JS_TRUE;
}

JSBool ExtObjectManager::maybeIncludeObjectOp(JSObject *info,
                                              const char *objName,
                                              JSObjectOp objOp,
                                              JSObject *target)
{
  if (objOp)
    return maybeIncludeObject(info, objName, objOp(targetCx, target));
  return JS_TRUE;
}

JSBool ExtObjectManager::lookupNamedObject(const char *name,
                                           uint32 *id)
{
  *id = 0;

  if (namedTargetObjects == NULL)
    return JS_TRUE;

  JSBool found;
  if (!JS_HasProperty(targetCx,
                      namedTargetObjects,
                      name,
                      &found)) {
    JS_ReportError(cx, "JS_HasProperty() failed.");
    return JS_FALSE;
  }

  if (!found)
    return JS_TRUE;

  jsval val;
  if (!JS_LookupProperty(targetCx,
                         namedTargetObjects,
                         name,
                         &val)) {
    JS_ReportError(cx, "JS_LookupProperty failed.");
    return JS_FALSE;
  }

  if (!JSVAL_IS_OBJECT(val))
    return JS_TRUE;

  JSObject *obj = JSVAL_TO_OBJECT(val);
  *id = lookupIdForTarget(obj);

  return JS_TRUE;
}

JSBool ExtObjectManager::getInfoForTarget(JSObject *target,
                                          jsval *rval)
{
  JSObject *info = JS_NewObject(cx, NULL, NULL, NULL);

  if (info == NULL) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  // This should root the object.
  *rval = OBJECT_TO_JSVAL(info);

  JSClass *classp = JS_GET_CLASS(targetCx, target);
  if (classp != NULL) {
    if (!JS_DefineProperty(cx, info, "id",
                           INT_TO_JSVAL(lookupIdForTarget(target)),
                           NULL, NULL,
                           JSPROP_ENUMERATE))
      return JS_FALSE;

    JSString *name = JS_InternString(cx, classp->name);
    if (name == NULL) {
      JS_ReportOutOfMemory(cx);
      return JS_FALSE;        
    }
    if (!JS_DefineProperty(cx, info, "nativeClass", STRING_TO_JSVAL(name),
                           NULL, NULL, JSPROP_ENUMERATE)) {
      JS_ReportOutOfMemory(cx);
      return JS_FALSE;
    }
  }

  if (!JS_DefineProperty(
        cx, info, "size",
        INT_TO_JSVAL(JS_GetObjectTotalSize(targetCx, target)),
        NULL, NULL, JSPROP_ENUMERATE)) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  if (!maybeIncludeObject(info, "parent",
                          JS_GetParent(targetCx, target)) ||
      !maybeIncludeObject(info, "prototype",
                          JS_GetPrototype(targetCx, target)))
    return JS_FALSE;

  // TODO: We used to include 'constructor' here too, but
  // we ran into a problem with Block objects, so removed it.

  if (JS_ObjectIsFunction(targetCx, target))
    if (!getFunctionInfo(info, target))
      return JS_FALSE;

  if (!getChildrenInfo(info, target))
    return JS_FALSE;

  if (classp->flags & JSCLASS_IS_EXTENDED) {
    JSExtendedClass *exClassp = (JSExtendedClass *) classp;

    if (!maybeIncludeObjectOp(info, "wrappedObject",
                              exClassp->wrappedObject, target) ||
        !maybeIncludeObjectOp(info, "outerObject",
                              exClassp->outerObject, target) ||
        !maybeIncludeObjectOp(info, "innerObject",
                              exClassp->innerObject, target))
      return JS_FALSE;
  }

  if (((classp->flags & JSCLASS_IS_EXTENDED) &&
       ((JSExtendedClass *) classp)->wrappedObject)) {
    if (!maybeIncludeObject(
          info, "wrappedObject",
          ((JSExtendedClass *) classp)->wrappedObject(targetCx, target)
          ))
      return JS_FALSE;
  }

  return JS_TRUE;
}

JSBool ExtObjectManager::getTargetTable(jsval *rval)
{
  JSObject *table = JS_NewObject(cx, NULL, NULL, NULL);

  if (table == NULL) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  // This should root table.
  *rval = OBJECT_TO_JSVAL(table);

  for (unsigned int i = 1; i < currId; i++) {
    jsval value = JSVAL_NULL;
    JSClass *classp = JS_GET_CLASS(targetCx, ids[i]);

    if (classp) {
      JSString *name = JS_InternString(cx, classp->name);
      if (name == NULL) {
        JS_ReportOutOfMemory(cx);
        return JS_FALSE;
      }
      value = STRING_TO_JSVAL(name);
    }

    if (!JS_DefineElement(cx, table, i,
                          value, NULL, NULL,
                          JSPROP_ENUMERATE | JSPROP_INDEX)) {
      JS_ReportError(cx, "JS_DefineElement() failed");
      return JS_FALSE;
    }
  }

  return JS_TRUE;
}

JSBool ExtObjectManager::getTarget(uintN argc, jsval *argv,
                                   JSObject **rtarget)
{
  uint32 id;

  if (argc >= 1 && JSVAL_IS_STRING(argv[0])) {
    const char *name = JS_GetStringBytes(JSVAL_TO_STRING(argv[0]));
    if (!lookupNamedObject(name, &id))
      return JS_FALSE;
  } else
    if (!JS_ConvertArguments(cx, argc, argv, "u", &id))
      return JS_FALSE;

  *rtarget = lookupTargetForId(id);
  return JS_TRUE;
}

ProfilerRuntime::ProfilerRuntime(void) :
  rt(NULL),
  cx(NULL),
  global(NULL)
{
}

ProfilerRuntime::~ProfilerRuntime()
{
  if (cx) {
    JS_EndRequest(cx);
    JS_DestroyContext(cx);
    cx = NULL;
  }

  if (rt) {
    JS_DestroyRuntime(rt);
    rt = NULL;
  }

  global = NULL;
}

JSBool ProfilerRuntime::init(void)
{
  rt = JS_NewRuntime(8L * 1024L * 1024L);
  if (!rt)
    return JS_FALSE;

  cx = JS_NewContext(rt, 8192);
  if (!cx)
    return JS_FALSE;

  JS_SetOptions(cx, JSOPTION_VAROBJFIX | JSOPTION_JIT);
  JS_SetVersion(cx, JSVERSION_LATEST);
  JS_BeginRequest(cx);

  jsval rval;
  if (!TCB_init(cx, &rval))
    return JS_FALSE;

  // Note that this is already rooted in our context.
  global = JSVAL_TO_OBJECT(rval);

  if (!JS_DefineFunctions(cx, global, globalFunctions))
    return JS_FALSE;

  return JS_TRUE;
}

ExtStringManager::ExtStringManager(void) :
  profiler(NULL),
  strArray(NULL),
  strArrayLen(0),
  type(-1)
{
  strings.ops = NULL;
}

ExtStringManager::~ExtStringManager()
{
  if (profiler && strArray) {
    JS_RemoveRoot(profiler->cx, &strArray);
    strArray = NULL;
  }

  profiler = NULL;

  if (strings.ops) {
    JS_DHashTableFinish(&strings);
    strings.ops = NULL;
  }

  if (type > 0) {
    JS_RemoveExternalStringFinalizer(finalizeExtString);
    type = -1;
  }
}

JSString *ExtStringManager::getExt(JSString *extString)
{
  StringHashEntry *entry = (StringHashEntry *)
    JS_DHashTableOperate(&strings,
                         extString,
                         JS_DHASH_LOOKUP);
  if (JS_DHASH_ENTRY_IS_FREE((JSDHashEntryHdr *)entry)) {
    JSString *str = JS_NewExternalString(profiler->cx,
                                         JS_GetStringChars(extString),
                                         JS_GetStringLength(extString),
                                         type);
    if (!str)
      return NULL;

    entry = (StringHashEntry *) JS_DHashTableOperate(&strings,
                                                     extString,
                                                     JS_DHASH_ADD);
    if (entry == NULL)
      return NULL;

    entry->base.key = extString;
    entry->string = str;
    entry->index = strArrayLen;

    if (!JS_DefineElement(
          profiler->cx, strArray, entry->index,
          STRING_TO_JSVAL(entry->string),
          NULL, NULL,
          JSPROP_ENUMERATE | JSPROP_READONLY | JSPROP_PERMANENT
          ))
      return NULL;

    strArrayLen++;
    
    if (!JS_SetArrayLength(profiler->cx, strArray, strArrayLen))
      return NULL;
  }
  return entry->string;
}

JSBool ExtStringManager::init(ProfilerRuntime *aProfiler)
{
  profiler = aProfiler;
  JSContext *cx = profiler->cx;

  // TODO: We need to ensure that we're the only JS thread running
  // when we do this, or bad things will happen, according to the docs.
  type = JS_AddExternalStringFinalizer(finalizeExtString);
  if (type == -1) {
    JS_ReportError(cx, "JS_AddExternalStringFinalizer() failed");
    return JS_FALSE;
  }

  strArray = JS_NewArrayObject(cx, 0, NULL);
  if (!(strArray &&
        JS_AddNamedRoot(cx, &strArray, "ExtStringManager Array"))) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  if (!JS_DHashTableInit(&strings, JS_DHashGetStubOps(),
                         NULL, sizeof(StringHashEntry),
                         JS_DHASH_DEFAULT_CAPACITY(100))) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }
  return JS_TRUE;
}

MemoryProfiler::MemoryProfiler() :
  targetCx(NULL),
  targetRt(NULL)
{
}

MemoryProfiler::~MemoryProfiler()
{
}

JSBool MemoryProfiler::profile(JSContext *cx, JSString *code,
                               const char *filename, uint32 lineNumber,
                               JSObject *namedObjects, JSString *argument,
                               jsval *rval)
{
  targetCx = cx;
  targetRt = JS_GetRuntime(cx);

  if (!runtime.init())
    return JS_FALSE;

  JS_SetContextPrivate(runtime.cx, this);

  if (!strings.init(&runtime))
    return JS_FALSE;

  if (!objects.init(&runtime, &strings, targetCx, namedObjects))
    return JS_FALSE;

  jsval argumentVal = JSVAL_NULL;

  if (argument) {
    JSString *serverArgumentStr = strings.getExt(argument);
    if (serverArgumentStr == NULL) {
      JS_ReportOutOfMemory(targetCx);
      return JS_FALSE;
    }
    argumentVal = STRING_TO_JSVAL(serverArgumentStr);
  }

  if (!JS_DefineProperty(runtime.cx, runtime.global, "argument",
                         argumentVal, NULL, NULL, JSPROP_ENUMERATE))
    return JS_FALSE;

  jsval scriptRval;

  if (!JS_EvaluateScript(runtime.cx, runtime.global,
                         JS_GetStringBytes(code),
                         JS_GetStringLength(code),
                         filename, lineNumber,
                         &scriptRval)) {
    TCB_handleError(runtime.cx, runtime.global);
    JS_ReportError(targetCx, "Profiling failed.");
    return JS_FALSE;
  } else {
    if (JSVAL_IS_STRING(scriptRval)) {
      JSString *scriptRstring = JS_NewUCStringCopyZ(
        targetCx,
        JS_GetStringChars(JSVAL_TO_STRING(scriptRval))
        );
      if (scriptRstring == NULL) {
        JS_ReportOutOfMemory(targetCx);
        return JS_FALSE;
      } else
        *rval = STRING_TO_JSVAL(scriptRstring);
    } else if (!JSVAL_IS_GCTHING(scriptRval)) {
      *rval = scriptRval;
    } else {
      *rval = JSVAL_VOID;
    }
  }

  return JS_TRUE;
}

// **********************************************************************
// JSNative Function Definitions
// **********************************************************************

static JSBool getObjProperty(JSContext *cx, JSObject *obj, uintN argc,
                             jsval *argv, jsval *rval)
{
  JSObject *target;
  ExtObjectManager &objects = MemoryProfiler::get(cx)->objects;

  if (!objects.getTarget(argc, argv, &target))
    return JS_FALSE;

  if (!(argc >= 2 && JSVAL_IS_STRING(argv[1]))) {
    JS_ReportError(cx, "Must supply a string as second parameter.");
    return JS_FALSE;
  }

  char *name = JS_GetStringBytes(JSVAL_TO_STRING(argv[1]));

  if (target) {
    JSObject *info = JS_NewObject(cx, NULL, NULL, NULL);

    if (info == NULL) {
      JS_ReportOutOfMemory(cx);
      return JS_FALSE;
    }

    *rval = OBJECT_TO_JSVAL(info);
    return objects.copyPropertyInfo(info, NULL, name, target);
  }

  *rval = JSVAL_NULL;
  return JS_TRUE;
}

static JSBool getObjProperties(JSContext *cx, JSObject *obj, uintN argc,
                               jsval *argv, jsval *rval)
{
  JSObject *target;
  ExtObjectManager &objects = MemoryProfiler::get(cx)->objects;

  if (!objects.getTarget(argc, argv, &target))
    return JS_FALSE;

  bool useGetPropertiesInfo2 = false;

  if (argc > 1 && argv[1] == JSVAL_TRUE)
    useGetPropertiesInfo2 = true;

  if (target) {
    JSObject *propInfo = JS_NewObject(cx, NULL, NULL, NULL);
    if (propInfo == NULL) {
      JS_ReportOutOfMemory(cx);
      return JS_FALSE;
    }

    *rval = OBJECT_TO_JSVAL(propInfo);

    if (useGetPropertiesInfo2)
      return objects.getPropertiesInfo2(propInfo, target);
    else
      return objects.getPropertiesInfo(propInfo, target);
  }

  *rval = JSVAL_NULL;
  return JSVAL_TRUE;
}

static JSBool getNamedObjects(JSContext *cx, JSObject *obj, uintN argc,
                              jsval *argv, jsval *rval)
{
  JSObject *info = JS_NewObject(cx, NULL, NULL, NULL);

  if (info == NULL) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  *rval = OBJECT_TO_JSVAL(info);

  ExtObjectManager &objects = MemoryProfiler::get(cx)->objects;

  if (objects.namedTargetObjects != NULL)
    return objects.getPropertiesInfo(info, objects.namedTargetObjects);

  return JS_TRUE;
}

static JSBool getObjTable(JSContext *cx, JSObject *obj, uintN argc,
                          jsval *argv, jsval *rval)
{
  return MemoryProfiler::get(cx)->objects.getTargetTable(rval);
}

static JSBool getObjParent(JSContext *cx, JSObject *obj, uintN argc,
                           jsval *argv, jsval *rval)
{
  JSObject *target;
  ExtObjectManager &objects = MemoryProfiler::get(cx)->objects;

  if (!objects.getTarget(argc, argv, &target))
    return JS_FALSE;

  if (target) {
    JSObject *parent = JS_GetParent(MemoryProfiler::get(cx)->targetCx,
                                    target);
    if (parent) {
      *rval = INT_TO_JSVAL(objects.lookupIdForTarget(parent));
      return JS_TRUE;
    }
  }

  *rval = JSVAL_NULL;
  return JS_TRUE;
}

static JSBool getObjInfo(JSContext *cx, JSObject *obj, uintN argc,
                         jsval *argv, jsval *rval)
{
  JSObject *target;
  ExtObjectManager &objects = MemoryProfiler::get(cx)->objects;

  if (!objects.getTarget(argc, argv, &target))
    return JS_FALSE;

  if (target)
    return objects.getInfoForTarget(target, rval);

  *rval = JSVAL_NULL;
  return JS_TRUE;
}

static intN rootMapFun(void *rp, const char *name, void *data)
{
  // rp is a JS GC root. From the documentation for JS_AddRoot() in jsapi.h:
  //
  //   A JS GC root is a pointer to a JSObject *, JSString *, or
  //   jsdouble * that itself points into the GC heap (more recently,
  //   we support this extension: a root may be a pointer to a jsval v
  //   for which JSVAL_IS_GCTHING(v) is true).
  //
  // The public JSAPI appears to provide no way of actually determining
  // which it is, though, so we're just going to have to list them all,
  // and hope that a later tracing will give us more information about
  // them.

  RootMapStruct *roots = (RootMapStruct *) data;
  ExtObjectManager &objects = MemoryProfiler::get(roots->cx)->objects;
  uint32 objId = objects.lookupIdForTarget(*((JSObject **)rp));
  if (objId) {
    jsval id = INT_TO_JSVAL(objId);
    if (!JS_SetElement(roots->cx, roots->array, roots->length, &id)) {
      roots->rval = JS_FALSE;
      return JS_MAP_GCROOT_STOP;
    }
    roots->length++;
  }
  return JS_MAP_GCROOT_NEXT;
}

static JSBool getGCRoots(JSContext *cx, JSObject *obj, uintN argc,
                         jsval *argv, jsval *rval)
{
  RootMapStruct roots;
  roots.array = JS_NewArrayObject(cx, 0, NULL);
  roots.length = 0;
  roots.rval = JS_TRUE;
  roots.cx = cx;

  if (roots.array == NULL) {
    JS_ReportError(cx, "Creating array failed.");
    return JS_FALSE;
  }

  JS_MapGCRoots(MemoryProfiler::get(cx)->targetRt, rootMapFun, &roots);

  if (roots.rval == JS_FALSE)
    return JS_FALSE;

  *rval = OBJECT_TO_JSVAL(roots.array);
  return JS_TRUE;
}

JSBool profileMemory(JSContext *cx, JSObject *obj, uintN argc,
                     jsval *argv, jsval *rval)
{
  JSString *code;
  const char *filename;
  uint32 lineNumber = 1;
  JSObject *namedObjects = NULL;
  JSString *argument = NULL;

  jsword myThread = JS_GetContextThread(cx);
  JSContext *iter = NULL;
  JSContext *acx;
  while ((acx = JS_ContextIterator(JS_GetRuntime(cx), &iter)) != NULL)
    if ((JS_GetContextThread(acx) != myThread) &&
        JS_IsRunning(acx)) {
      // TODO: Just because the thread's context isn't currently running
      // doesn't mean it won't start while we're profiling. We should
      // really figure out a better solution here.
      JS_ReportError(cx,
                     "Multi-threaded memory profiling is currently "
                     "unsupported.");
      return JS_FALSE;
    }

  // TODO: Consider using JS_SetGCParameter() to effectively disable the
  // target runtime's GC while we're profiling, because it's almost
  // certain that some code will inadvertently be run on it while we
  // introspect it. Alternatively, install a GC callback on the
  // target runtime while we're profiling, to ensure that we
  // the profiling context doesn't try to access objects that were
  // GC'd while it was profiling.

  if (!JS_ConvertArguments(cx, argc, argv, "Ss/uoS", &code, &filename,
                           &lineNumber, &namedObjects, &argument))
    return JS_FALSE;

  MemoryProfiler profiler;

  return profiler.profile(cx, code, filename, lineNumber, namedObjects,
                          argument, rval);
}

// **********************************************************************
// Static Storage Definitions
// **********************************************************************

JSFunctionSpec ProfilerRuntime::globalFunctions[] = {
  JS_FS("ServerSocket",         createServerSocket, 0, 0, 0),
  JS_FS("getGCRoots",           getGCRoots,         0, 0, 0),
  JS_FS("getObjectParent",      getObjParent,       1, 0, 0),
  JS_FS("getObjectInfo",        getObjInfo,         1, 0, 0),
  JS_FS("getObjectProperties",  getObjProperties,   1, 0, 0),
  JS_FS("getObjectProperty",    getObjProperty,     2, 0, 0),
  JS_FS("getNamedObjects",      getNamedObjects,    0, 0, 0),
  JS_FS("getObjectTable",       getObjTable,        0, 0, 0),
  JS_FS_END
};
