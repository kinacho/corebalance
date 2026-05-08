// Este service worker se auto-desregistra para limpiar SWs viejos en dev
// En producción, el plugin PWA lo reemplaza con el SW real
self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', () => {
	self.registration.unregister().then(() => {
		self.clients.matchAll().then((clients) => {
			clients.forEach((client) => client.navigate(client.url));
		});
	});
});
