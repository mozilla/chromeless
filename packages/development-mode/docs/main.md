This program simply pings a local "task queue" server using AJAX long
polling. When a program needs to be run, this program obtains
a JSON blob containing configuration information from the task queue
server and uses it to bootstrap the program. This goes on
indefinitely, until the application exits.
