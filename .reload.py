import os, signal
os.kill(1, signal.SIGHUP)
print('HUP sent to PID 1')
