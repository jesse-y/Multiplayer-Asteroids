import random
import math
import settings
from game_object import GameObject

class Asteroid(GameObject):

	SMALL = 0
	MEDIUM = 1
	LARGE = 2

	size_names = {
		SMALL:'small',
		MEDIUM:'medium',
		LARGE:'large'
	}

	def __init__(self, pos, angle, oid, ast_id):
		self.ast_id = ast_id
		super().__init__(
			pos=pos,
			angle=angle,
			speed=self.get_speed(self.ast_id),
			oid=oid,
			obj_type='asteroid_'+str(ast_id)
		)
		self.hp = settings.ast_max_hp.get(self.ast_id)

	def __str__(self):
		return 'asteroid_{}_type_{}_oid_{}_hp={}'.format(
			self.size_names.get(self.get_size(self.ast_id)), self.ast_id, self.oid, self.hp)

	def get_speed(self, ast_id=None):
		if ast_id is None:
			ast_id = self.ast_id
		ast_speed = 0

		min_speed = settings.ast_speed_min.get(ast_id)
		max_speed = settings.ast_speed_max.get(ast_id)

		if min_speed is None or max_speed is None: ast_speed = 100

		ast_speed = random.randint(min_speed, max_speed)

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

	def hit(self, dmg=1):
		if self.hp is not None:
			self.hp -= dmg

	def destroyed(self):
		if self.hp is None or self.hp < 1:
			return True
		else:
			return False

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

		num_dirs = 12
		dirs = random.sample(range(num_dirs), max_ast)
		for dir in dirs:
			new_id = random.randint(low,high)
			oid = oidm.assign_id()
			ast = Asteroid(
				pos=self.pos,
				angle=(dir / num_dirs) * math.pi * 2,
				oid=oid,
				ast_id=new_id
			)
			objects.update({ oid: ast })
		return objects