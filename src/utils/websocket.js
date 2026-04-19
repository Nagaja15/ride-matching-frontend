import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

let client = null

export const connectWebSocket = (userId, role, onMessage) => {
  if (client && client.active) {
    client.deactivate()
  }

  client = new Client({
    webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
    onConnect: () => {
      console.log('WebSocket connected for', role, userId)
      const topic = role === 'DRIVER'
        ? `/topic/driver/${userId}`
        : `/topic/rider/${userId}`
      client.subscribe(topic, (msg) => {
        try { onMessage(JSON.parse(msg.body)) }
        catch(e) { console.error('WS parse error', e) }
      })
    },
    onDisconnect: () => console.log('WebSocket disconnected'),
    onStompError: (frame) => console.error('STOMP error', frame),
    reconnectDelay: 5000
  })

  client.activate()
}

export const disconnectWebSocket = () => {
  if (client) client.deactivate()
}