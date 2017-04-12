from math import sin, cos, floor
from datatypes import Position, Vector, Rectangle
from settings import WORLD_X, WORLD_Y, PLAYER_SPEED, BULLET_SPEED
from shape import Shape

class GameObject:

	obj_type_speed = {
		'player': PLAYER_SPEED,
		'bullet': BULLET_SPEED
	}

	def __init__(self, pos=Position(0,0), vec=Vector(0,0), shape=None, angle=0, oid=None, obj_type=None):
		self.pos = pos
		self.vec = vec
		self.angle = angle
		
		if shape is None and obj_type == 'player':
			self.shape = Shape([pos, angle], [[0,20],[14,-14],[-14,-14]])
		else:
			self.shape = shape
		
		self.oid = oid
		self.type = obj_type

	def __str__(self):
		return '{} {} {}'.format(self.pos, self.vec, self.rec)

	def get_speed(self):
		'''
		try:
			speed = self.obj_type_speed.get(self.type)
		except:
			#print('GO>get_obj_speed: could not find speed for obj type={}'.format(self.type))
			speed = 0
		'''
		speed = self.obj_type_speed.get(self.type)
		if speed is None:
			speed = 0
		return speed

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
		x += dt * speed * sin(angle)
		y += dt * speed * cos(angle)
		self.pos = Position(int(x), int(y))
		self.shape.update(Position(int(x), int(y)), self.angle)

	def colliding(self, other):
		pass

	def build(self):
		return {
			'x':self.pos.x,
			'y':self.pos.y,
			'a':self.angle,
			'oid':self.oid,
			'type':self.type
		}