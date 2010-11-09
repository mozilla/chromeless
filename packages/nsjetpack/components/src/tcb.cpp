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

#include "tcb.h"

static JSFunctionSpec TCB_global_functions[] = {
  JS_FS("setGCZeal",      TCB_setGCZeal,      1, 0, 0),
  JS_FS("seal",           TCB_seal,           1, 0, 0),
  JS_FS("print",          TCB_print,          1, 0, 0),
  JS_FS("stack",          TCB_stack,          0, 0, 0),
  JS_FS("lookupProperty", TCB_lookupProperty, 2, 0, 0),
  JS_FS("functionInfo",   TCB_functionInfo,   1, 0, 0),
  JS_FS("enumerate",      TCB_enumerate,      1, 0, 0),
  JS_FS("forceGC",        TCB_forceGC,        0, 0, 0),
  JS_FS("getClassName",   TCB_getClassName,   1, 0, 0),
  JS_FS_END
};

// The class of the global object.
JSClass TCB_global_class = {
  "TCBGlobal", JSCLASS_GLOBAL_FLAGS,
  JS_PropertyStub, JS_PropertyStub, JS_PropertyStub, JS_PropertyStub,
  JS_EnumerateStub, JS_ResolveStub, JS_ConvertStub, JS_FinalizeStub,
  JSCLASS_NO_OPTIONAL_MEMBERS
};

// This native JS function sets how frequently garbage collection
// will occur, 0 being "normal" and 2 being "really really often".
// If GC zeal-setting isn't enabled in the current build, this
// function does nothing.

extern JSBool TCB_setGCZeal(JSContext *cx, JSObject *obj, uintN argc,
                            jsval *argv, jsval *rval)
{
  int32 zeal;
  if (!JS_ConvertArguments(cx, argc, argv, "i", &zeal))
    return JS_FALSE;

  if (zeal < 0 || zeal > 2) {
    JS_ReportError(cx, "zeal level out of range");
    return JS_FALSE;
  }

#ifdef JS_GC_ZEAL
  JS_SetGCZeal(cx, zeal);
#endif

  return JS_TRUE;
}

// This native JS function "seals" the given object, preventing it
// from being modified. This function may or may not be identical to
// ES5's freeze().

extern JSBool TCB_seal(JSContext *cx, JSObject *obj, uintN argc,
                       jsval *argv, jsval *rval) 
{
  JSObject *target;
  JSBool deep = JS_FALSE;

  if (!JS_ConvertArguments(cx, argc, argv, "o/b", &target, &deep))
    return JS_FALSE;

  *rval = JSVAL_VOID;

  return JS_SealObject(cx, target, deep);
}

// This native JS function prints the given string to the console.

JSBool TCB_print(JSContext *cx, JSObject *obj, uintN argc,
                 jsval *argv, jsval *rval)
{
  char *str;

  if (!JS_ConvertArguments(cx, argc, argv, "s", &str))
    return JS_FALSE;

  printf("%s\n", str);

  return JS_TRUE;
}

// This native JS function forces garbage collection.

JSBool TCB_forceGC(JSContext *cx, JSObject *obj, uintN argc,
                   jsval *argv, jsval *rval)
{
  JS_GC(cx);
  return JS_TRUE;
}

// This native JS function retrieves the JSClass name of an object.

JSBool TCB_getClassName(JSContext *cx, JSObject *obj, uintN argc,
                        jsval *argv, jsval *rval)
{
  JSObject *target;

  if (!JS_ConvertArguments(cx, argc, argv, "o", &target))
    return JS_FALSE;

  *rval = JSVAL_NULL;

  JSClass *classp = JS_GetClass(cx, target);
  if (classp && classp->name) {
    JSString *name = JS_NewStringCopyZ(cx, classp->name);
    if (name == NULL) {
      JS_ReportOutOfMemory(cx);
      return JS_FALSE;
    }
    *rval = STRING_TO_JSVAL(name);
  }

  return JS_TRUE;
}

// This native JS function is a wrapper for JS_Enumerate().

JSBool TCB_enumerate(JSContext *cx, JSObject *obj, uintN argc,
                     jsval *argv, jsval *rval)
{
  JSObject *target;

  if (!JS_ConvertArguments(cx, argc, argv, "o", &target))
    return JS_FALSE;

  JSIdArray *ids = JS_Enumerate(cx, target);

  if (ids == NULL)
    return JS_FALSE;

  JSObject *array = JS_NewArrayObject(cx, ids->length, ids->vector);
  *rval = OBJECT_TO_JSVAL(array);

  JS_DestroyIdArray(cx, ids);
  return JS_TRUE;
}

