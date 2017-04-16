import asyncio
from asyncio import Queue
from aiohttp import web
import json

import settings
from id_manager import IdManager
from datatypes import User, MSG_ERROR, MSG_JOIN, MSG_MOVE
from player import Player
from game_object import GameObject
from game import Game

async def handle(request):
	print ('got request: {}'.format(request))

	index = open('index.html', 'rb')
	content = index.read()
	return web.Response(content_type='text/html', body=content)

async def wshandler(request):
	app = request.app
	ws = web.WebSocketResponse()
	await ws.prepare(request)

	player = None
	while True:
		msg = await ws.receive()

		if msg.tp == web.MsgType.text:
			#print('Got message {}'.format(msg.data))

			data = json.loads(msg.data)
			if type(data) != list:
				continue
			#update moves if the player is ingame
			if player and player in app['in_game'] and data[0] == MSG_MOVE:
				player.input(data[1:])

			#assign this websocket as a player and add to matchmaking queue
			if not player:
				if data[0] == MSG_JOIN:
					player = new_player(app, data[1], ws)
			
			#ws.send_str('Server: message={}'.format(msg.data))
		elif msg.tp == web.MsgType.close or msg.tp == web.MsgType.error:
			break

	if player:
		disconnect_player(app, player)
		print('disconnect: uid={}, username={}'.format(player.user.uid, player.user.username))
	return ws

async def manage_players(app):
	game = None
	while True:
		player = await app['searching'].get()

		if not game:
			gid = app['gidm'].assign_id()
			game = Game(game_id=gid)
			app['games'][game] = game
		
		game.join(player)
		app['in_game'][player] = game

		if game.ready:
			asyncio.ensure_future(game_loop(app, game))
			game.start()
			game = None
		await asyncio.sleep(1/30)

async def game_loop(app, game):
	while True:
		game.next_frame()
		if game.finished:
			break
		await asyncio.sleep(1/settings.GAME_SPEED)
	
	print('game_{}> finished'.format(game.game_id))
	del app['games'][game]
	app['gidm'].release_id(game.game_id)
	for player in game.players.values():
		player.user.ws.close()

def new_player(app, username, ws):
	uid = app['uidm'].assign_id()
	if uid == -1:
		msg = json.dumps([MSG_ERROR,'max users reached'])
		ws.send_str(msg)
		ws.close()
		return None
	player = Player(User(uid, username, ws), GameObject(obj_type='player'))
	app['searching'].put_nowait(player)
	
	return player

def disconnect_player(app, player):
	app['uidm'].release_id(player.user.uid)
	if player in app['in_game']:
		app['in_game'][player].disconnect_player(player)
		del app['in_game'][player]

async def reporting(app):
	while True:
		print('IN GAME USERS:')
		for player in app['in_game']:
			print('{}: {}'.format(app['in_game'][player], player))
		await asyncio.sleep(3)

if __name__ == '__main__':
	event_loop = asyncio.get_event_loop()
	event_loop.set_debug(True)

	app = web.Application()
	
	app['in_game'] = {}
	app['games'] = {}
	app['searching'] = Queue(maxsize=settings.MAX_USERS)
	app['uidm'] = IdManager(max_id=settings.MAX_USERS)
	app['gidm'] = IdManager()

	asyncio.ensure_future(manage_players(app))
	#asyncio.ensure_future(reporting(app))

	app.router.add_route('GET', '/connect', wshandler)
	app.router.add_route('GET', '/', handle)

	web.run_app(app)