import time
from math import atan2, cos, sin, sqrt

import settings
from datatypes import User, Vector, Position
from game_object import GameObject
from bullet import Bullet
from rocket import Rocket

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
		self.use_ability = False
		#command id processing for reconciliation
		self.last_id = -1
		self.received_ids = 0
		#player status info
		self.alive = True
		self.last_shot = time.time()
		self.last_rocket = time.time()
		self.last_hit = time.time()
		self.last_regen = time.time()
		self.death_time = time.time()
		#object stats
		self.shields = settings.MAX_SHIELDS
		#extra info
		self.mouse_info = { 'x':0, 'y':0 }

	def __hash__(self):
		return hash(self.user)

	def __str__(self):
		return 'p{}:{}'.format(self.user.uid, self.user.username)

	def input(self, inputs):
		if not self.alive:
			self.clicked = False
			return
		#inputs is an array of 1 item as an artifact from the way javascript's JSON.stringify handles input
		self.last_id = inputs[0]['cmd_id']
		#currently unused but kept for future use
		self.received_ids += 1

		#handle aiming and ship orientation
		cx = inputs[0]['mouseX']
		cy = inputs[0]['mouseY']
		self.mouse_info = { 'x':cx, 'y':cy }
		angle = atan2((cx-self.go.pos.x), (cy-self.go.pos.y))
		self.go.angle = angle

		#handle movement vector to apply next update iteration
		moves = inputs[0]['commands']
		x, y = 0, 0
		for move in moves:
			if move == 'SPACE':
				self.use_ability = True
				continue
			try:
				dx, dy = self.movemap.get(move)
				x, y = x + dx, y + dy
			except:
				print('p_{}:{}>input: invalid move: {}'.format(self.user.uid, self.user.username, move))
		self.go.vec = Vector(x, y)

		#handle shooting
		self.clicked = inputs[0]['clicked']

	def spawn_entities(self, oidm, players):
		bullets, rockets = {}, {}
		if self.clicked and (time.time() - self.last_shot) > 1/settings.BULLETS_PER_SECOND:
			oid = oidm.assign_id()
			
			bx = sin(self.go.angle) * 15 + self.go.pos.x
			by = cos(self.go.angle) * 15 + self.go.pos.y

			bullet = Bullet(
				pos=Position(bx, by),
				angle=self.go.angle,
				oid=oid, 
				obj_type='bullet',
				pid=self.pid)

			bullets[oid] = bullet
			self.last_shot = time.time()

		if self.use_ability and (time.time() - self.last_rocket) > 1/settings.ROCKETS_PER_SECOND:
			oid = oidm.assign_id()

			#find the player closest to the last known mouse position
			min_dist = None
			min_id = None
			for player in players.values():
				if player.pid == self.pid or not player.alive:
					continue
				dist = sqrt((player.go.pos.x - self.mouse_info['x'])**2 + (player.go.pos.y - self.mouse_info['y'])**2)
				if min_dist is None or dist < min_dist:
					min_dist = dist
					min_id = player.pid

			rocket = Rocket(
				pos=self.go.pos,
				angle=self.go.angle,
				oid=oid,
				target_id=min_id,
				owner_id=self.pid
			)
			rockets[rocket.oid] = rocket
			self.last_rocket = time.time()

		self.use_ability = False

		return bullets, rockets

	def hit(self, dmg=1):
		if self.shields is not None:
			self.shields -= dmg
			self.last_hit = time.time()
			if self.shields < 0:
				self.alive = False

	def no_shields(self):
		if self.shields is not None and self.shields < 1:
			return True
		else:
			return False

	def destroyed(self):
		return self.alive

	def restore_shields(self):
		#regeneration rules: 
		#3 second delay before shields recharge.
		#recharge rate is 1 shield per second
		#getting hit while recharging resets the recharge delay
		if self.shields is None or self.shields < settings.MAX_SHIELDS:
			curr_time = time.time()
			if curr_time - self.last_hit > settings.REGEN_DELAY:
				if curr_time - self.last_regen > settings.REGEN_SPEED:
					self.add_shield()

	def ready_to_spawn(self):
		if time.time() - self.death_time > settings.RESPAWN_DELAY:
			return True
		else:
			return False

	def spawn(self, pos, angle):
		self.alive = True
		self.go.pos = Position(pos[0], pos[1])
		self.go.angle = angle
		self.shields = settings.MAX_SHIELDS
		return self.go

	def kill(self):
		self.alive = False;
		self.death_time = time.time()
		#remove the player from the gameobject area
		self.go.pos = Position(5000,5000)

	def add_shield(self):
		self.last_regen = time.time()
		self.shields += 1

	def build(self):
		entity = self.go.build()
		entity.update({
			'pid':self.pid,
			'last_id':self.last_id,
			'shields':self.shields,
			'alive':self.alive
		})
		return entity