// This native JS function looks up the property of an object, bypassing
// security checks and getters/setters.

JSBool TCB_lookupProperty(JSContext *cx, JSObject *obj, uintN argc,
                          jsval *argv, jsval *rval)
{
  JSObject *target;

  if (argc < 2) {
    JS_ReportError(cx, "Must provide id to lookup.");
    return JS_FALSE;
  }

  if (!JS_ConvertArguments(cx, argc, argv, "o", &target))
    return JS_FALSE;

  return JS_LookupPropertyById(cx, target, argv[1], rval);
}

// This native JS function returns a JS object containing metadata about
// the given function.

JSBool TCB_functionInfo(JSContext *cx, JSObject *obj, uintN argc,
                        jsval *argv, jsval *rval)
{
  JSFunction *func;

  if (!JS_ConvertArguments(cx, argc, argv, "f", &func))
    return JS_FALSE;

  JSScript *script = JS_GetFunctionScript(cx, func);

  if (script == NULL) {
    *rval = JSVAL_NULL;
    return JS_TRUE;
  }
  
  jsval filenameVal = JSVAL_NULL;

  const char *filename = JS_GetScriptFilename(cx, script);
  if (filename) {
    JSString *filenameStr = JS_NewStringCopyZ(cx, filename);
    filenameVal = STRING_TO_JSVAL(filenameStr);
  }

  uintN lineNumber = JS_GetScriptBaseLineNumber(cx, script);

  JSObject *funcInfo = JS_NewObject(cx, NULL, NULL, NULL);
  if (funcInfo == NULL) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }
  *rval = OBJECT_TO_JSVAL(funcInfo);

  if (!JS_DefineProperty(cx, funcInfo, "filename", filenameVal,
                         NULL, NULL, JSPROP_ENUMERATE) ||
      !JS_DefineProperty(cx, funcInfo, "lineNumber",
                         INT_TO_JSVAL(lineNumber), NULL, NULL,
                         JSPROP_ENUMERATE))
    return JS_FALSE;

  return JS_TRUE;
}

// This native JS function returns a JS representation of the current
// state of the stack, starting with the callee's stack frame and going
// up from there.

JSBool TCB_stack(JSContext *cx, JSObject *obj, uintN argc, jsval *argv,
                 jsval *rval)
{
  JSAutoLocalRootScope autoScope(cx);

  JSStackFrame *iterator = NULL;
  JSStackFrame *frame;
  JSObject *prevFrameInfo = NULL;
  JSObject *firstFrameInfo = NULL;
  bool skippedMyFrame = false;

  if (obj == NULL)
    // We're being called from native code, don't skip the topmost frame.
    skippedMyFrame = true;

  while ((frame = JS_FrameIterator(cx, &iterator)) != NULL) {
    if (!skippedMyFrame) {
      skippedMyFrame = true;
      continue;
    }

    jsval functionNameVal = JSVAL_NULL;
    jsval filenameVal = JSVAL_NULL;
    jsval lineNoVal = JSVAL_ZERO;
    jsval functionObjectVal = JSVAL_NULL;
    jsval scopeChainVal = JSVAL_NULL;

    JSFunction *func = JS_GetFrameFunction(cx, frame);
    if (func) {
      JSString *functionName = JS_GetFunctionId(func);
      if (functionName)
        functionNameVal = STRING_TO_JSVAL(functionName);
    }

    if (!JS_IsNativeFrame(cx, frame)) {
      JSScript *script = JS_GetFrameScript(cx, frame);
      jsbytecode *bytecode = JS_GetFramePC(cx, frame);

      const char *filename = JS_GetScriptFilename(cx, script);
      if (filename) {
        JSString *filenameStr = JS_NewStringCopyZ(cx, filename);
        filenameVal = STRING_TO_JSVAL(filenameStr);
      }

      uintN lineNo = JS_PCToLineNumber(cx, script, bytecode);
      lineNoVal = INT_TO_JSVAL(lineNo);

      JSObject *functionObject = JS_GetFrameFunctionObject(cx, frame);
      functionObjectVal = OBJECT_TO_JSVAL(functionObject);

      JSObject *scopeChain = JS_GetFrameScopeChain(cx, frame);
      scopeChainVal = OBJECT_TO_JSVAL(scopeChain);
    }

    // TODO: Check for return values here.
    JSObject *frameInfo = JS_NewObject(cx, NULL, NULL, NULL);
    JS_DefineProperty(cx, frameInfo, "filename", filenameVal,
                      NULL, NULL, 0);
    JS_DefineProperty(cx, frameInfo, "lineNo", lineNoVal,
                      NULL, NULL, 0);
    JS_DefineProperty(cx, frameInfo, "functionName", functionNameVal,
                      NULL, NULL, 0);
    JS_DefineProperty(cx, frameInfo, "functionObject", functionObjectVal,
                      NULL, NULL, 0);
    JS_DefineProperty(cx, frameInfo, "scopeChain", scopeChainVal,
                      NULL, NULL, 0);

    if (prevFrameInfo)
      JS_DefineProperty(cx, prevFrameInfo, "caller",
                        OBJECT_TO_JSVAL(frameInfo), NULL, NULL, 0);
    else
      firstFrameInfo = frameInfo;

    prevFrameInfo = frameInfo;
  }

  if (firstFrameInfo)
    *rval = OBJECT_TO_JSVAL(firstFrameInfo);
  else
    *rval = JSVAL_NULL;

  return JS_TRUE;
}

