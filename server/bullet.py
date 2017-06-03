import settings
from game_object import GameObject

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
			elif self.shape.colliding(other.shape) and self.pid != other.pid:
				other.hit()
				game.players[self.pid].score += settings.SCR_HIT_BULLET
				to_del[self.oid] = True
				evt[other.oid] = ['hit', 'player', other.pos.x, other.pos.y]
				evt[self.oid] = ['hit', 'bullet', self.pos.x, self.pos.y]
				if other.destroyed():
					game.players[self.pid].score += settings.SCR_KILL_PLAYER
					evt[other.oid] = ['dead', 'player', other.pos.x, other.pos.y, other.pid]
					other.kill()
				elif other.no_shields():
					evt[other.oid] = ['noshield', 'player', other.pid, other.oid]
			return to_del, ent, evt

		def asteroid():
			if self.shape.colliding(other.shape):
				evt[self.oid] = ['hit', 'bullet', self.pos.x, self.pos.y]
				evt[other.oid] = ['hit', 'ast'];
				other.hit()
				game.players[self.pid].score += settings.SCR_HIT_BULLET
				to_del[self.oid] = True
				if other.destroyed():
					game.players[self.pid].score += other.get_score()
					to_del[other.oid] = True
					ent.update(other.split(game.oidm))
					evt[other.oid] = ['dead', 'ast', other.pos.x, other.pos.y]
			return to_del, ent, evt

		#NOTE: the second argument of dict.get() is the default value to return if no
		#value was found in the dict. therefore, if we are checking two game_objects that
		#have no collision rules, we return skip(), which returns nothing
		return {
			'player':player,
			'asteroid_1':asteroid,
			'asteroid_2':asteroid,
			'asteroid_3':asteroid,
			'asteroid_4':asteroid,
			'asteroid_5':asteroid,
			'asteroid_6':asteroid,
			'asteroid_7':asteroid,
			'asteroid_8':asteroid,
			'asteroid_9':asteroid
		}.get(other.type, skip)()