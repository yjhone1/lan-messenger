param([Parameter(Mandatory = $true)][string]$Prefix)

$ErrorActionPreference = 'Stop'
if ($env:VCToolsVersion -notmatch '^14\.29\.') {
    throw "The Win7 compatibility build requires MSVC v142 (14.29), got '$env:VCToolsVersion'."
}

# Qt's official 5.15.2 Windows binaries load libssl-1_1/libcrypto-1_1.
# Keep the x86 application and Qt TLS backend on the same ABI. This legacy
# dependency is isolated from the Qt 6 / OpenSSL 3 Windows 10/11 build.
$required = @('include/openssl/evp.h', 'lib/libcrypto.lib', 'lib/libssl.lib',
              'bin/libcrypto-1_1.dll', 'bin/libssl-1_1.dll')
$missing = @($required | Where-Object { -not (Test-Path (Join-Path $Prefix $_)) })
if ($missing.Count -gt 0) {
    $version = '1.1.1w'
    $sha256 = 'cf3098950cb4d853ad95c0841f1f9c6d3dc102dccfcacd521d93925208b76ac8'
    $workspace = Join-Path $env:RUNNER_TEMP 'lmc-openssl-win32'
    New-Item -ItemType Directory -Force -Path $workspace | Out-Null
    $archive = Join-Path $workspace "openssl-$version.tar.gz"
    Invoke-WebRequest -Uri "https://github.com/openssl/openssl/releases/download/OpenSSL_1_1_1w/openssl-$version.tar.gz" -OutFile $archive -TimeoutSec 120
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sha256) {
        throw 'OpenSSL source checksum mismatch.'
    }
    & tar.exe -xf $archive -C $workspace
    if ($LASTEXITCODE -ne 0) { throw 'OpenSSL source extraction failed.' }
    $perl = (Get-Command perl.exe -ErrorAction Stop).Source
    $originalCc = $env:CC
    $originalCxx = $env:CXX
    Push-Location (Join-Path $workspace "openssl-$version")
    try {
        # CMake's absolute CC/CXX paths contain spaces. OpenSSL 1.1's nmake
        # generator does not quote those environment values; use PATH here.
        $env:CC = 'cl'
        $env:CXX = 'cl'
        & $perl Configure VC-WIN32 shared no-asm no-tests '-D_WIN32_WINNT=0x0601' "--prefix=$Prefix" "--openssldir=$Prefix/ssl"
        if ($LASTEXITCODE -ne 0) { throw 'OpenSSL Configure failed.' }
        & nmake.exe /nologo
        if ($LASTEXITCODE -ne 0) { throw 'OpenSSL build failed.' }
        & nmake.exe /nologo install_sw
        if ($LASTEXITCODE -ne 0) { throw 'OpenSSL installation failed.' }
    } finally {
        $env:CC = $originalCc
        $env:CXX = $originalCxx
        Pop-Location
    }
}

foreach ($relative in $required) {
    if (-not (Test-Path (Join-Path $Prefix $relative))) { throw "Missing OpenSSL file: $relative" }
}
"OPENSSL_ROOT_DIR=$Prefix" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
"OPENSSL_INCLUDE_DIR=$Prefix/include" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
"OPENSSL_CRYPTO_LIBRARY=$Prefix/lib/libcrypto.lib" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
"OPENSSL_SSL_LIBRARY=$Prefix/lib/libssl.lib" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
"OPENSSL_BIN_DIR=$Prefix/bin" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
& "$Prefix/bin/openssl.exe" version -a
if ($LASTEXITCODE -ne 0) { throw 'Built OpenSSL executable failed to start.' }
