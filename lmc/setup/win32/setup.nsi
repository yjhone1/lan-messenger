; LAN Messenger Universal Windows Installation Script (32-bit & 64-bit + Windows 7 Prerequisites)
; Copyright (C) 2010-2026 LAN Messenger Contributors

;Define the compression to be used (lzma gives best compression & deduplication across x86/x64)
SetCompressor /SOLID lzma

;------------------------------------------------------------------------------
;Includes

  !include MUI2.nsh
  !include nsDialogs.nsh
  !include "FileFunc.nsh"
  !include "x64.nsh"
  !include "WinVer.nsh"
  !include "LogicLib.nsh"
  !include "WordFunc.nsh"

;------------------------------------------------------------------------------
;Constants

  !define ProductName "LAN Messenger"
  !define CompanyName "LAN Messenger"
  !ifndef ProductVersion
    !define ProductVersion "1.4.0.3"
  !endif
  !ifndef InstallerVersion
    !define InstallerVersion "1.4.0.3"
  !endif
  !ifndef UniversalBuild
    !define UniversalBuild 0
  !endif
  !ifndef ForceX86
    !define ForceX86 0
  !endif
  !ifndef ExeFolder
    !define ExeFolder "release"
  !endif
  !ifndef X86Folder
    !define X86Folder "release-x86"
  !endif
  !ifndef X64Folder
    !define X64Folder "release-x64"
  !endif
  !ifndef PrereqFolder
    !define PrereqFolder "prereqs"
  !endif
  !ifndef OutFileName
    !if ${UniversalBuild} == 1
      !define OutFileName "lmc-${ProductVersion}-win-setup.exe"
    !else
      !if ${ForceX86} == 1
        !define OutFileName "lmc-${ProductVersion}-win32.exe"
      !else
        !define OutFileName "lmc-${ProductVersion}-win64.exe"
      !endif
    !endif
  !endif

  !define ProductUrl "https://github.com/yjhone1/lan-messenger"
  !define CompanyRegKey "SOFTWARE\${CompanyName}"
  !define AppRegKey "${CompanyRegKey}\${ProductName}"
  !define UninstKey "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${ProductName}"
  !define AppExec "lmc.exe"
  !define Uninstaller "uninst.exe"
  !define CompanyDataDir "$LOCALAPPDATA\${CompanyName}"
  !define AppDataDir "${CompanyDataDir}\${ProductName}"
  !define AppSettingsDir "$APPDATA\${CompanyName}"
  !define StartMenuDir "$SMPROGRAMS\${ProductName}"

;------------------------------------------------------------------------------
;General

  Name "${ProductName}"
  BrandingText $BrandText
  OutFile "${OutFileName}"

  ;Default installation folder (dynamically switched in .onInit for x86 vs x64)
  InstallDir "$PROGRAMFILES\${ProductName}"

  ;Request application privileges for Windows 7 through Windows 11
  RequestExecutionLevel admin

  ;Show details in the installation/uninstallation pages by default
  ShowInstDetails show
  ShowUninstDetails show

;------------------------------------------------------------------------------
;Interface Settings

  !define MUI_ICON "package\images\setup.ico"
  !define MUI_UNICON "package\images\setup.ico"
  !define MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE_BITMAP "package\images\header-r.bmp"
  !define MUI_HEADERIMAGE_UNBITMAP "package\images\header-r.bmp"
  !define MUI_HEADERIMAGE_RIGHT
  !define MUI_WELCOMEFINISHPAGE_BITMAP "package\images\banner.bmp"
  !define MUI_UNWELCOMEFINISHPAGE_BITMAP "package\images\banner.bmp"
  !define MUI_ABORTWARNING

;------------------------------------------------------------------------------
;Pages

  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !insertmacro MUI_PAGE_WELCOME
  !insertmacro MUI_PAGE_LICENSE "package\eula\license.txt"
  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  !define MUI_FINISHPAGE_TITLE_3LINES
  !define MUI_FINISHPAGE_RUN "$INSTDIR\${AppExec}"
  !define MUI_FINISHPAGE_RUN_TEXT "Start ${ProductName}"
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW FinishPageShow
  !insertmacro MUI_PAGE_FINISH

  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_PAGE_CUSTOMFUNCTION_LEAVE un.WelcomePageLeave
  !insertmacro MUI_UNPAGE_WELCOME
  UninstPage custom un.OptionsPageShow un.OptionsPageLeave
  !insertmacro MUI_UNPAGE_INSTFILES
  !insertmacro MUI_UNPAGE_FINISH

