from math import sin, cos, floor
from datatypes import Position, Vector, Rectangle

class GameObject:
	def __init__(self, pos=Position(0,0), vec=Vector(0,0), rec=Rectangle(0,0,0,0), angle=0, oid=None, obj_type=None):
		self.pos = pos
		self.vec = vec
		self.rec = rec
		self.angle = angle

		self.oid = oid
		self.type = obj_type

	def __str__(self):
		return '{} {} {}'.format(self.pos, self.vec, self.rec)

	def move(self, dt=1, speed=1):
		x, y = self.pos.x, self.pos.y
		#NOTE: floor() Behaves differently for negative values compared to javascript's Math.floor()!!
		x += floor(speed * dt) * self.vec.x
		y += floor(speed * dt) * self.vec.y

		if x > 640 : x = 640
		if x < 0   : x = 0
		if y > 480 : y = 480
		if y < 0   : y = 0

		#print('GO>move: x:{}->{}, y:{}->{}'.format(self.pos.x, x, self.pos.y, y))
		self.pos = Position(int(x), int(y))

		#reset the vector to wait for additional input
		self.vec = Vector(0,0)

	def change_dir(self, angle=0, dt=1, speed=1):
		if angle is None: angle = self.angle
		x, y = self.vec.x, self.vec.y
		x += dt * speed * sin(angle)
		y += dt * speed * cos(angle)
		#print('GO>change_dir: angle:{}, x:{}->{}, y:{}->{}'.format(angle, self.vec.x, x, self.vec.y, y))
		self.vec = Vector(x, y)

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