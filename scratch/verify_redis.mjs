import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: 'https://brave-collie-123688.upstash.io',
  token: 'gQAAAAAAAeMoAAIgcDJlMDgwMjc5ODJiNzI0OTcwOTUwMzRmZWQ5ZjBlNWFhNg',
});

async function testConnection() {
  console.log('🔍 Probando conexión con Upstash Redis...');
  try {
    const ping = await redis.ping();
    console.log('✅ PING:', ping);

    await redis.set('test_connection', 'ok_at_' + new Date().toISOString());
    const val = await redis.get('test_connection');
    console.log('✅ SET/GET test:', val);

    console.log('\n🎉 Las credenciales son CORRECTAS.');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    process.exit(1);
  }
}

testConnection();
