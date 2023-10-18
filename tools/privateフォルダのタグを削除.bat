@echo off
set batdir=%~dp0
set exe=%batdir%reremove.exe
set datadir=%batdir%..

set input=%datadir%\private
%exe% %input% --config %datadir%\config

pause