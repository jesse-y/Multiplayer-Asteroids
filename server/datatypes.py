from collections import namedtuple

User = namedtuple('User', 'uid username ws')
Move = namedtuple('Move', 'user tick keys')

Position = namedtuple('Position', 'x, y')
Vector = namedtuple('Vector', 'x y')

#network messages
MSG_ERROR = 'nm00'
MSG_JOIN = 'nm01'
MSG_QUIT = 'nm02'
MSG_MOVE = 'nm03'
MSG_G_STATE = 'nm04'
MSG_START = 'nm05'
MSG_GAMEOVER = 'nm06'
MSG_RESTART = 'nm07'
MSG_STOP_GAME = 'nm08'