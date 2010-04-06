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

#include "server_socket.h"

#include "nspr.h"

static JSBool createWithFd(JSContext *cx, jsval *rval, PRFileDesc *fd);

static JSBool getSocket(JSContext *cx, JSObject *obj, PRFileDesc **fd)
{
  *fd = (PRFileDesc *) JS_GetInstancePrivate(
    cx,
    obj,
    &sServerSocket_JSClass,
    NULL
    );
  if (*fd == NULL) {
    JS_ReportError(cx, "ServerSocket method called on "
                   "non-ServerSocket object.");
    return JS_FALSE;
  }
  return JS_TRUE;
}

static void finalize(JSContext *cx, JSObject *obj)
{
  PRFileDesc *fd = (PRFileDesc *) JS_GetPrivate(cx, obj);
  if (fd != NULL) {
    // Just in case, ensure we don't have a dangling pointer.
    JS_SetPrivate(cx, obj, NULL);
    PR_Close(fd);
  }
}

JSClass sServerSocket_JSClass = {
  "SimpleSocket",
  JSCLASS_HAS_PRIVATE,
  JS_PropertyStub,          JS_PropertyStub,
  JS_PropertyStub,          JS_PropertyStub,
  JS_EnumerateStub,         JS_ResolveStub,
  JS_ConvertStub,           finalize,
  NULL,                     NULL,
  NULL,                     NULL,
  NULL,                     NULL,
  NULL,                     NULL
};

static JSBool send(JSContext *cx, JSObject *obj, uintN argc,
                   jsval *argv, jsval *rval)
{
  JSString *data;

  if (!JS_ConvertArguments(cx, argc, argv, "S", &data))
    return JS_FALSE;

  char *dataBytes = JS_GetStringBytes(data);
  size_t dataLength = JS_GetStringLength(data);

  if (dataLength > 0) {
    PRFileDesc *fd;
    if (!getSocket(cx, obj, &fd))
      return JS_FALSE;
    
    jsrefcount rc = JS_SuspendRequest(cx);
    PRInt32 sent = PR_Send(fd, dataBytes, dataLength, 0,
                           PR_INTERVAL_NO_TIMEOUT);
    JS_ResumeRequest(cx, rc);

    if (sent == -1) {
      JS_ReportError(cx, "Send failed.");
      return JS_FALSE;
    }
  }

  *rval = JSVAL_VOID;
  return JS_TRUE;
}

static JSBool recv(JSContext *cx, JSObject *obj, uintN argc,
                   jsval *argv, jsval *rval)
{
  PRInt32 length;

  if (!JS_ConvertArguments(cx, argc, argv, "i", &length))
    return JS_FALSE;

  PRFileDesc *fd;
  if (!getSocket(cx, obj, &fd))
    return JS_FALSE;

  char *buffer = (char *)PR_Malloc(length * sizeof(char));
  jsrefcount rc = JS_SuspendRequest(cx);
  PRInt32 recvd = PR_Recv(fd, buffer, length, 0, PR_INTERVAL_NO_TIMEOUT);
  JS_ResumeRequest(cx, rc);

  if (recvd == -1) {
    JS_ReportError(cx, "Receive failed.");
    PR_Free(buffer);
    return JS_FALSE;
  }

  if (recvd == 0) {
    *rval = JSVAL_NULL;
    PR_Free(buffer);
    return JS_TRUE;
  }

  JSString *string = JS_NewStringCopyN(cx, buffer, length);
  if (string == NULL) {
    JS_ReportOutOfMemory(cx);
    PR_Free(buffer);
    return JS_FALSE;
  }

  *rval = STRING_TO_JSVAL(string);
  PR_Free(buffer);
  return JS_TRUE;
}

static JSBool close(JSContext *cx, JSObject *obj, uintN argc,
                    jsval *argv, jsval *rval)
{
  PRFileDesc *fd;
  if (!getSocket(cx, obj, &fd))
    return JS_FALSE;

  PRStatus result = PR_Close(fd);
  if (result != PR_SUCCESS) {
    JS_ReportError(cx, "Close failed.");
    return JS_FALSE;
  }

  JS_SetPrivate(cx, obj, NULL);

  *rval = JSVAL_VOID;
  return JS_TRUE;
}

