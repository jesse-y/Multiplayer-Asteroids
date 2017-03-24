from collections import namedtuple

User = namedtuple('User', 'uid username ws')
Move = namedtuple('Move', 'user keys tick')

Box = namedtuple('Box', 'w h')
Position = namedtuple('Position', 'x, y, a')

class GameObject:
	def __init__(self, x=0, y=0, a=0):
		self.x = x
		self.y = y
		self.a = a

#network messages
MSG_ERROR = 'nm00'
MSG_JOIN = 'nm01'
MSG_QUIT = 'nm02'
MSG_MOVE = 'nm03'
MSG_G_STATE = 'nm04'
MSG_START = 'nm05'