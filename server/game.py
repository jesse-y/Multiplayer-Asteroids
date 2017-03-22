import settings

class Game:
	def __init__(self, game_id=0):
		self.game_id = game_id
		self.ready = False
		self.finished = False

		self.players = {}

		self.tick = 0

	def new_player(self, user):
		self.players[user.uid] = user
		if len(self.players) == settings.MAX_PLAYERS:
			for player in self.players.values():
				print('game>new_player: added new player')
				msg = 'player "{}" has joined the game'.format(player.username)
				player.ws.send_str(msg)
			self.ready = True

	def next_frame(self):
		for user in self.players.values():
			print('game>next_frame: sending game tick')
			self.tick += 1
			user.ws.send_str('game_{}: tick {}'.format(self.game_id, self.tick))