import settings
import json
from datatypes import MSG_JOIN, MSG_QUIT, MSG_ERROR, MSG_START

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
		if len(self.players) == settings.MAX_PLAYERS:
			self.ready = True
		#build players list to send to new player and current players of the new player
		p_list = []
		for player in self.players.values():
			print('game_{}>p{}={}: added new player'.format(self.game_id, user.uid, user.username))
			msg = json.dumps([MSG_JOIN, user.uid, user.username])
			player.ws.send_str(msg)
			p_list += [player.uid, player.username]

		print('game_{}>sending player list to p{}={}'.format(self.game_id, user.uid, user.username))
		msg = json.dumps([MSG_JOIN, user.uid, user.username] + p_list)
		user.ws.send_str(msg)
		self.players[user] = user

	def disconnect_player(self, player):
		if player in self.players:
			del self.players[player]
		else:
			return

		if len(self.players) < 1:
			self.finished = True
			return
		for ingame_player in self.players.values():
			print('game_{}>disconnect_player: send all disconnect player'.format(self.game_id))
			msg = json.dumps([MSG_QUIT, player.uid, player.username])
			ingame_player.ws.send_str(msg)

	def start(self):
		for player in self.players.values():
			msg = json.dumps([MSG_START])

	def next_frame(self):
		if self.finished:
			return
		for player in self.players.values():
			print('game_{}>next_frame: sending game tick to player_{}'.format(self.game_id, player.uid))
			self.tick += 1
			player.ws.send_str('game_{}: tick {}'.format(self.game_id, self.tick))