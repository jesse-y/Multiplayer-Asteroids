from math import sin, cos
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
		x = speed * dt * self.vec.x
		y = speed * dt * self.vec.y
		self.pos = Position(x, y)

	def change_dir(self, angle, dt=1, speed=1):
		x, y = self.vec.x, self.vec.y
		x += dt * speed * sin(angle)
		y += dt * speed * cos(angle)
		self.vec = Vector(x, y)

	def colliding(self, other):
		pass