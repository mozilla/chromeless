@echo off
set VIRTUAL_ENV=%CD%
set CUDDLEFISH_ROOT=%VIRTUAL_ENV%

SET WINCURVERKEY=HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion
REG QUERY "%WINCURVERKEY%" /v "ProgramFilesDir (x86)" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  SET WIN64=1
) else (
  SET WIN64=0
)

if "%WIN64%" EQU "1" (
  SET PYTHONKEY=HKLM\SOFTWARE\Wow6432Node\Python\PythonCore
) else (
  SET PYTHONKEY=HKLM\SOFTWARE\Python\PythonCore
)

SET PYTHONVERSION=
SET PYTHONINSTALL=

if "%PYTHONVERSION%" EQU "" (
  REG QUERY "%PYTHONKEY%\2.6\InstallPath" /ve >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    SET PYTHONVERSION=2.6
  )
)

if "%PYTHONVERSION%" EQU "" (
  REG QUERY "%PYTHONKEY%\2.5\InstallPath" /ve >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    SET PYTHONVERSION=2.5
  )
)

if "%PYTHONVERSION%" EQU "" (
  REG QUERY "%PYTHONKEY%\2.4\InstallPath" /ve >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    SET PYTHONVERSION=2.4
  )
)

if "%PYTHONVERSION%" NEQ "" (
  FOR /F "tokens=3* skip=1 delims=	 " %%A IN ('REG QUERY "%PYTHONKEY%\%PYTHONVERSION%\InstallPath" /ve') DO SET "PYTHONINSTALL=%%A"
)

if "%PYTHONINSTALL%" NEQ "" (
  SET "PATH=%PATH%;%PYTHONINSTALL%"
)

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

python -c "from jetpack_sdk_env import welcome; welcome()"

:END
