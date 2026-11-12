find_package(QT NAMES Qt6 Qt5 REQUIRED COMPONENTS Core Network Widgets)
find_package(Qt${QT_VERSION_MAJOR} REQUIRED COMPONENTS Core Network Widgets)

# qtlockedfile*.cpp are not compiled standalone: they are textually included
# into qtlocalpeer.cpp inside the QtLP_Private namespace
# (see qtlocalpeer.cpp:65-71).
#
# OBJECT, not SHARED: lmcapp has a single consumer (lmc_core)
add_library(lmcapp OBJECT
    src/application.cpp
    src/application.h
    src/qtlocalpeer.cpp
    src/qtlocalpeer.h
    src/qtlockedfile.h
    src/qtsingleapplication.cpp
    src/qtsingleapplication.h
)

# Single header set in src/, exposed to the consumer build.
target_include_directories(lmcapp
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/src>
)

if(QT_VERSION_MAJOR EQUAL 6)
    target_compile_definitions(lmcapp PRIVATE
        QT_DISABLE_DEPRECATED_BEFORE=0x060000
    )
endif()

target_link_libraries(lmcapp
    PUBLIC
        Qt${QT_VERSION_MAJOR}::Core
        Qt${QT_VERSION_MAJOR}::Network
        Qt${QT_VERSION_MAJOR}::Widgets
)
