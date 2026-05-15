cmake_minimum_required(VERSION 3.22.1)
project("counterpro")

add_library(
    counterpro
    SHARED
    CounterCore.cpp
    CounterJNI.cpp
)

target_include_directories(counterpro PRIVATE .)
target_compile_options(counterpro PRIVATE -std=c++17)

find_library(log-lib log)
target_link_libraries(counterpro ${log-lib})
