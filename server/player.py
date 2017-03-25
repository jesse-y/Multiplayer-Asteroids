from datatypes import User, Vector
from game_object import GameObject

class Player:

	keymap = {
		37:'LEFT',
		65:'LEFT',
		38:'UP',
		87:'UP',
		39:'RIGHT',
		68:'RIGHT',
		40:'DOWN',
		83:'DOWN'
	}

	movemap = {
		'UP'   : Vector(0,-1),
		'DOWN' : Vector(0,1),
		'LEFT' : Vector(-1, 0),
		'RIGHT': Vector(1, 0)
	}

	def __init__(self, user, go=GameObject(), pid=-1):
		#the user id is specific to each server process
		self.user = user
		#the player id is specific to each game the player is in
		self.pid = pid
		self.go = go

	def __hash__(self):
		return hash(self.user)

	def __str__(self):
		return 'p{}:{}'.format(self.user.uid, self.user.username)

	def input(self, moves):
		#print('{}>input: got instructions:{}'.format(self, moves))
		x, y = 0, 0
		for move in moves:
			dx, dy = self.movemap.get(move)
			x, y = x + dx, y + dy
		self.go.vec = Vector(x, y)

	def build(self):
		entity = self.go.build()
		entity['pid'] = self.pid
