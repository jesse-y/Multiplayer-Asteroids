import argparse
import asyncio
from asyncio import Queue
from aiohttp import web
from collections import OrderedDict
import json
import traceback
import settings
from id_manager import IdManager
from datatypes import User, MSG_ERROR, MSG_JOIN, MSG_MOVE, MSG_RESTART
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
		try:
			msg = await ws.receive()
		except Exception as e:
			print(e)
			traceback.print_exc()
			break

		if msg.tp == web.MsgType.text:
			#print('Got message {}'.format(msg.data))

			data = json.loads(msg.data)
			if type(data) != list:
				continue

			if player and player in app['in_game'] and data[0] == MSG_RESTART:
				#remove player from in_game list
				app['in_game'][player].disconnect_player(player)
				del app['in_game'][player]
				#reinitialize player's gameobject
				player = Player(player.user, GameObject(obj_type='player'))
				#add player back to matchmaking queue
				app['searching'].put_nowait(player)

			#update moves if the player is ingame
			if player and player in app['in_game'] and data[0] == MSG_MOVE:
				player.input(data[1:])

			#assign this websocket as a player and add to matchmaking queue
			if not player:
				if data[0] == MSG_JOIN:
					username = data[1][:20] #only take the first 20 characters as the username
					player = new_player(app, username, ws)
			
		elif msg.tp == web.MsgType.close or msg.tp == web.MsgType.error:
			break

	if player:
		disconnect_player(app, player)
		print('disconnect: uid={}, username={}'.format(player.user.uid, player.user.username))

	try:
		await ws.close()
		return ws
	except Exception as e:
		print(e)
		traceback.print_exc()
		return

async def manage_players(app):
	game = None
	while True:
		player = await app['searching'].get()

		#discard the current selected game if it has finished
		if game is not None and (game.finished or game.game_over):
			game = None

		while game is None:
			if len(app['non_full_games']) != 0:
				_, game = app['non_full_games'].popitem(False)
				#if the selected game in non_full_games is finished discard this game
				#and look for another, or create a new game
				if game.finished or game.game_over:
					game = None
					continue
			else:
				gid = app['gidm'].assign_id()
				game = Game(game_id=gid)
				app['games'][game] = game				
		
		game.join(player)
		app['in_game'][player] = game

		if game.running:
			game.resume(player)
		elif game.ready:
			asyncio.ensure_future(game_loop(app, game))
			game.start()
			game = None

		await asyncio.sleep(1/30)

async def game_loop(app, game):
	while True:
		game.next_frame()
		if game.need_players() and game not in app['non_full_games']:
			app['non_full_games'][game] = game
		if game.finished:
			break
		await asyncio.sleep(1/settings.GAME_SPEED)
	
	print('game_{}> finished'.format(game.game_id))
	del app['games'][game]
	if game in app['non_full_games']:
		del app['non_full_games'][game]
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
		#if a player leaves a game still in queue
		if len(app['in_game'][player].players) < 1 and not app['in_game'][player].ready:
			#get the game
			game = app['in_game'][player]
			#remove it from the games queue
			print('game_{}> finished'.format(game.game_id))
			del app['games'][game]
			if game in app['non_full_games']:
				#also delete it if it exists in non_full_games
				del app[non_full_games][game]
			#release this game's id
			app['gidm'].release_id(game.game_id)
		del app['in_game'][player]

if __name__ == '__main__':
	parser = argparse.ArgumentParser()
	parser.add_argument('-p', '--port', help='The port number the server will listen on', type=int)
	parser.add_argument('-a', '--addr', help='TCP/IP host name for this server')
	parser.add_argument('-s', '--setting', help='Manually override a setting found in settings.py. \
						Usage: <SETTING_NAME> <VALUE>', nargs=2, action='append')

	args = parser.parse_args()

	if args.port:
		listen_port = args.port
	else:
		listen_port = 8080

	if args.addr:
		listen_host = args.addr
	else:
		listen_host = '0.0.0.0'

	if args.setting:
		for name, value in args.setting:
			if name not in dir(settings):
				print('{} is not a valid setting in settings.py.'.format(name))
				continue
			try:
				exec('settings.{} = {}'.format(name, value))
				print('>>OVERRIDE SETTING: {} = {}'.format(name, value))
			except:
				print('Failed to override setting/value pair {}, {}'.format(name, value))

	event_loop = asyncio.get_event_loop()

	app = web.Application()
	
	app['in_game'] = {}
	app['games'] = {}
	app['non_full_games'] = OrderedDict()
	app['searching'] = Queue(maxsize=settings.MAX_USERS)
	app['uidm'] = IdManager(max_id=settings.MAX_USERS)
	app['gidm'] = IdManager()

	asyncio.ensure_future(manage_players(app))

	app.router.add_route('GET', '/connect', wshandler)
	#app.router.add_route('GET', '/', handle)

	web.run_app(app, host=listen_host, port=listen_port)