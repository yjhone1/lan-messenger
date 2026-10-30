cmake_minimum_required(VERSION 3.16)

# Allow opening either root /CMakeLists.txt or /lmc/CMakeLists.txt directly in Qt Creator
if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    project(lan-messenger VERSION 1.3.0 LANGUAGES CXX)
    set(LMC_VERSION "1.3.0" CACHE STRING "Application display version")
    set(CMAKE_CXX_STANDARD 17)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
    set(CMAKE_AUTOMOC ON)
    set(CMAKE_AUTOUIC ON)
    set(CMAKE_AUTORCC ON)
    if(WIN32)
        enable_language(RC)
        add_compile_definitions(UNICODE _UNICODE)
    endif()
    if(NOT TARGET lmcapp AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../lmcapp/CMakeLists.txt")
        add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../lmcapp" "${CMAKE_CURRENT_BINARY_DIR}/lmcapp")
    endif()
endif()

find_package(Qt6 6.2 REQUIRED COMPONENTS Core Gui Widgets Network Xml)
find_package(Qt6 6.2 QUIET COMPONENTS LinguistTools)
if(UNIX)
    find_package(Qt6 6.2 REQUIRED COMPONENTS Multimedia)
endif()
find_package(OpenSSL REQUIRED)

# Generated runtime files (lmc.rcc, *.qm) land here; the flat release layout
# itself is staged from the install() rules at the bottom.
set(LMC_RUNTIME_DIR ${CMAKE_CURRENT_BINARY_DIR}/runtime)
set(LMC_RES_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/resources)

add_library(lmc_core STATIC
    src/gui/main/aboutdialog.cpp
    src/gui/chat/broadcastwindow.cpp
    src/gui/chat/chathelper.cpp
    src/gui/chat/chatroomwindow.cpp
    src/gui/chat/chatwindow.cpp
    src/core/crypto.cpp
    src/network/datagram.cpp
    src/messaging/filemessagingproc.cpp
    src/gui/files/filemodelview.cpp
    src/gui/main/helpwindow.cpp
    src/messaging/history.cpp
    src/gui/history/historywindow.cpp
    src/gui/widgets/imagepicker.cpp
    src/gui/widgets/imagepickeraction.cpp
    src/app/apprunner.cpp
    src/app/lmc.cpp
    src/core/lmcstrings.cpp
    src/gui/main/mainwindow.cpp
    src/messaging/message.cpp
    src/gui/chat/messagelog.cpp
    src/messaging/messaging.cpp
    src/messaging/messagingproc.cpp
    src/network/netstreamer.cpp
    src/network/network.cpp
    src/gui/widgets/qmessagebrowser.cpp
    src/core/settings.cpp
    src/gui/main/settingsdialog.cpp
    src/core/shared.cpp
    src/core/soundplayer.cpp
    src/gui/widgets/subcontrols.cpp
    src/network/tcpnetwork.cpp
    src/core/theme.cpp
    src/core/trace.cpp
    src/gui/files/transferlistview.cpp
    src/gui/files/transferwindow.cpp
    src/network/udpnetwork.cpp
    src/gui/main/updatewindow.cpp
    src/gui/contacts/userinfowindow.cpp
    src/gui/contacts/userselectdialog.cpp
    src/gui/contacts/usertreewidget.cpp
    src/network/webnetwork.cpp
    src/messaging/xmlmessage.cpp
    src/remote/remoteserver.cpp
    src/remote/remoteclient.cpp
    src/remote/remoteviewerwindow.cpp
    src/remote/remotedefinitions.h
    src/remote/remoteserver.h
    src/remote/remoteclient.h
    src/remote/remoteviewerwindow.h
    src/gui/widgets/actionhelper.h
    src/gui/main/aboutdialog.h
    src/gui/chat/broadcastwindow.h
    src/gui/chat/chatdefinitions.h
    src/gui/chat/chatwindow.h
    src/gui/chat/chathelper.h
    src/gui/chat/chatroomwindow.h
    src/core/crypto.h
    src/network/datagram.h
    src/core/definitions.h
    src/gui/files/filemodelview.h
    src/gui/main/helpwindow.h
    src/messaging/history.h
    src/gui/history/historytreewidget.h
    src/gui/history/historywindow.h
    src/gui/widgets/imagepicker.h
    src/gui/widgets/imagepickeraction.h
    src/app/apprunner.h
    src/app/lmc.h
    src/core/lmcstrings.h
    src/gui/main/mainwindow.h
    src/messaging/message.h
    src/gui/chat/messagelog.h
    src/messaging/messaging.h
    src/network/netstreamer.h
    src/network/network.h
    src/gui/widgets/qmessagebrowser.h
    src/app/resource.h
    src/core/settings.h
    src/gui/main/settingsdialog.h
    src/core/shared.h
    src/core/soundplayer.h
    src/core/stdlocation.h
    src/gui/widgets/subcontrols.h
    src/network/tcpnetwork.h
    src/core/theme.h
    src/core/trace.h
    src/gui/files/transferlistview.h
    src/gui/files/transferwindow.h
    src/core/uidefinitions.h
    src/network/udpnetwork.h
    src/gui/main/updatewindow.h
    src/gui/contacts/userinfowindow.h
    src/gui/contacts/userselectdialog.h
    src/gui/contacts/usertreewidget.h
    src/network/webnetwork.h
    src/messaging/xmlmessage.h
    src/gui/main/aboutdialog.ui
    src/gui/chat/broadcastwindow.ui
    src/gui/chat/chatroomwindow.ui
    src/gui/chat/chatwindow.ui
    src/gui/main/helpwindow.ui
    src/gui/history/historywindow.ui
    src/gui/main/mainwindow.ui
    src/gui/main/settingsdialog.ui
    src/gui/files/transferwindow.ui
    src/gui/main/updatewindow.ui
    src/gui/contacts/userinfowindow.ui
    src/gui/contacts/userselectdialog.ui
)

target_compile_definitions(lmc_core PUBLIC
    QT_DISABLE_DEPRECATED_BEFORE=0x060000
    "IDA_VERSION=\"${LMC_VERSION}\""
)

target_include_directories(lmc_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_BINARY_DIR}/lmc_core_autogen/include
    ${CMAKE_CURRENT_BINARY_DIR}/lmc_core_autogen/include_$<CONFIG>
)

