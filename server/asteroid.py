import random
import math
from game_object import GameObject

class Asteroid(GameObject):

	SMALL = 0
	MEDIUM = 1
	LARGE = 2

	def __init__(self, pos, angle, oid, ast_id):
		self.ast_id = ast_id
		super().__init__(
			pos=pos,
			angle=angle,
			speed=self.get_speed(),
			oid=oid,
			obj_type='asteroid_'+str(ast_id)
		)
		self.shape.rotate(random.random() * math.pi)

	def get_speed(self):
		ast_speed = 0
		#speed values per asteroid type
		if self.get_size(self.ast_id) == self.SMALL:
			#small asteroid
			ast_speed = random.randint(150,200)
		elif self.get_size(self.ast_id) == self.MEDIUM:
			#medium asteroid
			ast_speed = random.randint(125,175)
		elif self.get_size(self.ast_id) == self.LARGE:
			ast_speed = random.randint(100,150)
		return ast_speed

	def get_size(self, ast_id):
		size = -1
		if 1 <= ast_id <= 3:
			size = self.SMALL
		elif 4 <= ast_id <= 6:
			size = self.MEDIUM
		elif 7 <= ast_id <= 9:
			size = self.LARGE
		return size

	def split(self, oidm):
		objects = {}
		#a large asteroid splits into two medium asteroids and has a 50% chance to spawn a powerup
		#a medium asteroid splits into three small asteroids and has a 5% change to spawn a powerup
		if self.get_size(self.ast_id) == self.MEDIUM:
			max_ast = 3
			low, high = 1, 3
		elif self.get_size(self.ast_id) == self.LARGE:
			max_ast = 2
			low, high = 4, 6
		else:
			max_ast = 0
			low, high = 0, 1

		for i in range(max_ast):
			new_id = random.randint(low,high)
			oid = oidm.assign_id()
			ast = Asteroid(
				pos=self.pos,
				angle=random.random() * math.pi,
				speed=self.get_speed(new_id),
				oid=oid,
				ast_id=new_id
			)
			objects.update({ oid: ast })
		return objects