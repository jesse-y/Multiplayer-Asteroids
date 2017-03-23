import settings

class Game:
	def __init__(self, game_id=0):
		self.game_id = game_id
		self.ready = False
		self.finished = False

		self.players = {}

		self.tick = 0

	def __hash__(self):
		return hash(self.game_id)

	def new_player(self, user):
		self.players[user] = user
		if len(self.players) == settings.MAX_PLAYERS:
			self.ready = True
		for player in self.players.values():
			print('game_{}>p{}={}: added new player'.format(self.game_id, player.uid, player.username))
			msg = 'player "{}" has joined the game'.format(player.username)
			player.ws.send_str(msg)

	def disconnect_player(self, player):
		if player in self.players:
			del self.players[player]
		if len(self.players) < 1:
			self.finished = True
			return
		for ingame_player in self.players.values():
			print('game_{}>disconnect_player: send_all disconnect player'.format(self.game_id))
			msg = '{} has disconnected'.format(player.username)
			ingame_player.ws.send_str(msg)

	def next_frame(self):
		if self.finished:
			return
		for player in self.players.values():
			print('game_{}>next_frame: sending game tick to player_{}'.format(self.game_id, player.uid))
			self.tick += 1
			player.ws.send_str('game_{}: tick {}'.format(self.game_id, self.tick))