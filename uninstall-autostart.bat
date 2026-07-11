@echo off
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MSA Viewer Server.lnk"
if exist "%LINK%" (
    del "%LINK%"
    echo Removed startup shortcut.
) else (
    echo No startup shortcut found.
)
pause
