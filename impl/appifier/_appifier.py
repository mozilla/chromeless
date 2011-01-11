import platform
import os

class Appifier(object):
    def __init__(self):
        # instanticate the proper OS-specific Appifier utility class
        s = platform.system()
        if s == 'Darwin':
            import _osx as osappifier
        elif s == 'Linux':
            import _linux as osappifier
        elif s == 'Windows':
            import _win32 as osappifier
 
        self.osappifier = osappifier.OSAppifier()

    def output_application(self, template_root_dir, browser_code, harness_options,
                           dev_mode):
        print "template_root_dir: " + template_root_dir
        print "browser_code: " + browser_code
        browser_code_dir = browser_code
        browser_code_main = "index.html"
        if not os.path.isdir(browser_code_dir):
            browser_code_main = os.path.basename(browser_code)
            browser_code_dir = os.path.dirname(browser_code)
            
        # generate the application shell, returning the parameters of its creation
        # (like, the directory it was output into, and where inside that bundle the
        # xulrunner application files should be put)
        params = self.osappifier.output_app_shell(browser_code_dir=browser_code_dir,
                                                  dev_mode=dev_mode)

        # now generate the xulrunner app, outputing inside the shell generated above
        self.osappifier.output_xulrunner_app(dir= params['xulrunner_app_dir'],
                                             browser_code_dir=browser_code_dir,
                                             browser_code_main=browser_code_main,
                                             dev_mode=dev_mode)
