import settings
import json
import time
from collections import deque

from player import Player
from datatypes import MSG_JOIN, MSG_QUIT, MSG_ERROR, MSG_START, MSG_G_STATE
from datatypes import Position
from id_manager import IdManager
from game_object import GameObject
from shape import Shape

class Game:

	def __init__(self, game_id=0):
		self.game_id = game_id
		self.oidm = IdManager()
		self.ready = False
		self.finished = False

		self.last_time = time.time()

		self.players = {}
		self.entities = {}

		self.events = {}

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

		oid = self.oidm.assign_id()
		if oid != -1 and len(self.players) < settings.MAX_PLAYERS:
			new_player.go.oid = oid
			new_player.pid = oid
			self.players[new_player] = new_player
		else:
			return

		print('{}>join: sending player list to {}'.format(self, new_player))
		self.notify_single(new_player, [MSG_JOIN, new_player.user.uid, new_player.user.username] + p_list)

		if len(self.players) == settings.MAX_PLAYERS:
			self.ready = True

	def disconnect_player(self, quitter):
		if quitter in self.players:
			del self.players[quitter]
			self.oidm.release_id(quitter.pid)
		else:
			return

		if len(self.players) < 1:
			self.finished = True
			return

		print('{}>disconnect_player: notify all players that {} disconnected'.format(self, quitter))
		for ingame_player in self.players.values():
			self.notify_single(ingame_player, [MSG_QUIT, quitter.user.uid])

	def start(self):
		self.create_world()
		print('{}>start: sending start messages to all players'.format(self))
		for player in self.players.values():
			self.notify_single(player, [MSG_START, player.go.oid, self.game_time])

	def create_world(self):
		x, y = 200, 240
		for player in self.players.values():
			#player.go.pos = Position(320,240)
			player.go.pos = Position(x,y)
			x += 150
		#create test collision object
		oid = self.oidm.assign_id()
		self.entities[oid] = GameObject(
			pos=Position(320,320), 
			angle=0,
			oid=oid, 
			obj_type='block'
		)

	def update_entities(self, dt):
		for player in self.players.values():
			player.go.move(dt=1./settings.CLIENT_RATE)
			self.entities.update(player.spawn_entities(self.oidm))

		for entity in self.entities.values():
			entity.forward(dt)

	def check_collisions(self):
		to_remove = []
		for entity in self.entities.values():
			if entity.pos.x < -50                   or \
			   entity.pos.x > settings.WORLD_X + 50 or \
			   entity.pos.y < -50                   or \
			   entity.pos.y > settings.WORLD_Y + 50:
			   to_remove.append(entity.oid)
			for player in self.players.values():
				if entity.shape.colliding(player.go.shape):
					self.events[entity.oid] = entity.shape.world_points().tolist()
					self.events[player.pid] = player.go.shape.world_points().tolist()
		for key in to_remove:
			self.oidm.release_id(key)
			del self.entities[key]

	def build_state(self):
		msg = {}
		msg['entities'] = {}
		for player in self.players.values():
			msg['entities'][player.pid] = player.build()
		for entity in self.entities.values():
			msg['entities'][entity.oid] = entity.build()
		msg['events'] = self.events
		self.events = {}
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