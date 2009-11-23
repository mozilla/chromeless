@echo off
set VIRTUAL_ENV=%CD%
set CUDDLEFISH_ROOT=%VIRTUAL_ENV%

if defined _OLD_PYTHONPATH (
    set PYTHONPATH=%_OLD_PYTHONPATH%
)
if not defined PYTHONPATH (
    set PYTHONPATH=;
)
set _OLD_PYTHONPATH=%PYTHONPATH%
set PYTHONPATH=%VIRTUAL_ENV%\python-lib;%PYTHONPATH%

if not defined PROMPT (
    set PROMPT=$P$G
)

if defined _OLD_VIRTUAL_PROMPT (
    set PROMPT=%_OLD_VIRTUAL_PROMPT%
)

set _OLD_VIRTUAL_PROMPT=%PROMPT%
set PROMPT=(%VIRTUAL_ENV%) %PROMPT%

if defined _OLD_VIRTUAL_PATH (
    set PATH=%_OLD_VIRTUAL_PATH%
    goto SKIPPATH
)
set _OLD_VIRTUAL_PATH=%PATH%

:SKIPPATH
set PATH=%VIRTUAL_ENV%\bin;%PATH%

:END
