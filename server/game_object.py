from math import sin, cos, floor
from datatypes import Position, Vector, Rectangle
from settings import WORLD_X, WORLD_Y, PLAYER_SPEED, BULLET_SPEED

class GameObject:

	obj_type_speed = {
		'player': PLAYER_SPEED,
		'bullet': BULLET_SPEED
	}

	def __init__(self, pos=Position(0,0), vec=Vector(0,0), shape=None, angle=0, oid=None, obj_type=None):
		self.pos = pos
		self.vec = vec
		self.angle = angle

		#default shape if not explicitly defined
		if shape is None:
			self.shape = Shape([pos, angle], [[0,20],[14,-14],[-14,-14]])
		else:
			self.shape = shape

		self.oid = oid
		self.type = obj_type

	def __str__(self):
		return '{} {} {}'.format(self.pos, self.vec, self.rec)

	def get_speed(self):
		try:
			speed = self.obj_type_speed.get(self.type)
		except:
			print('GO>get_obj_speed: could not find speed for obj type={}'.format(self.type))
			speed = 1
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

		#reset the vector to wait for additional input
		self.vec = Vector(0,0)

	def forward(self, dt=1, speed=1, angle=None):
		if angle is None: angle = self.angle
		speed = self.get_speed()
		x, y = self.pos.x, self.pos.y
		x += dt * speed * sin(angle)
		y += dt * speed * cos(angle)
		self.pos = Position(int(x), int(y))

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

import numpy as np

class Shape:

	def __init__(self, state, points):
		self.centre, self.angle = state
		self.points = np.array(points)

	def world_points(self):
		#add world centre coordinates to each point and rotate by the angle
		return self.points + np.array([self.centre.x, self.centre.y])

	def edge_normals(self):
		x1 = self.points[:,0]
		x1r = np.roll(x1, -1)

		y1 = self.points[:,1]
		y1r = np.roll(y1, -1)

		return np.hstack([ (y1-y1r)[:,None], -(x1-x1r)[:,None] ])