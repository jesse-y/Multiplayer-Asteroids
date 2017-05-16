import settings

from math import sin, cos, floor, sqrt
from datatypes import Position, Vector, Rectangle
from settings import WORLD_X, WORLD_Y, PLAYER_SPEED, BULLET_SPEED
from shape import Shape

class GameObject:

	default_speed = 0
	default_shape = [[5,5],[5,-5],[-5,-5],[-5,5]]

	def __init__(self, pos=Position(0,0), angle=0, speed=None, oid=None, obj_type=None):
		self.pos = pos
		self.angle = angle
		self.vec = Vector(0,0)
		self.speed = speed
		
		self.oid = oid
		self.type = obj_type

		if settings.obj_type_shape.get(self.type) is not None:
			self.shape = Shape([pos, angle], settings.obj_type_shape.get(self.type))
		else:
			print('GO>__init__: could not find object shape of type={}'.format(self.type))
			self.shape = Shape([pos, angle], self.default_shape)

		self.dist_travelled = 0

	def __str__(self):
		return '{} {} {}'.format(self.pos, self.angle)

	def get_speed(self):
		#if this object was not assigned a speed explicitly
		if self.speed is None:
			#try to find a speed that matches the object's type
			speed = settings.obj_type_speed.get(self.type)
			if speed is None:
				#otherwise return a default value
				speed = default_speed
			return speed
		else:
			return self.speed

	def move(self, dt=1, speed=1):
		speed = self.get_speed()

		x, y = self.pos.x, self.pos.y

		#NOTE: apply floor() to absolute values before adding/subtracting position/velocities
		x += floor(speed * dt) * self.vec.x
		y += floor(speed * dt) * self.vec.y

		if x > WORLD_X : x = WORLD_X
		if x < 0   : x = 0
		if y > WORLD_Y : y = WORLD_Y
		if y < 0   : y = 0

		#print('GO>move: x:{}->{}, y:{}->{}'.format(self.pos.x, x, self.pos.y, y))
		self.pos = Position(int(x), int(y))

		self.shape.update(Position(int(x), int(y)), self.angle)

		#reset the vector to wait for additional input
		self.vec = Vector(0,0)

	def forward(self, dt=1, speed=1, angle=None):
		if angle is None: angle = self.angle
		speed = self.get_speed()
		x, y = self.pos.x, self.pos.y
		#rounding errors will cause the bullet stream to desync with absolute mouse position
		dx = round(dt * speed * sin(angle))
		dy = round(dt * speed * cos(angle))
		x += dx
		y += dy
		self.dist_travelled += sqrt(dx**2 + dy**2)
		self.pos = Position(int(x), int(y))
		self.shape.update(Position(int(x), int(y)), self.angle)

	def build(self):
		return {
			'x':self.pos.x,
			'y':self.pos.y,
			'a':self.angle,
			'oid':self.oid,
			'type':self.type
		}

class Bullet(GameObject):
	def __init__(self, pos, angle, oid, obj_type, pid):
		self.pid = pid
		super().__init__(
			pos=pos,
			angle=angle,
			oid=oid,
			obj_type=obj_type
		)

	def build(self):
		return {
			'x':self.pos.x,
			'y':self.pos.y,
			'a':self.angle,
			'oid':self.oid,
			'type':self.type,
			'pid':self.pid
		}