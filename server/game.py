import settings
import json
import time
from collections import deque

from player import Player
from datatypes import MSG_JOIN, MSG_QUIT, MSG_ERROR, MSG_START, MSG_G_STATE
from datatypes import Position
from id_manager import IdManager, IdManagerException

class Game:

	def __init__(self, game_id=0):
		self.game_id = game_id
		self.pidm = IdManager(max_id=settings.MAX_PLAYERS)
		self.oidm = IdManager()
		self.ready = False
		self.finished = False

		self.last_time = time.time()

		self.players = {}
		self.entities = {}

		self.game_time = 0.
		self.send_ticker = 0
		self.send_rate = settings.GAME_SPEED/settings.SEND_RATE

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

		try:
			new_player.pid = self.pidm.assign_id()
		except IdManagerException as e:
			print(str(e))
			return
		self.players[new_player] = new_player

		print('{}>join: sending player list to {}'.format(self, new_player))
		self.notify_single(new_player, [MSG_JOIN, new_player.user.uid, new_player.user.username] + p_list)

		if len(self.players) == settings.MAX_PLAYERS:
			self.ready = True

	def disconnect_player(self, quitter):
		if quitter in self.players:
			del self.players[quitter]
			self.pidm.release_id(quitter.pid)
			quitter.pid = -1
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
		for player in self.players.values():
			self.notify_single(player, [MSG_START, player.pid, self.game_time])

	def create_world(self):
		x, y = 200, 240
		for player in self.players.values():
			#player.go.pos = Position(320,240)
			player.go.pos = Position(x,y)
			x += 150

	def update_entities(self, dt):
		for player in self.players.values():
			player.go.move(dt=1./settings.CLIENT_RATE, speed=settings.PLAYER_SPEED)

	def check_collisions(self):
		pass

	def build_state(self):
		msg = {}
		msg['players'] = {}
		msg['entities'] = {}
		for player in self.players.values():
			msg['players'][player.pid] = player.build()
		for entity in self.entities.values():
			msg['entities'][entity.oid] = entity.build()
		return msg

	def next_frame(self):
		if self.finished:
			return

		dt = time.time() - self.last_time
		self.game_time += dt

		self.update_entities(dt)
		self.check_collisions()

		self.last_time = time.time()

		self.send_ticker += 1
		if self.send_ticker % self.send_rate == 0:
			msg = self.build_state()
			self.notify_all([MSG_G_STATE, {'timestamp':self.game_time, 'state':msg}])

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