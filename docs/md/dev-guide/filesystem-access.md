# Accessing the File System

Application code in Chromeless apps have full access to the user's file system. This access is exposed in three different modules:

  * [**file**](#module/api-utils/file) – Reading and writing of individual files
  * [**path**](#module/chromeless-kit/path) – Provides abstractions for the manipulation of file paths, but will never touch the file system.
  * [**fs**](#module/chromeless-kit/fs) – Includes functions which can query and manipulate the file system, and don’t fit into the two categories above (for example, directory manipulation and file copy live here).
  
In addition to these low level utilities, the [**app-paths**](#module/chromeless-kit/app-paths) offers an abstract way of getting at various standard filesystem paths.
