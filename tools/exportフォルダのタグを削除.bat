@echo off
set batdir=%~dp0
set exe=%batdir%reremove.exe
set datadir=%batdir%..

set input=%datadir%\export
%exe% %input% --config %datadir%\config

pause