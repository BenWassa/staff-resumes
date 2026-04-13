' Resume Generator - VBScript Launcher
' This script launches Resume Generator without showing a PowerShell window

Dim objShell
Set objShell = CreateObject("WScript.Shell")

Dim strPath
strPath = objShell.CurrentDirectory & "\Launch-App.ps1"

' Run PowerShell hidden with the launch script
' 0 = hidden window, true = wait for completion
objShell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & strPath & """", 0, true

Set objShell = Nothing
