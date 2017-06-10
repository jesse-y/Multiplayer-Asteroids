import time
import random
from math import sqrt

import settings
from game_object import GameObject
from datatypes import Position

class PowerUp(GameObject):
	def __init__(self, pos, angle, oid, obj_type):
		super().__init__(
			pos=pos,
			angle=angle,
			oid=oid,
			obj_type=obj_type
		)
		self.x_dir = random.choice([-1,1])
		self.y_dir = random.choice([-1,1])

		self.width = 15
		self.height = 15

		self.speed = random.randint(settings.PWRUP_SPD_MIN, settings.PWRUP_SPD_MAX)
		self.elapsed = 0

	def update(self, dt, game):
		self.forward(dt)
		return {}, {}

	def forward(self, dt):
		self.elapsed += dt

		x = self.pos.x + round(dt * self.speed) * self.x_dir
		y = self.pos.y + round(dt * self.speed) * self.y_dir

		self.dist_travelled += sqrt(((dt*self.speed)**2)*2)

		if self.elapsed < settings.POWERUP_ALIVE_TIME:
			if x+self.width >= settings.WORLD_X:
				x = settings.WORLD_X-self.width
				self.x_dir *= -1
			elif x-self.width <= 0:
				x = self.width
				self.x_dir *= -1

			if y+self.height >= settings.WORLD_Y:
				y = settings.WORLD_Y - self.height
				self.y_dir *= -1
			elif y-self.height <= 0:
				y = self.height
				self.y_dir *= -1

		self.pos = Position(int(x), int(y))
		self.shape.update(self.pos, self.angle)

	def onhit(self, other, game):
		to_del, ent, evt = {}, {}, {}

		#default case, return nothing
		def skip():
			return to_del, ent, evt

		def player():
			if not other.alive:
				pass
			elif self.shape.colliding(other.shape):
				other.score += settings.SCR_GET_POWERUP
				to_del[self.oid] = True
				other.invulnerable = True
				other.last_invuln = time.time()
			return to_del, ent, evt

		#NOTE: the second argument of dict.get() is the default value to return if no
		#value was found in the dict. therefore, if we are checking two game_objects that
		#have no collision rules, we return skip(), which returns nothing
		return {
			'player':player
		}.get(other.type, skip)()
