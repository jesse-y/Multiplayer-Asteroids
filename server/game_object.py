from math import sin, cos, floor
from datatypes import Position, Vector, Rectangle

class GameObject:
	def __init__(self, pos=Position(0,0), vec=Vector(0,0), rec=Rectangle(0,0,0,0)):
		self.pos=pos
		self.vec=vec
		self.rec=rec

	def __str__(self):
		return '{} {} {}'.format(self.pos, self.vec, self.rec)

	def move(self, dt=1, speed=1):
		x, y = self.pos.x, self.pos.y
		x += floor(speed * dt * self.vec.x)
		y += floor(speed * dt * self.vec.y)
		self.pos = Position(x, y)

		#reset the vector to wait for additional input
		self.vec = Vector(0,0)

	def change_dir(self, angle, dt=1, speed=1):
		x, y = self.vec.x, self.vec.y
		x += dt * speed * sin(angle)
		y += dt * speed * cos(angle)
		self.vec = Vector(x, y)

	def colliding(self, other):
		pass

	def build(self):
		return {
			'x':self.pos.x,
			'y':self.pos.y
		}