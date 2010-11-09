#include "jsapi.h"
#include "prmem.h"

extern JSBool profileMemory(JSContext *cx, JSObject *obj, uintN argc,
                            jsval *argv, jsval *rval);
