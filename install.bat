@echo off
setlocal

set "SOURCE=%~dp0"
set "VORTEX_DATA=%APPDATA%\Vortex"
set "TARGET=%VORTEX_DATA%\plugins\clean-mod-names"

echo Installing Clean Mod Names to:
echo   %TARGET%
echo.

tasklist /FI "IMAGENAME eq Vortex.exe" /NH 2>nul | find /I "Vortex.exe" >nul
if not errorlevel 1 goto vortex_running

if not exist "%VORTEX_DATA%\" goto vortex_missing
if not exist "%SOURCE%info.json" goto files_missing
if not exist "%SOURCE%index.js" goto files_missing

if not exist "%TARGET%\" mkdir "%TARGET%" || goto copy_failed

copy /Y "%SOURCE%info.json" "%TARGET%\info.json" >nul
if errorlevel 1 goto copy_failed
copy /Y "%SOURCE%index.js" "%TARGET%\index.js" >nul
if errorlevel 1 goto copy_failed

echo Done. Start Vortex to load the extension.
set "RESULT=0"
goto finish

:vortex_running
echo Vortex is running. Close it and run this script again.
set "RESULT=1"
goto finish

:vortex_missing
echo Vortex data folder not found: %VORTEX_DATA%
set "RESULT=1"
goto finish

:files_missing
echo info.json or index.js is missing from: %SOURCE%
set "RESULT=1"
goto finish

:copy_failed
echo Could not copy the files to: %TARGET%
set "RESULT=1"
goto finish

:finish
echo.
pause
exit /b %RESULT%
