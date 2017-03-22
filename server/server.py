import asyncio
from aiohttp import web
import json

import settings
from user_manager import UserManager

async def handle(request):
	print ('got request: {}'.format(request))

	index = open('index.html', 'rb')
	content = index.read()
	return web.Response(content_type='text/html', body=content)

async def wshandler(request):
	app = request.app
	um = app['user_manager']
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
					user = um.new_user(data[1], ws)
			else:
				ws.send_str('Server: message={}'.format(msg.data))
		elif msg.tp == web.MsgType.close or msg.tp == web.MsgType.error:
			break

	um.remove_user(user)
	print('disconnect: uid={}, username={}'.format(user.uid, user.username))
	return ws

if __name__ == '__main__':
	app = web.Application()
	app['user_manager'] = UserManager()

	asyncio.ensure_future(app['user_manager'].manage())

	app.router.add_route('GET', '/connect', wshandler)
	app.router.add_route('GET', '/', handle)

	web.run_app(app)