// Our global hook called whenever an exception is thrown saves the current
// exception and stack information to the 'lastException' and
// 'lastExceptionTraceback' globals of the TCB, respectively, much like
// Python's sys.exc_info().

JSTrapStatus TCB_throwHook(JSContext *cx, JSScript *script, jsbytecode *pc,
                           jsval *rval, void *closure)
{
  JSObject *tcb_global = (JSObject *) closure;
  jsval lastExceptionTraceback;
  jsval lastException;

  jsval exception = *rval;
  if (JS_IsExceptionPending(cx))
    if (!JS_GetPendingException(cx, &exception))
      printf("Getting exception failed.\n");

  if (!JS_GetProperty(cx, tcb_global, "lastException", &lastException))
    printf("Unable to retrieve last exception.");

  if (lastException == exception)
    // The same exception is just propagating through the stack; keep
    // our existing last-exception info.
    return JSTRAP_CONTINUE;

  if (!TCB_stack(cx, NULL, 0, NULL, &lastExceptionTraceback)) {
    printf("Generation of exception info failed.");
    lastExceptionTraceback = JSVAL_NULL;
  }

  if (!JS_SetProperty(cx, tcb_global, "lastExceptionTraceback",
                      &lastExceptionTraceback) ||
      !JS_SetProperty(cx, tcb_global, "lastException", &exception))
    printf("Setting of exception info failed.");

  return JSTRAP_CONTINUE;
}

void TCB_handleError(JSContext *cx, JSObject *global)
{
  jsval handleError;
  jsval rval;

  if (!JS_GetProperty(cx, global, "handleError", &handleError)) {
    printf("Getting handleError property of global failed.\n");
    return;
  }

  if (JSVAL_IS_OBJECT(handleError) &&
      JS_ObjectIsFunction(cx, JSVAL_TO_OBJECT(handleError))) {
    if (!JS_CallFunctionValue(cx, global,
                              handleError, 0, NULL, &rval)) {
      printf("An error occurred, but calling handleError() failed.\n");
      return;
    } else
      return;
  }

  printf("An error occurred, but no handleError() is defined.\n");
}

JSBool TCB_init(JSContext *cx, jsval *rval)
{
  JSRuntime *rt = JS_GetRuntime(cx);

  // Create the TCB's global object.
  JSObject *global = JS_NewObject(cx, &TCB_global_class, NULL, NULL);
  if (global == NULL) {
    JS_ReportOutOfMemory(cx);
    return JS_FALSE;
  }

  if (!JS_InitStandardClasses(cx, global) ||
      !JS_DefineFunctions(cx, global, TCB_global_functions))
    return JS_FALSE;

  if (!JS_SetThrowHook(rt, TCB_throwHook, global) ||
      !JS_DefineProperty(cx, global, "lastExceptionTraceback", JSVAL_NULL,
                         NULL, NULL, 0) ||
      !JS_DefineProperty(cx, global, "lastException", JSVAL_NULL,
                         NULL, NULL, 0))
    return JS_FALSE;

  *rval = OBJECT_TO_JSVAL(global);
  return JS_TRUE;
}
