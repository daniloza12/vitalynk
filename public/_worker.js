export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /api/* → backend Elastic Beanstalk
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'http://vitalink.us-east-2.elasticbeanstalk.com' + url.pathname + url.search;

      // Construir headers limpios con el Host correcto
      const headers = new Headers(request.headers);
      headers.set('Host', 'vitalink.us-east-2.elasticbeanstalk.com');
      headers.set('Origin', 'http://vitalink.us-east-2.elasticbeanstalk.com');

      const proxyRequest = new Request(backendUrl, {
        method:  request.method,
        headers: headers,
        body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      });

      const response = await fetch(proxyRequest);

      // Agregar headers CORS para que el browser acepte la respuesta
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return new Response(response.body, {
        status:  response.status,
        headers: newHeaders,
      });
    }

    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin':  '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Resto → sirve el Angular SPA
    return env.ASSETS.fetch(request);
  }
};
