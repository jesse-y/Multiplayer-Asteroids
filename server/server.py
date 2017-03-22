import asyncio
from aiohttp import web

import settings
import user_manager as um

async def handle(request):
	print ('got request: {}'.format(request))

	index = open('index.html', 'rb')
	content = index.read()
	return web.Response(content_type='text/html', body=content)

async def wshandler(request):
	app = request.app
	ws = web.WebSocketResponse()
	await ws.prepare(request)

	player_id = None

	while True:
		msg = await ws.receive()
		if msg.tp == web.MsgType.text:
			print("Got message {}".format(msg.data))

			ws.send_str('Pressed key code: {}'.format(msg.data))
		elif msg.tp == web.MsgType.close or msg.tp == web.MsgType.error:
			break

	print('closed connection')
	return ws

async def game_loop(game):
	while True:
		if len(game.players) < 1:
			break
		game.next_frame()

async def manage_users(app):
	tick += 1
	print('user manager tick: {}'.format(tick))
	await asyncio.sleep(2)

	'''
	while True:
		for ws in app['sockets']:
			ws.send_str('game loop says: tick')
		await asyncio.sleep(2)
	'''

if __name__ == '__main__':
	app = web.Application()
	app['user_manager'] = um.UserManager()

	asyncio.ensure_future(manage_users(app))

	app.router.add_route('GET', '/connect', wshandler)
	app.router.add_route('GET', '/', handle)

	web.run_app(app)