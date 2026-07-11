@echo off
cd /d "%~dp0"
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MSA Viewer Server.lnk"
powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut('%LINK%'); $s.TargetPath='%CD%\start-server.bat'; $s.Arguments='silent'; $s.WorkingDirectory='%CD%'; $s.WindowStyle=7; $s.Description='MSA Viewer local server (http://localhost:3000)'; $s.Save()"
echo Startup shortcut created:
echo   %LINK%
echo.
echo The server will start automatically when you log in to Windows.
echo To remove it, run uninstall-autostart.bat
pause
