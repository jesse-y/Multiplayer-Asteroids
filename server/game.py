import settings
import json
import time
import random
import math
import itertools
import sys
from collections import deque

from player import Player
from datatypes import MSG_JOIN, MSG_QUIT, MSG_ERROR, MSG_START, MSG_G_STATE, MSG_GAMEOVER, MSG_STOP_GAME
from datatypes import Position
from asteroid import Asteroid
from id_manager import IdManager
from game_object import GameObject
from shape import Shape

class Game:

	start_pos = [
		[0.15, 0.15], #top left corner
		[0.85, 0.85], #bottom right corner
		[0.15, 0.85], #bottom left corner
		[0.85, 0.15]  #top right corner
	]

	def __init__(self, game_id=0):
		self.game_id = game_id
		self.pidm = IdManager(max_id=settings.MAX_PLAYERS)
		self.oidm = IdManager()
		self.ready = False
		self.finished = False
		self.running = False
		self.game_over = False
		self.freezed = False

		self.last_time = time.time()

		self.players = {}
		
		#game state
		self.entities = {}
		self.events = {}

		#misc game stats
		self.game_time = 0.
		self.game_over_time = None
		self.send_ticker = 0
		self.send_rate = settings.GAME_SPEED/settings.SEND_RATE

		#debug timers
		self.display_fps = False
		self.debug_fps = 0.
		self.debug_fps_num = 0

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
			new_player.oid = oid
			new_player.pid = pid
			self.players[new_player.pid] = new_player
			self.entities[new_player.oid] = new_player
		else:
			self.notify_single(new_player, [MSG_ERROR, 'max players reached'])
			return

		print('{}>join: sending player list to {}'.format(self, new_player))
		self.notify_single(new_player, [MSG_JOIN, new_player.user.uid, new_player.user.username] + p_list)

		if len(self.players) == settings.MIN_PLAYERS:
			self.ready = True

	def disconnect_player(self, quitter):
		if quitter.pid in self.players:
			del self.players[quitter.pid]
			self.entities.pop(quitter.oid, None)
			self.oidm.release_id(quitter.oid)
			self.pidm.release_id(quitter.pid)
		else:
			print('{}>failed to remove player {}'.format(self, quitter))
			return

		if len(self.players) < 1:
			self.finished = True
			return
		elif len(self.players) < 2 and not self.game_over and self.ready:
			#force game over:
			self.game_over_time = time.time() - settings.GAME_COMPLETE_DELAY - 1
			self.complete_game()
			return
		elif not self.game_over:
			print('{}>needs {} more players'.format(self, settings.MAX_PLAYERS-len(self.players)))

		print('{}>disconnect_player: notify all players that {} disconnected'.format(self, quitter))
		for ingame_player in self.players.values():
			self.notify_single(ingame_player, [MSG_QUIT, quitter.user.uid, quitter.user.username])

	def need_players(self):
		return (settings.MAX_PLAYERS - len(self.players) >= 2 and not self.game_over)

	def create_world(self):
		#for initialising starting state of the world
		pass

	def start(self):
		self.create_world()
		print('{}>start: sending start messages to all players'.format(self))

		centre = [round(settings.WORLD_X/2), round(settings.WORLD_Y/2)]
		for i, player in enumerate(self.players.values()):
			#select default starting spawn location
			position = [round(settings.WORLD_X * self.start_pos[i][0]),
						round(settings.WORLD_Y * self.start_pos[i][1])]
			angle = math.atan2(centre[0]-position[0], centre[1]-position[1])

			self.resume(player, location=position, angle=angle)
		self.running = True

	def resume(self, player, location=None, angle=None):
		print('{}>starting game for {}'.format(self, player))
		if location is None or angle is None:
			location, angle = self.pick_random_location()
		player.spawn(location, angle)
		self.notify_single(player, [MSG_START, player.oid, self.game_time, 
				{ 'x': settings.WORLD_X, 'y':settings.WORLD_Y, 'client_rate': settings.CLIENT_RATE }])

	def update_entities(self, dt):
		new_entities, new_events = {}, {}
		for entity in self.entities.values():
			ent, evt = entity.update(dt, self)
			new_entities.update(ent)
			new_events.update(evt)

		self.entities.update(new_entities)
		self.events.update(new_events)

	def check_collisions(self):
		to_delete, new_entities, new_events = {}, {}, {}

		for obj1, obj2 in itertools.combinations(self.entities.values(), 2):
			#don't check objects we are going to delete
			if obj1.oid in to_delete or obj2.oid in to_delete:
				continue
			#remove objects that are out of bounds
			if len(
					[to_delete.update({ obj.oid:True }) 
					for obj in [obj1, obj2] 
					if self.out_of_bounds(obj)]
				) > 0:
				continue

			#compare collision events
			to_del1, new_ent1, new_evt1 = obj1.onhit(obj2, self)
			to_del2, new_ent2, new_evt2 = obj2.onhit(obj1, self)

			#update collision events
			to_delete.update({ **to_del1, **to_del2 } )
			new_entities.update({ **new_ent1, **new_ent2 })
			new_events.update({ **new_evt1, **new_evt2 })

		self.entities.update(new_entities)
		self.events.update(new_events)
		for key in to_delete.keys():
			self.oidm.release_id(key)
			self.entities.pop(key, None)

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

		self.entities[oid] = asteroid

	def spawn_players(self):
		for player in self.players.values():
			if player.alive: continue
			if player.ready_to_spawn():
				location, angle = self.pick_random_location()
				player.spawn(location, angle)

	def pick_random_location(self):
		spawnX = random.randint(round(settings.WORLD_X*0.25), round(settings.WORLD_X*0.75))
		spawnY = random.randint(round(settings.WORLD_Y*0.25), round(settings.WORLD_Y*0.75))

		centreX = round(settings.WORLD_X/2)
		centreY = round(settings.WORLD_Y/2)

		angle = math.atan2((centreX-spawnX),(centreY-spawnY))
		return [spawnX, spawnY], angle

	def build_state(self):
		msg = {}
		msg['entities'] = {}

		for entity in self.entities.values():
			msg['entities'][entity.oid] = entity.build()

		msg['events'] = self.events
		self.events = {}
		return msg

	def is_game_over(self):
		#game is over when there is one player remaining who is not out of lives
		if sum([p.out_of_lives for p in self.players.values()]) >= len(self.players)-1:
			self.complete_game()

	def complete_game(self):
		#this function will continually be run each frame until the GAME_COMPLETE_DELAY ticks over
		if self.game_over_time is None:
			self.game_over_time = time.time()
			self.freezed = True
			self.notify_all([MSG_STOP_GAME])
		elif time.time() - self.game_over_time > settings.GAME_COMPLETE_DELAY:
			self.game_over = True
			scoreboard = []
			for player in sorted(self.players.values(), key=lambda x: x.score, reverse=True):
				scoreboard += [player.pid, player.user.username, player.score]
			print('{} complete, scoreboard={}'.format(self, scoreboard))
			self.notify_all([MSG_GAMEOVER] + scoreboard)

	def next_frame(self):
		#skip handling a new frame if the game is finished, or we are waiting
		#for the game_over delay to finish.
		if self.finished or self.game_over:
			return

		dt = time.time() - self.last_time
		self.game_time += dt

		self.is_game_over()

		#only update the game state when the game is not frozen. the game is only
		#frozen once there is a winning player.
		if not self.freezed:
			self.update_entities(dt)
			self.check_collisions()

			if random.random() < settings.ASTEROID_RESPAWN_CHANCE:
				self.spawn_asteroid()

			for player in self.players.values():
				self.spawn_players()

		if self.display_fps:
			#determine how quickly the server is handling frames
			self.debug_fps += time.time() - self.last_time
			self.debug_fps_num += 1
			if self.debug_fps_num >= settings.GAME_SPEED:
				avg_time = 1./(self.debug_fps / self.debug_fps_num)
				sys.stdout.write('fps=%0.2d, elapsed_time=%0.2f\r'%(avg_time, self.debug_fps))
				sys.stdout.flush()
				self.debug_fps = 0.
				self.debug_fps_num = 0

		#send snapshots periodically
		self.last_time = time.time()
		self.send_ticker += 1
		if self.send_ticker % self.send_rate == 0:
			msg = self.build_state()
			self.notify_all([MSG_G_STATE, {'timestamp':round(self.game_time, 2), 'state':msg}])

	def out_of_bounds(self, entity):
		if (entity.pos.x < -50                   or \
		   entity.pos.x > settings.WORLD_X + 50 or \
		   entity.pos.y < -50                   or \
		   entity.pos.y > settings.WORLD_Y + 50) and entity.dist_travelled > 100:
			return True
		else:
			return False

	def notify_single(self, player, msg):
		try:
			player.user.ws.send_str(json.dumps(msg))
		except:
			print('failed to send message to {}'.format(player))

	def notify_all(self, msg):
		for player in self.players.values():
			self.notify_single(player, msg)