target_link_libraries(lmc_core
    PUBLIC
        lmcapp
        Qt6::Core
        Qt6::Gui
        Qt6::Widgets
        Qt6::Network
        Qt6::Xml
        OpenSSL::Crypto
)

if(UNIX)
    target_link_libraries(lmc_core PUBLIC Qt6::Multimedia)
endif()

if(WIN32)
    target_link_libraries(lmc_core PUBLIC advapi32)
endif()

add_executable(lmc WIN32
    src/app/main.cpp
    src/resource.qrc
)
target_link_libraries(lmc PRIVATE lmc_core)

if(WIN32)
    target_sources(lmc PRIVATE src/app/lmcwin32.rc)
    set_target_properties(lmc PROPERTIES OUTPUT_NAME lmc)
elseif(APPLE)
    target_sources(lmc PRIVATE src/app/lmc.icns)
    set_source_files_properties(src/app/lmc.icns PROPERTIES
        MACOSX_PACKAGE_LOCATION Resources
    )
    set_target_properties(lmc PROPERTIES
        OUTPUT_NAME "LAN-Messenger"
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_ICON_FILE lmc.icns
        MACOSX_BUNDLE_BUNDLE_NAME "LAN-Messenger"
        MACOSX_BUNDLE_GUI_IDENTIFIER "io.github.lanmessenger.lmc"
    )
else()
    set_target_properties(lmc PROPERTIES OUTPUT_NAME lan-messenger)
endif()

add_custom_command(
    OUTPUT ${LMC_RUNTIME_DIR}/lmc.rcc
    COMMAND ${CMAKE_COMMAND} -E make_directory ${LMC_RUNTIME_DIR}
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${LMC_RES_DIR}/sounds ${CMAKE_CURRENT_BINARY_DIR}/sounds
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${LMC_RES_DIR}/sounds ${LMC_RUNTIME_DIR}/sounds
    COMMAND Qt6::rcc -binary ${CMAKE_CURRENT_SOURCE_DIR}/src/resource.qrc
            -o ${LMC_RUNTIME_DIR}/lmc.rcc
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/src/resource.qrc
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/src
    COMMENT "Building external resource bundle lmc.rcc and staging sounds/"
    VERBATIM
)

set(LMC_QM_OUTPUTS "")
set(LMC_TRANSLATIONS_DIR "${CMAKE_SOURCE_DIR}/translations")
if(NOT EXISTS "${LMC_TRANSLATIONS_DIR}" AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../translations")
    set(LMC_TRANSLATIONS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../translations")
endif()
if(TARGET Qt6::lrelease AND EXISTS "${LMC_TRANSLATIONS_DIR}")
    file(GLOB LMC_TS_FILES CONFIGURE_DEPENDS
         ${LMC_TRANSLATIONS_DIR}/lmc_*.ts)
    list(SORT LMC_TS_FILES)

    foreach(ts IN LISTS LMC_TS_FILES)
        get_filename_component(ts_name ${ts} NAME_WE)
        string(REGEX REPLACE "^lmc_" "" qm_name ${ts_name})
        set(qm_out ${LMC_RUNTIME_DIR}/lang/${qm_name}.qm)
        add_custom_command(
            OUTPUT ${qm_out}
            COMMAND ${CMAKE_COMMAND} -E make_directory ${LMC_RUNTIME_DIR}/lang
            COMMAND Qt6::lrelease ${ts} -qm ${qm_out}
            DEPENDS ${ts}
            COMMENT "lrelease ${qm_name}.ts"
            VERBATIM
        )
        list(APPEND LMC_QM_OUTPUTS ${qm_out})
    endforeach()
endif()

add_custom_target(lmc_runtime_files ALL
    DEPENDS
        ${LMC_RUNTIME_DIR}/lmc.rcc
        ${LMC_QM_OUTPUTS}
)
add_dependencies(lmc lmc_runtime_files)
