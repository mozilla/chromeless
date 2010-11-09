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
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
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

// TODO: When we call JS_GetReservedSlot(), we really need to
// propagate the "reserved slot index out of range" error that it
// might throw; otherwise, it'll eventually get thrown from somewhere
// else, and we'll be completely confused.

#include "wrapper.h"

// Reserved slot ID for the resolver (meta) object
#define SLOT_RESOLVER 0

// Reserved slot ID for the object to be wrapped
#define SLOT_WRAPPEE  1

static JSBool
resolverHasMethod(JSContext *cx, JSObject *obj, const char *name)
{
  // If we're the prototype of some other object, then obj won't be of
  // the JSClass we need it to be, so just deny that our membrane has
  // the method we're looking for.
  JSClass *klass = JS_GET_CLASS(cx, obj);
  if (klass != &sFlexibleWrapper_JSClass.base)
    return JS_FALSE;

  jsval resolver;
  if (!JS_GetReservedSlot(cx, obj, SLOT_RESOLVER, &resolver))
    return JS_FALSE;
  JSObject *resolverObj = JSVAL_TO_OBJECT(resolver);

  JSBool hasProperty;
  if (!JS_HasProperty(cx, resolverObj, name, &hasProperty))
    return JS_FALSE;
  return hasProperty;

  // TODO: Check to make sure the property is a function?
}

static JSBool
delegateToResolver(JSContext *cx, JSObject *obj, const char *name,
                   uintN argc, jsval *argv, jsval *rval)
{
  jsval resolver;
  if (!JS_GetReservedSlot(cx, obj, SLOT_RESOLVER, &resolver))
    return JS_FALSE;
  JSObject *resolverObj = JSVAL_TO_OBJECT(resolver);

  jsval *allArgv;
  uintN allArgc = argc + 2;
  allArgv = (jsval *)PR_Malloc(allArgc * sizeof(jsval));

  if (!JS_GetReservedSlot(cx, obj, SLOT_WRAPPEE, allArgv)) {
    PR_Free(allArgv);
    return JS_FALSE;
  }
  allArgv[1] = OBJECT_TO_JSVAL(obj);

  for (unsigned int i = 0; i < argc; i++)
    allArgv[i + 2] = argv[i];

  if (!JS_CallFunctionName(cx, resolverObj, name, allArgc, allArgv, rval)) {
    PR_Free(allArgv);
    return JS_FALSE;
  }

  PR_Free(allArgv);
  return JS_TRUE;
}

static JSBool
enumerate(JSContext *cx, JSObject *obj, JSIterateOp enum_op,
          jsval *statep, jsid *idp)
{
  JSObject *iterator;
 
  switch (enum_op) {
  case JSENUMERATE_INIT:
    if (resolverHasMethod(cx, obj, "enumerate")) {
      if (!delegateToResolver(cx, obj, "enumerate", 0, NULL, statep))
        return JS_FALSE;
      if (!JSVAL_IS_OBJECT(*statep)) {
        JS_ReportError(cx, "Expected enumerate() to return an iterator.");
        return JS_FALSE;
      }
      *idp = JSVAL_ZERO;
      JS_AddRoot(cx, statep);
      return JS_TRUE;
    }
    // TODO: Default behavior?
    JS_ReportError(cx, "Enumeration is not implemented on this object.");
    return JS_FALSE;
  case JSENUMERATE_NEXT:
    jsval rval;
    iterator = JSVAL_TO_OBJECT(*statep);
    if (!JS_CallFunctionName(cx, iterator, "next", 0, NULL, &rval)) {
      if (JS_IsExceptionPending(cx)) {
        jsval exception;
        if (!JS_GetPendingException(cx, &exception))
          return JS_FALSE;
        if (!JSVAL_IS_OBJECT(exception))
          return JS_FALSE;
        JSClass *clasp = JS_GET_CLASS(cx, JSVAL_TO_OBJECT(exception));
        if (clasp &&
            JSCLASS_CACHED_PROTO_KEY(clasp) == JSProto_StopIteration) {
          JS_ClearPendingException(cx);
          *statep = JSVAL_NULL;
          JS_RemoveRoot(cx, statep);
          return JS_TRUE;
        }
      }
      return JS_FALSE;
    }
    if (!JS_ValueToId(cx, rval, idp))
      return JS_FALSE;
    return JS_TRUE;
  case JSENUMERATE_DESTROY:
    JS_RemoveRoot(cx, statep);
    return JS_TRUE;
  default:
    JS_ReportError(cx, "Unknown enum_op");
    return JS_FALSE;
  }
}

static JSBool
resolve(JSContext *cx, JSObject *obj, jsval id, uintN flags,
        JSObject **objp)
{
  if (resolverHasMethod(cx, obj, "resolve")) {
    jsval rval;
    jsval args[1];
    args[0] = id;
    if (!delegateToResolver(cx, obj, "resolve", 1, args, &rval))
      return JS_FALSE;

    if (JSVAL_IS_OBJECT(rval))
      *objp = JSVAL_TO_OBJECT(rval);
    else
      *objp = NULL;

    return JS_TRUE;
  }
  *objp = NULL;
  return JS_TRUE;
}