;------------------------------------------------------------------------------
;Languages

  !insertmacro MUI_SET MUI_UNCONFIRMPAGE ""
  !insertmacro MUI_LANGUAGE "English"

;------------------------------------------------------------------------------
;Version Information

  VIProductVersion "${InstallerVersion}"
  VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName" "${ProductName}"
  VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName" "${CompanyName}"
  VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright" "Copyright (c) 2010-2026 LAN Messenger Contributors."
  VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "${ProductName} Setup (${OutFileName})"
  VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion" "${ProductVersion}"

;------------------------------------------------------------------------------
;Global variables

  Var DeleteHistory
  Var DeleteSettings
  Var BrandText
  Var SilentMode
  Var ConfigFile
  Var UseX64Build
  Var IsWin7System
  Var NeedVcRedist
  Var NeedUcrt
  Var NeedSha2
  Var ArchLabel

;------------------------------------------------------------------------------
;Installer Section

Section
  DetailPrint "Installing ${ProductName} v${ProductVersion} ($ArchLabel)"

  ;----------------------------------------------------------------------------
  ; Install Windows 7 & VC++ Prerequisites if not already present
  ;----------------------------------------------------------------------------
  ${If} $IsWin7System == "1"
    DetailPrint "Checking Windows 7 prerequisites..."

    ; Optional KB4474419 (SHA-2 Code Signing) if bundled and missing
    ${If} $NeedSha2 == "1"
      DetailPrint "Windows 7 SHA-2 Code Signing update (KB4474419) not detected."
      !if /fileexists "${PrereqFolder}\Windows6.1-KB4474419-v3-x64.msu"
        ${If} ${RunningX64}
          SetOutPath $PLUGINSDIR
          File "${PrereqFolder}\Windows6.1-KB4474419-v3-x64.msu"
          DetailPrint "Installing KB4474419 (x64 SHA-2 Support)..."
          ExecWait '"$WINDIR\System32\wusa.exe" "$PLUGINSDIR\Windows6.1-KB4474419-v3-x64.msu" /quiet /norestart' $0
          DetailPrint "KB4474419 exit code: $0"
        ${EndIf}
      !endif
      !if /fileexists "${PrereqFolder}\Windows6.1-KB4474419-v3-x86.msu"
        ${IfNot} ${RunningX64}
          SetOutPath $PLUGINSDIR
          File "${PrereqFolder}\Windows6.1-KB4474419-v3-x86.msu"
          DetailPrint "Installing KB4474419 (x86 SHA-2 Support)..."
          ExecWait '"$WINDIR\System32\wusa.exe" "$PLUGINSDIR\Windows6.1-KB4474419-v3-x86.msu" /quiet /norestart' $0
          DetailPrint "KB4474419 exit code: $0"
        ${EndIf}
      !endif
    ${Else}
      DetailPrint "Windows 7 SHA-2 support detected."
    ${EndIf}

    ; Optional KB2999226 (Universal CRT) MSU if bundled and missing
    ${If} $NeedUcrt == "1"
      DetailPrint "Universal CRT (KB2999226 / ucrtbase.dll) not detected; will install via prerequisites."
      !if /fileexists "${PrereqFolder}\Windows6.1-KB2999226-x64.msu"
        ${If} ${RunningX64}
          SetOutPath $PLUGINSDIR
          File "${PrereqFolder}\Windows6.1-KB2999226-x64.msu"
          DetailPrint "Installing KB2999226 (x64 Universal CRT)..."
          ExecWait '"$WINDIR\System32\wusa.exe" "$PLUGINSDIR\Windows6.1-KB2999226-x64.msu" /quiet /norestart' $0
          DetailPrint "KB2999226 exit code: $0"
        ${EndIf}
      !endif
      !if /fileexists "${PrereqFolder}\Windows6.1-KB2999226-x86.msu"
        ${IfNot} ${RunningX64}
          SetOutPath $PLUGINSDIR
          File "${PrereqFolder}\Windows6.1-KB2999226-x86.msu"
          DetailPrint "Installing KB2999226 (x86 Universal CRT)..."
          ExecWait '"$WINDIR\System32\wusa.exe" "$PLUGINSDIR\Windows6.1-KB2999226-x86.msu" /quiet /norestart' $0
          DetailPrint "KB2999226 exit code: $0"
        ${EndIf}
      !endif
    ${Else}
      DetailPrint "Universal CRT (ucrtbase.dll) is already installed."
    ${EndIf}
  ${EndIf}

  ${If} $NeedVcRedist == "1"
    ${OrIf} $NeedUcrt == "1"
    StrCpy $R9 "/passive /norestart"
    IfSilent 0 +2
    StrCpy $R9 "/quiet /norestart"
    ${If} $NeedSha2 == "1"
      DetailPrint "Windows 7 lacks KB4474419 (SHA-2); attempting silent vc_redist with app-local CRT/UCRT fallback."
      StrCpy $R9 "/quiet /norestart"
    ${EndIf}

    ${If} $UseX64Build == "1"
      !if /fileexists "${PrereqFolder}\vc_redist.x64.exe"
        DetailPrint "Installing Microsoft Visual C++ 2015-2022 Redistributable (x64)..."
        SetOutPath $PLUGINSDIR
        File "${PrereqFolder}\vc_redist.x64.exe"
        ExecWait '"$PLUGINSDIR\vc_redist.x64.exe" /install $R9' $0
        DetailPrint "vc_redist.x64.exe exit code: $0"
      !else
        DetailPrint "Using bundled app-local x64 runtime libraries (vc_redist.x64.exe not embedded)."
      !endif
    ${Else}
      !if /fileexists "${PrereqFolder}\vc_redist.x86.exe"
        DetailPrint "Installing Microsoft Visual C++ 2015-2022 Redistributable (x86 + Win7 Universal CRT)..."
        SetOutPath $PLUGINSDIR
        File "${PrereqFolder}\vc_redist.x86.exe"
        ExecWait '"$PLUGINSDIR\vc_redist.x86.exe" /install $R9' $0
        DetailPrint "vc_redist.x86.exe exit code: $0"
        ${If} $0 != 0
          ${AndIf} $0 != 3010
          ${AndIf} $0 != 1638
          DetailPrint "Notice: vc_redist.x86.exe returned code $0 (KB4474419/KB2999226 may be needed); bundled app-local UCRT/CRT DLLs enabled."
        ${EndIf}
      !else
        DetailPrint "Using bundled app-local x86 runtime libraries (vc_redist.x86.exe not embedded)."
      !endif
    ${EndIf}
  ${Else}
    DetailPrint "Microsoft Visual C++ Redistributable is already installed."
  ${EndIf}

  ;----------------------------------------------------------------------------
  ; Copy Application Files
  ;----------------------------------------------------------------------------
  DetailPrint "Copying application files ($ArchLabel)..."
  SetOutPath $INSTDIR

  !if ${UniversalBuild} == 1
    ${If} $UseX64Build == "1"
      File /r "..\..\${X64Folder}\*.*"
    ${Else}
      File /r "..\..\${X86Folder}\*.*"
    ${EndIf}
  !else
    File /r "..\..\${ExeFolder}\*.*"
  !endif
  File "..\..\src\resources\text\license.txt"

  ;Create directories in user's Application Data folder
  CreateDirectory "${AppDataDir}\cache"
  CreateDirectory "${AppDataDir}\lang"
  CreateDirectory "${AppDataDir}\logs"

  ;Create directory in user's Documents folder storing received files
  CreateDirectory "$DOCUMENTS\Received Files"

  ;Select appropriate registry view for installation architecture
  ${If} $UseX64Build == "1"
    ${If} ${RunningX64}
      SetRegView 64
    ${EndIf}
  ${Else}
    SetRegView 32
  ${EndIf}

  ;Create uninstaller
  SetOutPath $INSTDIR
  WriteUninstaller "$INSTDIR\${Uninstaller}"

  ;Write application information into the registry
  DetailPrint "Creating Registry entries and keys..."
  WriteRegStr HKLM "${AppRegKey}" "InstallDir" $INSTDIR
  WriteRegStr HKLM "${AppRegKey}" "Version" "${ProductVersion}"
  WriteRegStr HKLM "${AppRegKey}" "FirstRun" "0"
  ${If} $UseX64Build == "1"
    WriteRegStr HKLM "${AppRegKey}" "InstalledArch" "x64"
  ${Else}
    WriteRegStr HKLM "${AppRegKey}" "InstalledArch" "x86"
  ${EndIf}

  StrCpy $ConfigFile ""
  ${GetParameters} $R0
  ${GetOptions} $R0 "/config=" $R1
  IfErrors +2 +1
  StrCpy $ConfigFile "/config=$\"$R1$\""

  ;Sync startup settings silently
  ExecWait "$INSTDIR\${AppExec} $ConfigFile /silent /sync /quit"

  ;Write the uninstall keys for Windows
  WriteRegStr HKLM "${UninstKey}" "DisplayName" "${ProductName}"
  WriteRegStr HKLM "${UninstKey}" "UninstallString" "$INSTDIR\${Uninstaller}"
  WriteRegStr HKLM "${UninstKey}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UninstKey}" "DisplayIcon" "$INSTDIR\${AppExec},0"
  WriteRegStr HKLM "${UninstKey}" "DisplayVersion" "${ProductVersion}"
  WriteRegStr HKLM "${UninstKey}" "Publisher" "${CompanyName}"
  WriteRegStr HKLM "${UninstKey}" "URLInfoAbout" "${ProductUrl}"
  WriteRegStr HKLM "${UninstKey}" "URLUpdateInfo" "${ProductUrl}"
  WriteRegDWORD HKLM "${UninstKey}" "NoModify" 1
  WriteRegDWORD HKLM "${UninstKey}" "NoRepair" 1

  ; Inbound allow (private profile)
  DetailPrint "Adding Windows Firewall rules '${ProductName}' (private profile)..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="${ProductName}"'
  Pop $0
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="${ProductName}" dir=in action=allow program="$INSTDIR\${AppExec}" enable=yes profile=private protocol=TCP description="${ProductName} inbound TCP"'
  Pop $0
  DetailPrint "Firewall TCP rule exit code: $0"
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="${ProductName}" dir=in action=allow program="$INSTDIR\${AppExec}" enable=yes profile=private protocol=UDP description="${ProductName} inbound UDP"'
  Pop $0
  DetailPrint "Firewall UDP rule exit code: $0"

  ;Create Start menu shortcuts (for all users)
  DetailPrint "Adding Start menu shortcuts"
  SetShellVarContext all
  CreateDirectory "${StartMenuDir}"
  CreateShortCut "${StartMenuDir}\${ProductName}.lnk" "$INSTDIR\${AppExec}" "" "$INSTDIR\${AppExec}" \
    0 SW_SHOWNORMAL "" "Send or receive instant messages."
  CreateShortCut "${StartMenuDir}\Uninstall ${ProductName}.lnk" "$INSTDIR\${Uninstaller}" "" "$INSTDIR\${Uninstaller}" \
    0 SW_SHOWNORMAL "" "Uninstall ${ProductName}"
  SetShellVarContext current

