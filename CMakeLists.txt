cmake_minimum_required(VERSION 3.16)

if(POLICY CMP0177)
    cmake_policy(SET CMP0177 NEW)
endif()

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/VERSION")
    file(STRINGS "${CMAKE_CURRENT_SOURCE_DIR}/VERSION" _lmc_ver_line LIMIT_COUNT 1)
    string(STRIP "${_lmc_ver_line}" _lmc_ver_default)
else()
    set(_lmc_ver_default "1.4.0.3")
endif()

project(lan-messenger VERSION ${_lmc_ver_default} LANGUAGES CXX)

# Synchronize LMC_VERSION with _lmc_ver_default (preserves exact strings like 1.3.02 and overwrites stale CMakeCache.txt).
set(LMC_VERSION "${_lmc_ver_default}" CACHE STRING "Application display version" FORCE)
message(STATUS "LMC version: ${LMC_VERSION}")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Export compile_commands.json for clangd / IDEs (Qt Creator).
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

if(WIN32)
    enable_language(RC)
    # win32-msvc mkspec defines UNICODE/_UNICODE (TCHAR is wchar_t); the code
    # relies on it (qtlockedfile_win.cpp, shared.cpp getLogonName).
    add_compile_definitions(UNICODE _UNICODE)
    option(LMC_WIN7_COMPAT "Target Windows 7 (_WIN32_WINNT=0x0601) API baseline" OFF)
    if(LMC_WIN7_COMPAT)
        add_compile_definitions(_WIN32_WINNT=0x0601 WINVER=0x0601)
    endif()
endif()

if(MSVC)
    add_compile_options(/utf-8)
endif()

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

add_subdirectory(lmcapp)
add_subdirectory(lmc)

option(LMC_BUILD_TESTS "Build unit tests and test agent" OFF)
if(LMC_BUILD_TESTS AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/tests/CMakeLists.txt")
    enable_testing()
    add_subdirectory(tests)
endif()

# lmm test daemon. OFF by default in Qt Creator to keep the default build fast.
option(LMC_BUILD_LMM "Build the lmm test daemon (tools/lmm)" OFF)
if(LMC_BUILD_LMM AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/tools/lmm/CMakeLists.txt")
    add_subdirectory(tools/lmm)
endif()

# In-process GUI test agent (the lan-messenger-test binary).
if(LMC_BUILD_TESTS AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/tools/lmc-agent/CMakeLists.txt")
    add_subdirectory(tools/lmc-agent)
endif()
