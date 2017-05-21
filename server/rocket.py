from math import sin, cos, atan2, sqrt, radians, pi

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
			angle_to_target = atan2((target.go.pos.x-self.pos.x), (target.go.pos.y-self.pos.y))

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