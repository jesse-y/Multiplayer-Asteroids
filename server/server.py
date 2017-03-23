import asyncio
from asyncio import Queue
from aiohttp import web
import json

import settings
from id_manager import IdManager, IdManagerException
from user import User
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

	user = None
	while True:
		msg = await ws.receive()
		if msg.tp == web.MsgType.text:
			print('Got message {}'.format(msg.data))

			data = json.loads(msg.data)
			if type(data) != list:
				continue
			if not user:
				if data[0] == 'new_user':
					user = new_user(app, data[1], ws)
			else:
				ws.send_str('Server: message={}'.format(msg.data))
		elif msg.tp == web.MsgType.close or msg.tp == web.MsgType.error:
			break

	if user:
		disconnect_user(app, user)
		print('disconnect: uid={}, username={}'.format(user.uid, user.username))
	return ws

async def manage_users(app):
	game = None
	while True:
		user = await app['searching'].get()

		if not game:
			gid = app['gidm'].assign_id()
			game = Game(game_id=gid)
			app['games'][game] = game
		
		game.new_player(user)
		app['in_game'][user] = game

		if game.ready:
			asyncio.ensure_future(game_loop(app, game))
			game = None
		await asyncio.sleep(1/30)

async def game_loop(app, game):
	while True:
		game.next_frame()
		if game.finished:
			break
		await asyncio.sleep(2)
	print('game_{}> finished'.format(game.game_id))
	del app['games'][game]
	app['gidm'].release_id(game.game_id)
	for player in game.players.values():
		player.ws.close()

def new_user(app, username, ws):
	uid = app['uidm'].assign_id()
	user = User(uid=uid, username=username, ws=ws)
	app['searching'].put_nowait(user)
	return user

def disconnect_user(app, user):
	app['uidm'].release_id(user.uid)
	if user in app['in_game']:
		app['in_game'][user].disconnect_player(user)

if __name__ == '__main__':
	app = web.Application()
	
	app['in_game'] = {}
	app['games'] = {}
	app['searching'] = Queue(maxsize=settings.MAX_USERS)
	app['uidm'] = IdManager(max_id=settings.MAX_USERS)
	app['gidm'] = IdManager()

	asyncio.ensure_future(manage_users(app))

	app.router.add_route('GET', '/connect', wshandler)
	app.router.add_route('GET', '/', handle)

	web.run_app(app)