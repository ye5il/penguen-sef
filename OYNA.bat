@echo off
rem Penguen Sef - cift tikla: oyun Lisem'deki kosullarla (onizleme) tarayicida acilir.
rem Bu pencere acik kaldigi surece oyun calisir; kapatinca sunucu durur.
cd /d "%~dp0"
python tools\sunucu.py --ac
