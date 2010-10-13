#include "nsIJetpack.h"
#include "nsIXPCScriptable.h"

#define NSJETPACKDI_CONTRACTID "@labs.mozilla.com/jetpackdi;1"
#define NSJETPACKDI_CLASSNAME "nsJetpack"
#define NSJETPACKDI_CID \
  {0x5edcebb5, 0x658f, 0x483c, \
    { 0x9f, 0x40, 0x3a, 0x69, 0x02, 0xe4, 0xd8, 0x56 }}

class nsJetpack : public nsIJetpack, public nsIXPCScriptable
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIJETPACK
  NS_DECL_NSIXPCSCRIPTABLE

  nsJetpack();

private:
  virtual ~nsJetpack();

protected:
  /* additional members */
};
