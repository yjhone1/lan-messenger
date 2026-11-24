find_package(QT NAMES Qt6 Qt5 REQUIRED COMPONENTS Test)
find_package(Qt${QT_VERSION_MAJOR} REQUIRED COMPONENTS Test)

# Crypto unit tests: pure lmcCrypto round-trips, no network, no GUI.
# Fixture dir is baked in at configure time (out-of-source safe).
add_executable(tst_crypto
    unit/tst_crypto.cpp
)

target_compile_definitions(tst_crypto PRIVATE
    LMC_CRYPTO_FIXTURES_DIR="${CMAKE_CURRENT_SOURCE_DIR}/data/crypto"
)

target_link_libraries(tst_crypto PRIVATE lmc_core Qt${QT_VERSION_MAJOR}::Test)

set_target_properties(tst_crypto PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_MINSIZEREL ${CMAKE_BINARY_DIR}/tests
)

add_test(NAME crypto COMMAND tst_crypto)
# tst links Qt Widgets (via lmc_core) so QTest instantiates QApplication:
# no X server needed for headless crypto checks.
set_tests_properties(crypto PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen")

add_executable(tst_security
    unit/tst_security.cpp
)

target_link_libraries(tst_security PRIVATE lmc_core Qt${QT_VERSION_MAJOR}::Test)

set_target_properties(tst_security PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO ${CMAKE_BINARY_DIR}/tests
    RUNTIME_OUTPUT_DIRECTORY_MINSIZEREL ${CMAKE_BINARY_DIR}/tests
)

add_test(NAME security COMMAND tst_security)
set_tests_properties(security PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen")

add_executable(tst_remote unit/tst_remote.cpp)
target_link_libraries(tst_remote PRIVATE lmc_core Qt${QT_VERSION_MAJOR}::Test)
add_test(NAME remote COMMAND tst_remote)
set_tests_properties(remote PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen" TIMEOUT 45)

add_executable(tst_adminauth unit/tst_adminauth.cpp)
target_link_libraries(tst_adminauth PRIVATE lmc_core Qt${QT_VERSION_MAJOR}::Test)
add_test(NAME adminauth COMMAND tst_adminauth)
set_tests_properties(adminauth PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen" TIMEOUT 60)

add_executable(tst_terminationdiagnostics unit/tst_terminationdiagnostics.cpp)
target_link_libraries(tst_terminationdiagnostics PRIVATE lmc_core Qt${QT_VERSION_MAJOR}::Test)
add_test(NAME terminationdiagnostics COMMAND tst_terminationdiagnostics)
set_tests_properties(terminationdiagnostics PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen" TIMEOUT 90)