static JSBool listen(JSContext *cx, JSObject *obj, uintN argc,
                     jsval *argv, jsval *rval)
{
  PRInt32 backlog = 0;

  if (!JS_ConvertArguments(cx, argc, argv, "/i", &backlog))
    return JS_FALSE;

  PRFileDesc *fd;
  if (!getSocket(cx, obj, &fd))
    return JS_FALSE;

  PRStatus result = PR_Listen(fd, backlog);

  if (result != PR_SUCCESS) {
    JS_ReportError(cx, "Listen failed.");
    return JS_FALSE;
  }

  *rval = JSVAL_VOID;
  return JS_TRUE;
}

static JSBool accept(JSContext *cx, JSObject *obj, uintN argc,
                     jsval *argv, jsval *rval)
{
  PRIntervalTime timeout = PR_INTERVAL_NO_TIMEOUT;

  if (!JS_ConvertArguments(cx, argc, argv, "/i", &timeout))
    return JS_FALSE;

  PRFileDesc *fd;
  if (!getSocket(cx, obj, &fd))
    return JS_FALSE;

  PRNetAddr addr;

  jsrefcount rc = JS_SuspendRequest(cx);
  PRFileDesc *conn = PR_Accept(fd, &addr, timeout);
  JS_ResumeRequest(cx, rc);

  if (conn == NULL) {
    *rval = JSVAL_NULL;
    return JS_TRUE;
  }

  // TODO: We should really be passing in addr here, right?
  return createWithFd(cx, rval, conn);
}

static JSBool bind(JSContext *cx, JSObject *obj, uintN argc,
                   jsval *argv, jsval *rval)
{
  const char *addrStr;
  PRUint16 port;

  if (!JS_ConvertArguments(cx, argc, argv, "sc", &addrStr, &port))
    return JS_FALSE;

  PRFileDesc *fd;
  if (!getSocket(cx, obj, &fd))
    return JS_FALSE;

  PRNetAddr addr;
  if (!PR_SetNetAddr(PR_IpAddrV4Mapped, PR_AF_INET, port, &addr)) {
    JS_ReportError(cx, "Setting of net addr failed.");
    return JS_FALSE;
  }

  PRStatus result = PR_StringToNetAddr(addrStr, &addr);

  if (result != PR_SUCCESS) {
    JS_ReportError(cx, "Invalid address.");
    return JS_FALSE;
  }

  result = PR_Bind(fd, &addr);

  if (result != PR_SUCCESS) {
    JS_ReportError(cx, "Bind failed.");
    return JS_FALSE;
  }

  *rval = JSVAL_VOID;
  return JS_TRUE;
}

static JSFunctionSpec methods[] = {
  JS_FS("bind",          bind,        2, 0, 0),
  JS_FS("listen",        listen,      0, 0, 0),
  JS_FS("accept",        accept,      0, 0, 0),
  JS_FS("send",          send,        1, 0, 0),
  JS_FS("recv",          recv,        1, 0, 0),
  JS_FS("close",         close,       0, 0, 0),
  JS_FS_END
};

static JSBool createWithFd(JSContext *cx, jsval *rval, PRFileDesc *fd)
{
  JSAutoLocalRootScope autoScope(cx);

  JSObject *object = JS_NewObject(
    cx,
    &sServerSocket_JSClass,
    NULL,
    NULL
    );

  if (!JS_DefineFunctions(cx, object, methods))
    return JS_FALSE;

  if (!JS_SetPrivate(cx, object, fd)) {
    PR_Close(fd);
    return JS_FALSE;
  }

  *rval = OBJECT_TO_JSVAL(object);
  return JS_TRUE;
}

JSBool createServerSocket(JSContext *cx, JSObject *obj, uintN argc,
                          jsval *argv, jsval *rval)
{
  PRFileDesc *fd = PR_OpenTCPSocket(PR_AF_INET);
  if (fd == NULL) {
    JS_ReportError(cx, "Creation of TCP socket failed.");
    return JS_FALSE;
  }

  return createWithFd(cx, rval, fd);
}