SectionEnd

;------------------------------------------------------------------------------
;Uninstaller Section

Section "Uninstall"
  DetailPrint "Uninstalling ${ProductName}"

  ;Delete Start menu shortcuts
  DetailPrint "Removing Start menu shortcuts"
  SetShellVarContext all
  Delete "${StartMenuDir}\*.*"
  RMDir "${StartMenuDir}"
  SetShellVarContext current

  DetailPrint "Removing Windows Firewall rules '${ProductName}'"
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="${ProductName}"'
  Pop $0
  DetailPrint "Firewall remove exit code: $0"

  ;Remove registry keys across both 64-bit and 32-bit views cleanly
  DetailPrint "Deleting registry entries and keys..."
  ${If} ${RunningX64}
    SetRegView 64
    DeleteRegKey HKLM "${UninstKey}"
    DeleteRegKey HKLM "${AppRegKey}"
    DeleteRegKey /ifempty HKLM "${CompanyRegKey}"
  ${EndIf}
  SetRegView 32
  DeleteRegKey HKLM "${UninstKey}"
  DeleteRegKey HKLM "${AppRegKey}"
  DeleteRegKey /ifempty HKLM "${CompanyRegKey}"

  DetailPrint "Removing files and folders"
  ExecWait "$INSTDIR\${AppExec} $DeleteHistory $DeleteSettings /silent /unsync /quit"

  RMDir "$DOCUMENTS\Received Files"

  RMDir /r "${AppDataDir}\cache"
  RMDir /r "${AppDataDir}\themes"
  RMDir /r "${AppDataDir}\lang"
  RMDir /r "${AppDataDir}\logs"

  RMDir "${AppDataDir}"
  RMDir "${CompanyDataDir}"
  RMDir "${AppSettingsDir}"

  Delete "$INSTDIR\${Uninstaller}"
  RMDir /r "$INSTDIR"

