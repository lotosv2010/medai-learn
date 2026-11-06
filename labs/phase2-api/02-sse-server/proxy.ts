/**
 * 阶段二 · 第 02 篇 · 实验 C：一个会缓冲的代理
 *
 * 主服务跑起来之后，再开一个终端：pnpm --filter @medai/labs p2-sse-proxy
 * 然后对比这两条命令的「首字节」：
 *   curl -N -o /dev/null -w '%{time_starttransfer}s\n' http://127.0.0.1:3002/sse       ← 直连
 *   curl -N -o /dev/null -w '%{time_starttransfer}s\n' http://127.0.0.1:3003/sse       ← 经代理
 *
 * 只做一件事：攒够 512 个字符才往下游转发一次。
 * 📚 真实网关（Nginx / CDN / 云负载均衡）的缓冲逻辑各不相同，但「攒」这个动作是一样的。
 *    注意它照搬了上游的 X-Accel-Buffering: no，却照攒不误——这就是「每个代理的开关都不一样」。
 */

import { createServer, request } from 'node:http'

const TARGET_PORT = 3002
const PROXY_PORT = 3003
const THRESHOLD = 512 // 攒够这么多字符才转发

createServer((clientReq, clientRes) => {
  const upstream = request({ host: '127.0.0.1', port: TARGET_PORT, path: clientReq.url }, (upRes) => {
    clientRes.writeHead(upRes.statusCode ?? 200, upRes.headers) // 上游的响应头原样转过去

    let buffer = ''
    upRes.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      if (buffer.length >= THRESHOLD) {
        clientRes.write(buffer)
        buffer = ''
      }
    })
    upRes.on('end', () => {
      if (buffer) clientRes.write(buffer)
      clientRes.end()
    })
  })
  upstream.on('error', () => clientRes.end())
  upstream.end()
}).listen(PROXY_PORT, () => {
  console.log(`🚧 缓冲代理：http://127.0.0.1:${PROXY_PORT}  →  ${TARGET_PORT}（攒够 ${THRESHOLD} 字符才转发）`)
})
