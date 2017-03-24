import settings
import json
import time
from collections import deque
from player import Player
from datatypes import MSG_JOIN, MSG_QUIT, MSG_ERROR, MSG_START
from datatypes import Move, GameObject

class Game:

	keymap = {
		37:'LEFT',
		65:'LEFT',
		38:'UP',
		87:'UP',
		39:'RIGHT',
		68:'RIGHT',
		40:'DOWN',
		83:'DOWN'
	}

	def __init__(self, game_id=0):
		self.game_id = game_id
		self.ready = False
		self.finished = False

		self.last_time = time.time()

		self.players = {}
		self.moves = {}

		self.ships = {}
		self.bullets = []
		self.asteroids = []

		self.tick = 0

	def __hash__(self):
		return hash(self.game_id)

	def new_player(self, user):
		#build players list to send to new player and current players of the new player
		p_list = []
		for player in self.players.values():
			print('game_{}>p{}={}: added new player'.format(self.game_id, user.uid, user.username))
			player.ws.send_str(json.dumps([MSG_JOIN, user.uid, user.username]))
			p_list += [player.uid, player.username]

		print('game_{}>sending player list to p{}={}'.format(self.game_id, user.uid, user.username))
		user.ws.send_str(json.dumps([MSG_JOIN, user.uid, user.username] + p_list))

		self.players[user] = user

		if len(self.players) == settings.MAX_PLAYERS:
			self.ready = True

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
			ingame_player.ws.send_str(json.dumps([MSG_QUIT, player.uid, player.username]))

	def dispatch_move(self, user, *args):
		print(args)

	def start(self):
		self.create_world()

		print('game_{}>start: sending start messages to all players')
		for player in self.players.values():
			msg = json.dumps([MSG_START])
			player.ws.send_str(msg)

	def create_world(self):
		for player in self.players.values():
			self.moves[player] = deque()
			self.ships[player] = GameObject(x=320,y=400,a=3.14)
		self.asteroids.append(GameObject(x=320, y=100, a=0))

	def update_entities(self, dt):
		for p in self.players.values():
			ship = self.ships[p]
			if not self.moves[p]:
				continue
			#parse keys. more than one key might be pressed per tick
			for key in self.moves[p].keys:
				if self.keymap.get(key) == 'UP':
					ship.y -= settings.GAME_SPEED * dt
				if self.keymap.get(key) == 'DOWN':
					ship.y += settings.GAME_SPEED * dt
				if self.keymap.get(key) == 'LEFT':
					ship.x -= settings.GAME_SPEED * dt
				if self.keymap.get(key) == 'RIGHT':
					ship.x += settings.GAME_SPEED * dt

		for a in self.asteroids:
			if a.x < 0:
				



	def next_frame(self):
		dt = time.time() - self.last_time
		if self.finished:
			return

		self.update_entities(dt)
		self.check_collisions(dt)

		self.tick += 1
		self.last_time = time.time()