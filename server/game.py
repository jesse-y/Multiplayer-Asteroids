import settings

class Game:
	def __init__(self, game_id=0):
		self._gameID = game_id
		self._worldX = settings.WORLD_X
		self._worldY = settings.WORLD_Y
		
		self.players = {}
		
		self._objects = []

	def new_player(self, p_id, ws):
		pass

	def next_frame(self):
		pass