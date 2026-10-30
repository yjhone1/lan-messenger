cmake_minimum_required(VERSION 3.16)

if(POLICY CMP0177)
    cmake_policy(SET CMP0177 NEW)
endif()

project(lan-messenger VERSION 1.3.0 LANGUAGES CXX)

# Display version: 1.3.0 (based on v1.2.39 + OpenSSL 3.0/1.0 Compat + Remote Desktop).
set(LMC_VERSION "1.3.0" CACHE STRING "Application display version")
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