static JSBool
propertyOp(const char *name, JSContext *cx, JSObject *obj, jsval id,
           jsval *vp)
{
  if (resolverHasMethod(cx, obj, name)) {
    jsval rval;
    jsval args[2];
    args[0] = id;
    args[1] = *vp;
    if (!delegateToResolver(cx, obj, name, 2, args, &rval))
      return JS_FALSE;

    if (!JSVAL_IS_VOID(rval))
      *vp = rval;
    return JS_TRUE;
  }
  return JS_PropertyStub(cx, obj, id, vp);
}

static JSBool
addProperty(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
  return propertyOp("addProperty", cx, obj, id, vp);
}

static JSBool
delProperty(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
  if (resolverHasMethod(cx, obj, "delProperty")) {
    jsval rval;
    jsval args[1];
    args[0] = id;
    if (!delegateToResolver(cx, obj, "delProperty", 1, args, &rval))
      return JS_FALSE;

    // TODO: The MDC docs say that setting *vp to JSVAL_FALSE and then
    // returning JS_TRUE should indicate that the property can't be
    // deleted, but this doesn't seem to actually be the case.
    if (!JSVAL_IS_BOOLEAN(rval)) {
      JS_ReportError(cx, "delProperty must return a boolean");
      return JS_FALSE;
    }
    *vp = rval;
    return JS_TRUE;
  }
  return JS_PropertyStub(cx, obj, id, vp);
}

static JSBool
getProperty(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
  return propertyOp("getProperty", cx, obj, id, vp);
}

static JSBool
setProperty(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
  return propertyOp("setProperty", cx, obj, id, vp);
}

static JSBool
checkAccess(JSContext *cx, JSObject *obj, jsid id, JSAccessMode mode,
            jsval *vp)
{
  // Forward to the checkObjectAccess hook in the runtime, if any.
  JSSecurityCallbacks *callbacks = JS_GetSecurityCallbacks(cx);
  if (callbacks && callbacks->checkObjectAccess)
    return callbacks->checkObjectAccess(cx, obj, id, mode, vp);
  JS_ReportError(cx, "Security callbacks not defined");
  return JS_FALSE;
}

static JSObject *
wrappedObject(JSContext *cx, JSObject *obj) {
  jsval wrappee;
  // TODO: This function will be setting an error if it fails;
  // not sure if wrappedObject() handlers are allowed to raise
  // exceptions or not.
  if (!JS_GetReservedSlot(cx, obj, SLOT_WRAPPEE, &wrappee))
    return obj;
  return JSVAL_TO_OBJECT(wrappee);
}

static JSBool
equality(JSContext *cx, JSObject *obj, jsval v, JSBool *bp) {
  if (resolverHasMethod(cx, obj, "equality")) {
    jsval rval;
    jsval args[1];
    args[0] = v;
    
    if (!delegateToResolver(cx, obj, "equality", 1, args, &rval))
      return JS_FALSE;

    if (!JSVAL_IS_BOOLEAN(rval)) {
      JS_ReportError(cx, "equality must return a boolean");
      return JS_FALSE;
    }
    *bp = JSVAL_TO_BOOLEAN(rval);
    return JS_TRUE;
  }
  if (JSVAL_IS_OBJECT(v) && JSVAL_TO_OBJECT(v) == obj)
    *bp = JS_TRUE;
  else
    *bp = JS_FALSE;
  return JS_TRUE;
}

static JSBool
delegateNativeToResolver(const char *name, JSContext *cx, JSObject *thisPtr,
                         JSObject *obj, uintN argc, jsval *argv, jsval *rval) {
  JSObject *array = JS_NewArrayObject(cx, argc, argv);
  jsval delegateArgv[2];
  delegateArgv[0] = OBJECT_TO_JSVAL(thisPtr);
  delegateArgv[1] = OBJECT_TO_JSVAL(array);

  return delegateToResolver(cx, obj, name, 2, delegateArgv, rval);
}

static JSBool
call(JSContext *cx, JSObject *thisPtr, uintN argc, jsval *argv, jsval *rval)
{
  JSObject *obj = JSVAL_TO_OBJECT(JS_ARGV_CALLEE(argv));
  
  if (resolverHasMethod(cx, obj, "call"))
    return delegateNativeToResolver("call", cx, thisPtr, obj, argc, argv,
                                    rval);

  JS_ReportError(cx, "Either the object isn't callable, or the caller "
                 "doesn't have permission to call it.");
  return JS_FALSE;
}

static JSBool
construct(JSContext *cx, JSObject *thisPtr, uintN argc, jsval *argv, jsval *rval)
{
  JSObject *obj = JSVAL_TO_OBJECT(JS_ARGV_CALLEE(argv));
  
  if (resolverHasMethod(cx, obj, "construct"))
    return delegateNativeToResolver("construct", cx, thisPtr, obj, argc, argv,
                                    rval);

  JS_ReportError(cx, "Either the object can't be used as a constructor, or "
                 "the caller doesn't have permission to use it.");
  return JS_FALSE;
}

