from math import sin, cos, atan2, sqrt, pi

from game_object import GameObject
from datatypes import Position
import settings

class Rocket(GameObject):
	def __init__(self, pos, angle, oid, target_id, owner_id):
		
		self.velocity = settings.ROCKET_BASE_SPEED
		self.target_id = target_id
		self.owner_id = owner_id

		super().__init__(
			pos=pos,
			angle=angle,
			speed=self.velocity,
			oid=oid,
			obj_type='rocket'
		)

	def get_speed(self, dt):
		if self.velocity < settings.ROCKET_MAX_SPEED:
			self.velocity += dt * settings.ROCKET_ACCELERATION
		return self.velocity

	def forward(self, dt, target):
		if target is not None and target.alive:
			angle_to_target = atan2((target.pos.x-self.pos.x), (target.pos.y-self.pos.y))

			diff = self.angle - angle_to_target
			if diff < -pi: diff += 2*pi
			elif diff > pi: diff -= 2*pi

			if diff > 0:
				self.angle -= dt * settings.ROCKET_ROT_SPEED
			elif diff < 0:
				self.angle += dt * settings.ROCKET_ROT_SPEED

		speed = self.get_speed(dt)

		x = self.pos.x + round(dt * sin(self.angle) * speed)
		y = self.pos.y + round(dt * cos(self.angle) * speed)
		
		self.pos = Position(int(x), int(y))
		self.dist_travelled += sqrt(x**2 + y**2)
		self.shape.update(Position(int(x), int(y)), self.angle)

	def build(self):
		return {
			'x':self.pos.x,
			'y':self.pos.y,
			'a':self.angle,
			'oid':self.oid,
			'type':self.type,
			'owner_id':self.owner_id,
			'target_id':self.target_id
		}

	def update(self, dt, game):
		if self.target_id is None:
			r_target = None
		else:
			r_target = game.players[self.target_id]

		self.forward(dt, r_target)
		return {}, {}

	def onhit(self, other, game):
		to_del, ent, evt = {}, {}, {}
		#default case, return nothing
		def skip():
			return to_del, ent, evt

		def player():
			if not other.alive or other.invulnerable:
				pass
			elif other.pid == self.owner_id:
				pass
			elif self.shape.colliding(other.shape):
				game.players[self.owner_id].score += settings.SCR_HIT_ROCKET + settings.SCR_KILL_PLAYER
				evt[self.oid] = ['hit', 'rocket', self.pos.x, self.pos.y, self.owner_id]
				evt[other.oid] = ['dead', 'player', other.pos.x, other.pos.y, other.pid]
				to_del[self.oid] = True
				other.kill()
			return to_del, ent, evt

		def asteroid():
			if self.shape.colliding(other.shape):
				evt[self.oid] = ['hit', 'rocket', self.pos.x, self.pos.y, self.owner_id]
				evt[other.oid] = ['hit', 'ast'];
				other.hit(dmg=4)
				to_del[self.oid] = True
				game.players[self.owner_id].score += settings.SCR_HIT_ROCKET
				if other.destroyed():
					game.players[self.owner_id].score += other.get_score()
					to_del[other.oid] = True
					ent.update(other.split(game.oidm))
					evt[other.oid] = ['dead', 'ast', other.pos.x, other.pos.y]
			return to_del, ent, evt

		#NOTE: the second argument of dict.get() is the default value to return if no
		#value was found in the dict. therefore, if we are checking two game_objects that
		#have no collision rules, we return skip(), which returns nothing
		return {
			'player':player,
			'asteroid_1':asteroid,
			'asteroid_2':asteroid,
			'asteroid_3':asteroid,
			'asteroid_4':asteroid,
			'asteroid_5':asteroid,
			'asteroid_6':asteroid,
			'asteroid_7':asteroid,
			'asteroid_8':asteroid,
			'asteroid_9':asteroid
		}.get(other.type, skip)()