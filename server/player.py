import time
from math import atan2, cos, sin, sqrt

import settings
from datatypes import User, Vector, Position
from game_object import GameObject
from bullet import Bullet
from rocket import Rocket

class Player(GameObject):

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
		if go is not None:
			super().__init__(
				pos=go.pos,
				angle=go.angle,
				oid=go.oid,
				obj_type=go.type
			)
		#the user id is specific to each server process
		self.user = user
		#the player id is specific to each game the player is in
		self.pid = pid
		self.clicked = False
		self.fire_rocket = False
		self.use_ability = False
		#command id processing for reconciliation
		self.last_id = -1
		self.received_ids = 0
		#player status info
		self.alive = True
		self.out_of_lives = False
		#timing information
		curr_time = time.time()
		self.last_shot = curr_time
		self.last_rocket = curr_time
		self.last_rocket_get = curr_time
		self.last_hit = curr_time
		self.last_regen = curr_time
		self.death_time = curr_time
		self.last_invuln = curr_time
		self.invulnerable = False
		#object stats
		self.lives = settings.MAX_PLAYER_LIVES
		self.shields = settings.MAX_SHIELDS
		self.rockets = settings.MAX_ROCKETS
		self.powerups = 0
		self.score = 0
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
		angle = atan2((cx-self.pos.x), (cy-self.pos.y))
		self.angle = angle

		#handle movement vector to apply next update iteration
		moves = inputs[0]['commands']
		x, y = 0, 0
		for move in moves:
			if move == 'SPACE':
				self.use_ability = True
				continue
			if move == 'V':
				self.fire_rocket = True
				continue
			try:
				dx, dy = self.movemap.get(move)
				x, y = x + dx, y + dy
			except:
				print('p_{}:{}>input: invalid move: {}'.format(self.user.uid, self.user.username, move))
		self.vec = Vector(x, y)

		#handle shooting
		self.clicked = inputs[0]['clicked']

	def update(self, dt, game):
		#player objects have to be updated at a constant rate for prediction to work
		dt = 1./settings.CLIENT_RATE
		self.move(dt)
		self.restore_shields()
		curr_time = time.time()
		if curr_time - self.last_invuln > settings.INVULN_DURATION:
			self.invulnerable = False
		if curr_time - self.last_rocket_get > settings.ROCKET_RECHARGE_SPEED and self.rockets < settings.MAX_ROCKETS:
			self.rockets += 1
			self.last_rocket_get = curr_time
		elif self.rockets == settings.MAX_ROCKETS:
			#do not allow rocket delays to overload over the maximum number of allowed rockets
			self.last_rocket_get = curr_time

		bullets, rockets = self.spawn_entities(game.oidm, game.players)
		#merging rockets and bullets dicts
		return {**bullets, **rockets}, {}

	def onhit(self, other, game):
		return {}, {}, {}

	def spawn_entities(self, oidm, players):
		bullets, rockets = {}, {}
		if self.clicked and (time.time() - self.last_shot) > 1/settings.BULLETS_PER_SECOND:
			oid = oidm.assign_id()
			
			bx = sin(self.angle) * 15 + self.pos.x
			by = cos(self.angle) * 15 + self.pos.y

			bullet = Bullet(
				pos=Position(bx, by),
				angle=self.angle,
				oid=oid, 
				obj_type='bullet',
				pid=self.pid)

			bullets[oid] = bullet
			self.last_shot = time.time()

		if self.fire_rocket and (time.time() - self.last_rocket) > 1/settings.ROCKETS_PER_SECOND and self.rockets > 0:
			oid = oidm.assign_id()

			#find the player closest to the last known mouse position
			min_dist = None
			min_id = None
			for player in players.values():
				if player.pid == self.pid or not player.alive:
					continue
				dist = sqrt((player.pos.x - self.mouse_info['x'])**2 + (player.pos.y - self.mouse_info['y'])**2)
				if min_dist is None or dist < min_dist:
					min_dist = dist
					min_id = player.pid

			rocket = Rocket(
				pos=self.pos,
				angle=self.angle,
				oid=oid,
				target_id=min_id,
				owner_id=self.pid
			)
			rockets[rocket.oid] = rocket
			self.rockets -= 1;
			self.last_rocket = time.time()

		self.fire_rocket = False

		if self.use_ability and self.powerups > 0:
			self.powerups -= 1
			self.invulnerable = True
			self.last_invuln = time.time()

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
		return not self.alive

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
		if time.time() - self.death_time > settings.RESPAWN_DELAY and not self.out_of_lives:
			return True
		else:
			return False

	def spawn(self, pos, angle):
		self.alive = True
		self.invulnerable = True
		self.last_invuln = time.time()
		self.powerups = 0
		self.pos = Position(pos[0], pos[1])
		self.angle = angle
		self.shields = settings.MAX_SHIELDS
		return self

	def kill(self):
		self.alive = False;
		self.death_time = time.time()
		self.lives -= 1
		if self.lives < 0:
			self.out_of_lives = True

	def add_shield(self):
		self.last_regen = time.time()
		self.shields += 1

	def build(self):
		entity = super().build()
		entity.update({
			'pid':self.pid,
			'last_id':self.last_id,
			'shields':self.shields,
			'alive':self.alive,
			'invuln':self.invulnerable,
			'rockets':self.rockets,
			'lives':self.lives,
			'score':self.score,
			'powerup':self.powerups
		})
		return entity