SectionEnd

;------------------------------------------------------------------------------
;Functions

  Function CheckPrerequisites
    StrCpy $IsWin7System "0"
    StrCpy $NeedVcRedist "0"
    StrCpy $NeedUcrt "0"
    StrCpy $NeedSha2 "0"

    ; 1. Windows 7 detection + SP1 + UCRT + SHA-2 checks
    ${If} ${IsWin7}
      StrCpy $IsWin7System "1"

      ${IfNot} ${AtLeastServicePack} 1
        MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
          "Windows 7 Service Pack 1 (SP1) is required for full compatibility.$\n$\n\
          Click OK to continue anyway (bundled runtime libraries will be deployed), or Cancel to exit." \
          /SD IDOK IDOK sp1_ok
        Abort
        sp1_ok:
      ${EndIf}

      ; Check Universal CRT (KB2999226 -> ucrtbase.dll)
      ${If} ${RunningX64}
        ${DisableX64FSRedirection}
      ${EndIf}
      IfFileExists "$WINDIR\System32\ucrtbase.dll" ucrt_ok 0
        StrCpy $NeedUcrt "1"
      ucrt_ok:
      ${If} ${RunningX64}
        ${EnableX64FSRedirection}
      ${EndIf}

      ; Check KB4474419 SHA-2 support via crypt32.dll version (>= 6.1.7601.24499)
      GetDLLVersion "$SYSDIR\crypt32.dll" $R0 $R1
      IntOp $R2 $R0 / 0x00010000
      IntOp $R3 $R0 & 0x0000FFFF
      IntOp $R4 $R1 / 0x00010000
      IntOp $R5 $R1 & 0x0000FFFF
      StrCpy $R6 "$R2.$R3.$R4.$R5"
      ${VersionCompare} "$R6" "6.1.7601.24499" $R7
      ${If} $R7 == 2
        StrCpy $NeedSha2 "1"
      ${EndIf}
    ${EndIf}

    ; 2. Check Microsoft Visual C++ 2015-2022 Redistributable
    ${If} $UseX64Build == "1"
      SetRegView 64
      ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
      ${If} $0 != 1
        StrCpy $NeedVcRedist "1"
      ${Else}
        ReadRegDWORD $1 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Bld"
        ${If} $1 < 31000
          StrCpy $NeedVcRedist "1"
        ${EndIf}
      ${EndIf}
    ${Else}
      SetRegView 32
      ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Installed"
      ${If} $0 != 1
        StrCpy $NeedVcRedist "1"
      ${Else}
        ReadRegDWORD $1 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Bld"
        ${If} $1 < 31000
          StrCpy $NeedVcRedist "1"
        ${EndIf}
      ${EndIf}
    ${EndIf}
  FunctionEnd

  Function .onInit
    InitPluginsDir

    ; Determine OS compatibility and select build target
    !if ${UniversalBuild} == 1
      ${If} ${RunningX64}
        ${AndIf} ${AtLeastWin10}
        StrCpy $UseX64Build "1"
        StrCpy $ArchLabel "64-bit / Windows 10+"
        StrCpy $INSTDIR "$PROGRAMFILES64\${ProductName}"
      ${Else}
        StrCpy $UseX64Build "0"
        ${If} ${IsWin7}
          StrCpy $ArchLabel "32-bit Compat / Windows 7"
        ${ElseIf} ${RunningX64}
          StrCpy $ArchLabel "32-bit Compat / Windows 8.x"
        ${Else}
          StrCpy $ArchLabel "32-bit Windows"
        ${EndIf}
        StrCpy $INSTDIR "$PROGRAMFILES32\${ProductName}"
      ${EndIf}
    !else
      !if ${ForceX86} == 1
        StrCpy $UseX64Build "0"
        StrCpy $ArchLabel "32-bit (Win7+)"
        StrCpy $INSTDIR "$PROGRAMFILES32\${ProductName}"
      !else
        ${IfNot} ${RunningX64}
          MessageBox MB_OK|MB_ICONSTOP "This 64-bit installer requires 64-bit Windows. Please use the Universal or 32-bit installer." /SD IDOK
          Abort
        ${EndIf}
        ${IfNot} ${AtLeastWin10}
          MessageBox MB_OK|MB_ICONSTOP "This 64-bit Qt 6 build requires Windows 10 or newer. Please use the Universal installer for Windows 7/8." /SD IDOK
          Abort
        ${EndIf}
        StrCpy $UseX64Build "1"
        StrCpy $ArchLabel "64-bit / Windows 10+"
        StrCpy $INSTDIR "$PROGRAMFILES64\${ProductName}"
      !endif
    !endif

    ; Check if previous InstallDir exists in either 64-bit or 32-bit registry view
    ${If} $UseX64Build == "1"
      SetRegView 64
      ReadRegStr $0 HKLM "${AppRegKey}" "InstallDir"
      ${If} $0 != ""
        StrCpy $INSTDIR $0
      ${EndIf}
    ${Else}
      SetRegView 32
      ReadRegStr $0 HKLM "${AppRegKey}" "InstallDir"
      ${If} $0 != ""
        StrCpy $INSTDIR $0
      ${EndIf}
    ${EndIf}

    StrCpy $BrandText "${ProductName} v${ProductVersion} Setup ($ArchLabel)"
    Call CheckPrerequisites
    Call IsAlreadyInstalled
  FunctionEnd

  ;Check if the application is already installed across both 64-bit and 32-bit registry views
  Function IsAlreadyInstalled
    StrCpy $R0 ""
    StrCpy $R1 ""

    ${If} ${RunningX64}
      SetRegView 64
      ReadRegStr $R0 HKLM "${UninstKey}" "UninstallString"
      ReadRegStr $R1 HKLM "${UninstKey}" "InstallLocation"
    ${EndIf}
    ${If} $R0 == ""
      SetRegView 32
      ReadRegStr $R0 HKLM "${UninstKey}" "UninstallString"
      ReadRegStr $R1 HKLM "${UninstKey}" "InstallLocation"
    ${EndIf}

    StrCmp $R0 "" NotInstalled
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "${ProductName} has already been installed on your computer.$\n$\n\
      Click OK to remove the previous version and continue this installation or Cancel to quit." \
      /SD IDOK IDOK Uninst
    Abort

    Uninst:
    ClearErrors
    StrCpy $SilentMode ""
    IfSilent +1 +2
    StrCpy $SilentMode "/S"
    ExecWait "$R0 $SilentMode _?=$R1" $0
    IntCmp $0 0 0 UninstCancelled UninstCancelled
    IfErrors UninstError
    Delete "$R0"
    RMDir "$R1"
    goto NotInstalled

    UninstError:
    UninstCancelled:
    MessageBox MB_OK|MB_ICONSTOP "Uninstallation of the previous version was cancelled.$\n$\nSetup will now exit." /SD IDOK
    Abort

    NotInstalled:
  FunctionEnd

  Function un.onInit
    StrCpy $BrandText "${ProductName} v${ProductVersion} Uninstaller"
    IfSilent +1 +2
      Call un.IsAppRunning
  FunctionEnd

  Function un.IsAppRunning
    ExecWait "$INSTDIR\${AppExec} /inst" $0
    IntCmp $0 0 NotRunning

    MessageBox MB_OKCANCEL|MB_ICONQUESTION \
      "${ProductName} must be closed to proceed with the uninstall.$\n$\n\
      Click OK to close ${ProductName} or Cancel to quit." \
      /SD IDOK IDOK CloseApp
    SetErrorLevel 1
    Quit

    CloseApp:
    ExecWait "$INSTDIR\${AppExec} /silent /term"

    NotRunning:
  FunctionEnd