static JSBool
convert(JSContext *cx, JSObject *obj, JSType type, jsval *vp)
{
  if (resolverHasMethod(cx, obj, "convert")) {
    JSString *typeStr = JS_NewStringCopyZ(cx, JS_GetTypeName(cx, type));
    jsval args[1];
    args[0] = STRING_TO_JSVAL(typeStr);
    return delegateToResolver(cx, obj, "convert", 1, args, vp);
  }
  return JS_ConvertStub(cx, obj, type, vp);
}

static JSObject *
iteratorObject(JSContext *cx, JSObject *obj, JSBool keysonly)
{
  if (resolverHasMethod(cx, obj, "iteratorObject")) {
    jsval rval;
    jsval args[1];
    args[0] = BOOLEAN_TO_JSVAL(keysonly);
    if (!delegateToResolver(cx, obj, "iteratorObject", 1, args, &rval))
      return NULL;
    if (!JSVAL_IS_OBJECT(rval)) {
      JS_ReportError(cx, "iteratorObject() must return an object.");
      return NULL;
    }
    return JSVAL_TO_OBJECT(rval);
  }
  JS_ReportError(cx, "iteratorObject() is unimplemented.");
  return NULL;
}

JSExtendedClass sFlexibleWrapper_JSClass = {
  // JSClass (JSExtendedClass.base) initialization
  { "FlexibleWrapper",
    JSCLASS_NEW_RESOLVE | JSCLASS_IS_EXTENDED |
    JSCLASS_NEW_ENUMERATE | JSCLASS_HAS_RESERVED_SLOTS(2),
    addProperty,              delProperty,
    getProperty,              setProperty,
    (JSEnumerateOp)enumerate, (JSResolveOp)resolve,
    convert,                  JS_FinalizeStub,
    NULL,                     checkAccess,
    call,                     construct,
    NULL,                     NULL,
    NULL,                     NULL
  },
  // JSExtendedClass initialization
  equality,
  NULL, // outerObject
  NULL, // innerObject
  iteratorObject,
  wrappedObject,
  JSCLASS_NO_RESERVED_MEMBERS
};

static JSBool getWrappedComponent(JSContext *cx, uintN argc, jsval *argv,
                                  jsval *rval, uint32 slotIndex)
{
  JSObject *wrapped;

  if (!JS_ConvertArguments(cx, argc, argv, "o", &wrapped))
    return JS_FALSE;

  if (JS_GetClass(cx, wrapped) == &sFlexibleWrapper_JSClass.base) {
    if (!JS_GetReservedSlot(cx, wrapped, slotIndex, rval))
      return JS_FALSE;
    return JS_TRUE;
  }

  *rval = JSVAL_NULL;
  return JS_TRUE;
}

JSBool getWrapper(JSContext *cx, JSObject *obj, uintN argc,
                  jsval *argv, jsval *rval)
{
  return getWrappedComponent(cx, argc, argv, rval, SLOT_RESOLVER);
}

JSBool unwrapAnyObject(JSContext *cx, JSObject *obj, uintN argc,
                       jsval *argv, jsval *rval)
{
  JSObject *wrapped;
  JSObject *wrappee = NULL;

  if (!JS_ConvertArguments(cx, argc, argv, "o", &wrapped))
    return JS_FALSE;

  JSClass *klass = JS_GetClass(cx, wrapped);
  if (klass && (klass->flags & JSCLASS_IS_EXTENDED)) {
    JSExtendedClass *eClass = (JSExtendedClass *) klass;
    if (eClass->wrappedObject != NULL)
      wrappee = eClass->wrappedObject(cx, wrapped);
  }

  if (wrappee)
    *rval = OBJECT_TO_JSVAL(wrappee);
  else
    *rval = JSVAL_NULL;

  return JS_TRUE;
}

JSBool unwrapObject(JSContext *cx, JSObject *obj, uintN argc,
                    jsval *argv, jsval *rval)
{
  return getWrappedComponent(cx, argc, argv, rval, SLOT_WRAPPEE);
}

JSBool wrapObject(JSContext *cx, JSObject *obj, uintN argc,
                  jsval *argv, jsval *rval)
{
  JSObject *wrappee;
  JSObject *resolver;

  if (!JS_ConvertArguments(cx, argc, argv, "oo", &wrappee, &resolver))
    return JS_FALSE;

  JSObject *wrapper = JS_NewObjectWithGivenProto(
    cx,
    &sFlexibleWrapper_JSClass.base,
    NULL,
    wrappee
    );
  if (wrapper == NULL) {
    JS_ReportError(cx, "Creating new wrapper failed.");
    return JS_FALSE;
  }

  if (!JS_SetReservedSlot(cx, wrapper, SLOT_RESOLVER,
                          OBJECT_TO_JSVAL(resolver)) ||
      !JS_SetReservedSlot(cx, wrapper, SLOT_WRAPPEE,
                          OBJECT_TO_JSVAL(wrappee)))
    return JS_FALSE;

  *rval = OBJECT_TO_JSVAL(wrapper);
  return JS_TRUE;
}
