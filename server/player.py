import time

import settings
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

	def __init__(self, user, go=GameObject(), pid=-1, c_tick=1):
		#the user id is specific to each server process
		self.user = user
		#the player id is specific to each game the player is in
		self.pid = pid
		self.c_tick = c_tick
		self.go = go

	def __hash__(self):
		return hash(self.user)

	def __str__(self):
		return 'p{}:{}'.format(self.user.uid, self.user.username)

	def input(self, inputs):
		#print('{}>input: got instructions:{}'.format(self, inputs))
		#inputs is an array of 1 item as an artifact from the way javascript's JSON.stringify handles input
		angle = inputs[0]['angle']
		moves = inputs[0]['moves']
		self.c_tick = inputs[0]['c_tick']

		self.go.angle = angle

		x, y = 0, 0
		for move in moves:
			try:
				dx, dy = self.movemap.get(move)
				x, y = x + dx, y + dy
			except:
				print('p_{}:{}>input: invalid move: {}'.format(self.user.uid, self.user.username, move))
				return
		self.go.vec = Vector(x, y)


	def build(self):
		entity = {}
		entity['state'] = self.go.build()
		entity['pid'] = self.pid
		entity['c_tick'] = self.c_tick
		entity['type'] = 'player'
		return entity
