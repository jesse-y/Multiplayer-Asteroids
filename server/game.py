import settings
import json
import time
import random
import math
from collections import deque

from player import Player
from datatypes import MSG_JOIN, MSG_QUIT, MSG_ERROR, MSG_START, MSG_G_STATE
from datatypes import Position
from asteroid import Asteroid
from id_manager import IdManager
from game_object import GameObject
from shape import Shape

class Game:

	def __init__(self, game_id=0):
		self.game_id = game_id
		self.pidm = IdManager(max_id=settings.MAX_PLAYERS)
		self.oidm = IdManager()
		self.ready = False
		self.finished = False

		self.last_time = time.time()

		self.players = {}
		self.asteroids = {}
		self.bullets = {}

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
		pid = self.pidm.assign_id()
		if oid != -1 and pid != -1 and len(self.players) < settings.MAX_PLAYERS:
			new_player.go.oid = oid
			new_player.pid = pid
			self.players[new_player] = new_player
		else:
			self.notify_single(new_player, [MSG_ERROR, 'max players reached'])
			return

		print('{}>join: sending player list to {}'.format(self, new_player))
		self.notify_single(new_player, [MSG_JOIN, new_player.user.uid, new_player.user.username] + p_list)

		if len(self.players) == settings.MAX_PLAYERS:
			self.ready = True

	def disconnect_player(self, quitter):
		if quitter in self.players:
			del self.players[quitter]
			self.oidm.release_id(quitter.go.oid)
			self.pidm.release_id(quitter.pid)
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
			self.notify_single(player, [MSG_START, player.go.oid, self.game_time, 
				{ 'x': settings.WORLD_X, 'y':settings.WORLD_Y, 'client_rate': settings.CLIENT_RATE }])

	def create_world(self):
		x, y = 200, 240
		for player in self.players.values():
			#player.go.pos = Position(320,240)
			player.go.pos = Position(x,y)
			x += 150

	def update_entities(self, dt):
		for player in self.players.values():
			player.go.move(dt=1./settings.CLIENT_RATE)
			self.bullets.update(player.spawn_entities(self.oidm))
			player.restore_shields()

		for bullet in self.bullets.values():
			bullet.forward(dt)

		for asteroid in self.asteroids.values():
			asteroid.forward(dt)

	def check_collisions(self):
		to_remove = []

		new_asts = {};
		for bullet in self.bullets.values():
			if self.out_of_bounds(bullet):
				to_remove.append(bullet.oid)
				continue

			for player in self.players.values():
				if not player.alive: continue
				if bullet.shape.colliding(player.go.shape):
					to_remove.append(bullet.oid)
					player.hit()
					if player.destroyed():
						self.events[player.go.oid] = { 'action':'dead' }
						player.kill()
					elif player.no_shields():
						self.events[player.go.oid] = { 'action':'noshield' }

			for asteroid in self.asteroids.values():
				if bullet.shape.colliding(asteroid.shape):
					self.events[asteroid.oid] = { 'action':'hit' }
					asteroid.hit()
					to_remove.append(bullet.oid)
				if asteroid.destroyed():
					to_remove.append(asteroid.oid)
					new_asts.update(asteroid.split(self.oidm))

		for asteroid in self.asteroids.values():
			if self.out_of_bounds(asteroid):
				to_remove.append(asteroid.oid)
				continue

			for player in self.players.values():
				if not player.alive: continue
				if asteroid.shape.colliding(player.go.shape):
					asteroid.hit(dmg=2)
					player.kill()
					if asteroid.destroyed():
						to_remove.append(asteroid.oid)
						new_asts.update(asteroid.split(self.oidm))

		self.asteroids.update(new_asts)

		for key in to_remove:
			if key in self.bullets:
				self.oidm.release_id(key)
				del self.bullets[key]
			elif key in self.asteroids:
				self.oidm.release_id(key)
				del self.asteroids[key]

	def spawn_asteroid(self, ast_id=None):
		#choose asteroid type
		if ast_id is None:
			ast_id = random.randint(1,9);

		#choose spawn location along the outside edges of the map
		spawn_loc = random.sample([
			[-50, random.randint(0, settings.WORLD_Y)],
			[settings.WORLD_X + 50, random.randint(0, settings.WORLD_Y)],
			[random.randint(0, settings.WORLD_X), -50],
			[random.randint(0, settings.WORLD_X), settings.WORLD_Y + 50]
		], 1)

		#choose angle to move towards - a point somewhere close to the centre of the map
		target_loc = [
			random.randint(math.floor(settings.WORLD_X*0.33), math.floor(settings.WORLD_X*0.67)),
			random.randint(math.floor(settings.WORLD_Y*0.33), math.floor(settings.WORLD_Y*0.67))
		]
		target_angle = math.atan2(target_loc[0]-spawn_loc[0][0], target_loc[1]-spawn_loc[0][1])

		#create asteroid object
		oid = self.oidm.assign_id()
		asteroid = Asteroid(
			pos=Position(spawn_loc[0][0], spawn_loc[0][1]),
			angle=target_angle,
			oid=oid,
			ast_id=ast_id
		)

		self.asteroids[oid] = asteroid

	def spawn_player(self):
		for player in self.players.values():
			if player.alive: continue
			if player.ready_to_spawn():
				spawnX = random.randint(round(settings.WORLD_X*0.25), round(settings.WORLD_X*0.75))
				spawnY = random.randint(round(settings.WORLD_Y*0.25), round(settings.WORLD_Y*0.75))

				centreX = round(settings.WORLD_X/2)
				centreY = round(settings.WORLD_Y/2)

				angle = math.atan2((centreX-spawnX),(centreY-spawnY))

				player.spawn([spawnX, spawnY], angle)

	def build_state(self):
		msg = {}
		msg['entities'] = {}
		for player in self.players.values():
			if not player.alive: continue
			msg['entities'][player.go.oid] = player.build()
		for bullet in self.bullets.values():
			msg['entities'][bullet.oid] = bullet.build()
		for asteroid in self.asteroids.values():
			msg['entities'][asteroid.oid] = asteroid.build()
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

		if random.random() < 1-.995:
			self.spawn_asteroid()

		for player in self.players.values():
			self.spawn_player()

		self.last_time = time.time()
		self.send_ticker += 1
		if self.send_ticker % self.send_rate == 0:
			msg = self.build_state()
			self.notify_all([MSG_G_STATE, {'timestamp':self.game_time, 'state':msg}])

	def out_of_bounds(self, entity):
		if (entity.pos.x < -50                   or \
		   entity.pos.x > settings.WORLD_X + 50 or \
		   entity.pos.y < -50                   or \
		   entity.pos.y > settings.WORLD_Y + 50) and entity.dist_travelled > 100:
			return True
		else:
			return False

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