@echo off
REM Starts a local server and opens the design system with the visual builder.
REM The builder needs a server: opening index.html directly blocks some browser features.
cd /d "%~dp0"
start "" http://localhost:8731/projects.html
python -m http.server 8731
