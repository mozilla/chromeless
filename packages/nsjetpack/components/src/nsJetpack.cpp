#include "nsJetpack.h"
#include "tcb.h"
#include "wrapper.h"
#include "memory_profiler.h"

#include "jsapi.h"
#include "nsMemory.h"
#include "nsIXPConnect.h"
#include "nsAXPCNativeCallContext.h"
#include "nsServiceManagerUtils.h"
#include "nsComponentManagerUtils.h"

// The nsIXPCScriptable map declaration that will generate stubs for us...
#define XPC_MAP_CLASSNAME           nsJetpack
#define XPC_MAP_QUOTED_CLASSNAME   "nsJetpack"
#define XPC_MAP_WANT_NEWRESOLVE
#define XPC_MAP_FLAGS nsIXPCScriptable::ALLOW_PROP_MODS_DURING_RESOLVE
#include "xpc_map_end.h" /* This will #undef the above */

NS_IMPL_ISUPPORTS2(nsJetpack, nsIJetpack, nsIXPCScriptable)

#ifdef USE_COWS
static JSBool makeCOW(JSContext *cx, JSObject *obj, uintN argc,
                      jsval *argv, jsval *rval)
{
  JSObject *object;

  if (!JS_ConvertArguments(cx, argc, argv, "o", &object))
    return JS_FALSE;

  nsresult rv = NS_OK;
  nsCOMPtr<nsIXPConnect> xpc = do_GetService(
    "@mozilla.org/js/xpc/XPConnect;1",
    &rv
  );
  if (NS_FAILED(rv)) {
    JS_ReportError(cx, "getting XPConnect failed");
    return JS_FALSE;
  }

  rv = xpc->GetCOWForObject(cx, JS_GetParent(cx, object), object,
                            rval);

  if (NS_FAILED(rv)) {
    JS_ReportError(cx, "nsIXPConnect->GetCOWForObject() failed");
    return JS_FALSE;
  }

  return JS_TRUE;
}
#endif

static JSFunctionSpec endpointFunctions[] = {
  JS_FS("wrap",          wrapObject,       2, JSPROP_ENUMERATE, 0),
  JS_FS("unwrap",        unwrapObject,     1, JSPROP_ENUMERATE, 0),
  JS_FS("unwrapAny",     unwrapAnyObject,  1, JSPROP_ENUMERATE, 0),
  JS_FS("getWrapper",    getWrapper,       1, JSPROP_ENUMERATE, 0),
  JS_FS("profileMemory", profileMemory,    1, JSPROP_ENUMERATE, 0),
  JS_FS("enumerate",     TCB_enumerate,    1, JSPROP_ENUMERATE, 0),
  JS_FS("functionInfo",  TCB_functionInfo, 1, JSPROP_ENUMERATE, 0),
  JS_FS("seal",          TCB_seal,         1, JSPROP_ENUMERATE, 0),
  JS_FS("getClassName",  TCB_getClassName, 1, JSPROP_ENUMERATE, 0),
#ifdef USE_COWS
  JS_FS("makeCOW",       makeCOW,          1, JSPROP_ENUMERATE, 0),
#endif
  JS_FS_END
};

nsJetpack::nsJetpack()
{
}

nsJetpack::~nsJetpack()
{
}

static JSBool getEndpoint(JSContext *cx, JSObject *obj, uintN argc,
                          jsval *argv, jsval *rval)
{
  JSObject *endpoint = JS_NewObject(cx, NULL, NULL, NULL);
  if (endpoint == NULL)
    return JS_FALSE;

  *rval = OBJECT_TO_JSVAL(endpoint);

  if (!JS_DefineFunctions(cx, endpoint, endpointFunctions))
    return JS_FALSE;

  return JS_TRUE;
}

NS_IMETHODIMP
nsJetpack::NewResolve(nsIXPConnectWrappedNative *wrapper,
                      JSContext * cx, JSObject * obj,
                      jsval id, PRUint32 flags,
                      JSObject * *objp, PRBool *_retval)
{
  if (JSVAL_IS_STRING(id) &&
      strncmp(JS_GetStringBytes(JSVAL_TO_STRING(id)), "get", 3) == 0) {
    JSFunction *get = JS_NewFunction(cx, getEndpoint, 0, 0, 
                                     JS_GetParent(cx, obj), "get");
    if (!get) {
      JS_ReportOutOfMemory(cx);
      *_retval = PR_FALSE;
      return NS_OK;
    }
      
    JSObject *getObj = JS_GetFunctionObject(get);

    jsid idid;
    *objp = obj;
    *_retval = (JS_ValueToId(cx, id, &idid) &&
                JS_DefinePropertyById(cx, obj, idid,
                                      OBJECT_TO_JSVAL(getObj),
                                      nsnull, nsnull,
                                      JSPROP_ENUMERATE |
                                      JSPROP_READONLY |
                                      JSPROP_PERMANENT));
    return NS_OK;
  }

  *objp = nsnull;
  *_retval = PR_TRUE;

  return NS_OK;
}

NS_IMETHODIMP nsJetpack::Get()
{
  // This should never actually be called by JS code; instead, the 
  // getEndpoint() JS native function should get called, since this
  // object implements nsIXPCScriptable.
  return NS_OK;
}
