If you're having trouble getting the Jetpack SDK up and running, don't panic!
The SDK is an alpha-stage project under active development, so there are bound
to be some rough edges.

This page lists some starting points that might help you track down your
problem.


Check Your Python
-----------------

The SDK's `cfx` tool runs on Python.  If you're having trouble getting `cfx` to
run at all, make sure you have Python correctly installed.

Try running the following from a command line:

    python --version

`cfx` currently expects Python 2.5 or 2.6.  Older and newer versions may or may
not work.


Check Your Firefox or XULRunner
-------------------------------

`cfx` searches well known locations on your system for Firefox or XULRunner.
`cfx` may not have found an installation, or if you have multiple installations,
`cfx` may have found the wrong one.  In those cases you need to use `cfx`'s
`--binary` option.  See the [cfx Tool] guide for more information.

When you run `cfx` to test your add-on or run unit tests, it prints out the
location of the Firefox or XULRunner binary that it found, so you can check its
output to be sure.

[cfx Tool]: #guide/cfx-tool


Check Your Text Console
-----------------------

When errors are generated in the SDK's APIs and your code, they are logged to
the text console.  This should be the same console or shell from which you ran
the `cfx` command.


Don't Leave Non-Jetpack Files Lying Around
------------------------------------------

Currently the SDK does not gracefully handle files and directories that it does
not expect to encounter.  If there are empty directories or directories or files
that are not related to Jetpack inside your `jetpack-sdk` directory or its
sub-directories, try removing them.


Search for Known Issues
-----------------------

Someone else might have experienced your problem, too.  Other users often post
problems to the [Jetpack mailing list].  You can also browse the list of
[known issues] or [search] for specific keywords.

[known issues]: https://bugzilla.mozilla.org/buglist.cgi?order=Bug%20Number&resolution=---&resolution=DUPLICATE&query_format=advanced&component=Jetpack%20SDK&product=Mozilla%20Labs

[search]: https://bugzilla.mozilla.org/query.cgi?format=advanced&product=Mozilla%20Labs&component=Jetpack%20SDK


Contact the Jetpack Team and User Group
---------------------------------------

Jetpack SDK users and team members discuss problems and proposals on the
[Jetpack mailing list].  Someone else may have had the same problem you do, so
try searching the list.  You're welcome to post a question, too.

You can also chat with other Jetpack users in [#jetpack] on
[Mozilla's IRC network].

And if you'd like to [report a bug in the SDK], that's always welcome!

[Jetpack mailing list]: http://groups.google.com/group/mozilla-labs-jetpack/topics

[#jetpack]: http://mibbit.com/?channel=%23jetpack&server=irc.mozilla.org

[Mozilla's IRC network]: http://irc.mozilla.org/

[report a bug in the SDK]: https://bugzilla.mozilla.org/enter_bug.cgi?alias=&assigned_to=nobody%40mozilla.org&blocked=&bug_file_loc=http%3A%2F%2F&bug_severity=normal&bug_status=UNCONFIRMED&comment=&component=Jetpack%20SDK&contenttypeentry=&contenttypemethod=autodetect&contenttypeselection=text%2Fplain&data=&dependson=&description=&flag_type-325=X&flag_type-37=X&flag_type-4=X&flag_type-607=X&form_name=enter_bug&keywords=&maketemplate=Remember%20values%20as%20bookmarkable%20template&op_sys=All&priority=--&product=Mozilla%20Labs&qa_contact=jetpack-sdk%40mozilla-labs.bugs&rep_platform=All&short_desc=&status_whiteboard=&target_milestone=--&version=Trunk


Run the SDK's Unit Tests
------------------------

The SDK comes with a suite of tests which ensures that its APIs work correctly.
You can run it with the following command:

    cfx testall

Some of the tests will open Firefox windows to check APIs related to the user
interface, so don't be alarmed.  Please let the suite finish before resuming
your work.

When the suite is finished, your text console should contain output that looks
something like this:

    Testing cfx...
    .............................................................
    ----------------------------------------------------------------------
    Ran 61 tests in 4.388s
    
    OK
    Testing reading-data...
    Using binary at '/Applications/Firefox.app/Contents/MacOS/firefox-bin'.
    Using profile at '/var/folders/FL/FLC+17D+ERKgQe4K+HC9pE+++TI/-Tmp-/tmpu26K_5.mozrunner'.
    .info: My ID is 6724fc1b-3ec4-40e2-8583-8061088b3185
    ..
    3 of 3 tests passed.
    OK
    Total time: 4.036381 seconds
    Program terminated successfully.
    Testing all available packages: nsjetpack, test-harness, jetpack-core, development-mode.
    Using binary at '/Applications/Firefox.app/Contents/MacOS/firefox-bin'.
    Using profile at '/var/folders/FL/FLC+17D+ERKgQe4K+HC9pE+++TI/-Tmp-/tmp-dzeaA.mozrunner'.
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    .........................................................................  
    ...............................................
    
    3405 of 3405 tests passed.
    OK
    Total time: 43.105498 seconds
    Program terminated successfully.
    All tests were successful. Ship it!

If you get lots of errors instead, that may be a sign that the SDK does not work
properly on your system.  In that case, please file a bug or send a message to
the mailing list.  See the previous section for information on doing so.
