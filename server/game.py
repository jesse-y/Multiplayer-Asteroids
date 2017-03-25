import settings
import json
import time
from collections import deque

from player import Player
from datatypes import MSG_JOIN, MSG_QUIT, MSG_ERROR, MSG_START, MSG_G_STATE

class Game:

	def __init__(self, game_id=0):
		self.game_id = game_id
		self.ready = False
		self.finished = False

		self.last_time = time.time()

		self.players = {}
		self.moves = {}

		self.tick = 0

	def __hash__(self):
		return hash(self.game_id)

	def __str__(self):
		return 'game_{}'.format(self.game_id)

	def join(self, new_player):
		#build players list to send to joining player, and notify existing players
		p_list = []
		for player in self.players.values():
			self.notify_single(player, [MSG_JOIN, new_player.user.uid, new_player.user.username])
			p_list += [player.user.uid, player.user.username]

		self.players[new_player] = new_player

		print('{}>join: sending player list to {}'.format(self, new_player))
		self.notify_single(new_player, [MSG_JOIN, new_player.user.uid, new_player.user.username] + p_list)

		if len(self.players) == settings.MAX_PLAYERS:
			self.ready = True


	def disconnect_player(self, quitter):
		if quitter in self.players:
			del self.players[quitter]
		else:
			return

		if len(self.players) < 1:
			self.finished = True
			return

		print('{}>disconnect_player: notify all players that {} disconnected'.format(self, quitter))
		for ingame_player in self.players.values():
			self.notify_single(ingame_player, [MSG_QUIT, quitter.user.uid, quitter.user.username])

	def start(self):
		self.create_world()
		print('{}>start: sending start messages to all players'.format(self))
		self.notify_all([MSG_START])

	def create_world(self):
		pass

	def update_entities(self, dt):
		for player in self.players.values():
			player.go.move(dt=dt, speed=settings.PLAYER_SPEED)

	def check_collisions(self):
		pass

	def build_state(self):
		msg = []
		for player in self.players.values():
			entity = {
				'x':player.go.pos.x,
				'y':player.go.pos.y,
				'uid':player.user.uid
			}
			msg.append(entity)
		return msg

	def next_frame(self):
		dt = time.time() - self.last_time
		if self.finished:
			return

		self.update_entities(dt)
		self.check_collisions()

		self.tick += 1
		self.last_time = time.time()

		msg = self.build_state()
		print('{}>next_frame: sending state {}'.format(self, msg))
		self.notify_all([MSG_G_STATE] + msg)

	def notify_single(self, player, msg):
		success = False
		if player.user.ws:
			player.user.ws.send_str(json.dumps(msg))
			success = True
		return success

	def notify_all(self, msg):
		for player in self.players.values():
			if not self.notify_single(player, msg):
				print('{}>notify_all: could not send to {}'.format(self, player))