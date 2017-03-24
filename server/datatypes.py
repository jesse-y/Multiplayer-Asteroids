from collections import namedtuple

User = namedtuple('User', 'uid username ws')

#network messages
MSG_ERROR = 'nm00'
MSG_JOIN = 'nm01'
MSG_QUIT = 'nm02'
MSG_MOVE = 'nm03'
MSG_G_STATE = 'nm04'
MSG_START = 'nm05'