;------------------------------------------------------------------------------
;Custom Page Functions

  Var OptionsPage
  Var OptionsPage.DirectoryText
  Var OptionsPage.Directory
  Var OptionsPage.DeleteHistory
  Var OptionsPage.DeleteHistory_State
  Var OptionsPage.DeleteSettings
  Var OptionsPage.DeleteSettings_State
  Var OptionsPage.Text
  Var FinishPage.FinishText

  Function FinishPageShow
    IntCmp $R8 0 NotAborted
    ${NSD_SetText} $mui.FinishPage.Title "${ProductName} was not installed"
    ${NSD_SetText} $mui.FinishPage.Text "The wizard was interrupted before ${ProductName} could be completely installed.$\n$\n\
        Your system has not been modified. To install this program at a later time, please run the installation again."

    SendMessage $mui.FinishPage.Run ${BM_SETCHECK} ${BST_UNCHECKED} 0
    ShowWindow $mui.FinishPage.Run ${SW_HIDE}

    ${NSD_CreateLabel} 120u 120u 195u 10u "Click Finish to close this wizard."
    Pop $FinishPage.FinishText
    SetCtlColors $FinishPage.FinishText "" "${MUI_BGCOLOR}"

    SetErrorLevel 1

    NotAborted:
  FunctionEnd

  Function un.WelcomePageLeave
    Call un.IsAppRunning
  FunctionEnd

  Function un.OptionsPageShow
    nsDialogs::Create 1018
    Pop $OptionsPage
    GetFunctionAddress $0 un.OptionsPageLeave
    nsDialogs::OnBack $0

    ${If} $OptionsPage == error
      Abort
    ${EndIf}

    !insertmacro MUI_HEADER_TEXT_PAGE $(MUI_UNTEXT_CONFIRM_TITLE) $(MUI_UNTEXT_CONFIRM_SUBTITLE)

    ${NSD_CreateLabel} 0 0 100% 12u "${ProductName} will be uninstalled from the following location:"
    Pop $OptionsPage.DirectoryText

    ${NSD_CreateText} 0 13u 100% 12u "$INSTDIR"
    Pop $OptionsPage.Directory
    SendMessage $OptionsPage.Directory ${EM_SETREADONLY} 1 0

    ${NSD_CreateCheckBox} 0 40u 100% 10u "Delete history"
    Pop $OptionsPage.DeleteHistory
    ${NSD_SetState} $OptionsPage.DeleteHistory $OptionsPage.DeleteHistory_State

    ${NSD_CreateCheckBox} 0 55u 100% 10u "Delete preferences"
    Pop $OptionsPage.DeleteSettings
    ${NSD_SetState} $OptionsPage.DeleteSettings $OptionsPage.DeleteSettings_State

    ${NSD_CreateLabel} 0 -13u 100% 12u "Click Uninstall to continue."
    Pop $OptionsPage.Text

    nsDialogs::Show
  FunctionEnd

  Function un.OptionsPageLeave
    ${NSD_GetState} $OptionsPage.DeleteHistory $OptionsPage.DeleteHistory_State
    ${If} $OptionsPage.DeleteHistory_State == ${BST_CHECKED}
      StrCpy $DeleteHistory "/nohistory /nofilehistory"
    ${Else}
      StrCpy $DeleteHistory ""
    ${EndIf}

    ${NSD_GetState} $OptionsPage.DeleteSettings $OptionsPage.DeleteSettings_State
    ${If} $OptionsPage.DeleteSettings_State == ${BST_CHECKED}
      StrCpy $DeleteSettings "/noconfig"
    ${Else}
      StrCpy $DeleteSettings ""
    ${EndIf}
  FunctionEnd