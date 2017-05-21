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