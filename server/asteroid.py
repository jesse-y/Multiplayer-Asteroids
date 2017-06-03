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

	def get_score(self):
		#get score on death
		size = self.get_size(self.ast_id)
		return {
			self.SMALL  : settings.SCR_KILL_AST_SML,
			self.MEDIUM : settings.SCR_KILL_AST_MED,
			self.LARGE  : settings.SCR_KILL_AST_LRG
		}.get(size, 0)

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
		#a large asteroid splits into two medium asteroids.
		#a medium asteroid splits into three small asteroids.
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

	def update(self, dt, game):
		self.forward(dt)
		return {}, {}

	def onhit(self, other, game):
		to_del, ent, evt = {}, {}, {}
		#default case, return nothing
		def skip():
			return to_del, ent, evt

		def player():
			if not other.alive or other.invulnerable:
				pass
			elif self.shape.colliding(other.shape):
				evt[self.oid] = ['hit', 'ast']
				self.hit(dmg=2)
				evt[other.oid] = ['dead', 'player', other.pos.x, other.pos.y, other.pid]
				other.kill()
				if self.destroyed():
					to_del[self.oid] = True
					ent.update(self.split(game.oidm))
					evt[self.oid] = ['dead', 'ast', self.pos.x, self.pos.y]
			return to_del, ent, evt

		#NOTE: the second argument of dict.get() is the default value to return if no
		#value was found in the dict. therefore, if we are checking two game_objects that
		#have no collision rules, we return skip(), which returns nothing
		return {
			'player':player,
		}.get(other.type, skip)()