import time
from math import atan2, cos, sin

import settings
from datatypes import User, Vector, Position
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

	def __init__(self, user, go=None, pid=-1):
		#the user id is specific to each server process
		self.user = user
		#the player id is specific to each game the player is in
		self.pid = pid
		self.go = go
		self.clicked = False
		#command id processing for reconciliation
		self.last_id = -1
		self.received_ids = 0
		#player status info
		self.last_shot = time.time()

	def __hash__(self):
		return hash(self.user)

	def __str__(self):
		return 'p{}:{} =>{}, {}'.format(self.user.uid, self.user.username, self.go.pos, self.go.vec)

	def input(self, inputs):
		#inputs is an array of 1 item as an artifact from the way javascript's JSON.stringify handles input
		self.last_id = inputs[0]['cmd_id']
		#currently unused but kept for future use
		self.received_ids += 1

		#handle aiming and ship orientation
		cx = inputs[0]['mouseX']
		cy = inputs[0]['mouseY']
		angle = atan2((cx-self.go.pos.x), (cy-self.go.pos.y))
		self.go.angle = angle

		#handle movement vector to apply next update iteration
		moves = inputs[0]['commands']
		x, y = 0, 0
		for move in moves:
			try:
				dx, dy = self.movemap.get(move)
				x, y = x + dx, y + dy
			except:
				print('p_{}:{}>input: invalid move: {}'.format(self.user.uid, self.user.username, move))
		self.go.vec = Vector(x, y)

		#handle shooting
		self.clicked = inputs[0]['clicked']

	def spawn_entities(self, oidm):
		entities = {}
		if self.clicked and (time.time() - self.last_shot) > 0.2:
			oid = oidm.assign_id()
			
			bx = sin(self.go.angle) * 20 + self.go.pos.x
			by = cos(self.go.angle) * 20 + self.go.pos.y

			bullet = GameObject(
				pos=Position(bx, by), 
				angle=self.go.angle,
				oid=oid, 
				obj_type='bullet')

			entities[oid] = bullet
			self.last_shot = time.time()
		return entities

	def build(self):
		entity = self.go.build()
		entity.update({
			'pid':self.pid,
			'last_id':self.last_id
		})
		return entity
