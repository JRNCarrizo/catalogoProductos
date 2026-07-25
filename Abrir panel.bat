@echo off
title Panel del catalogo
cd /d "%~dp0"

echo Iniciando el catalogo y el panel de carga...
start "Catalogo (vista previa)" /min cmd /c "npm run dev"
npm run panel
