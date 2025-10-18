import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) qrcode.generate(qr, { small: true }) // mostra QR no terminal
    if (connection === 'open') console.log('✅ Conectado ao WhatsApp!')
    else if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = new Boom(lastDisconnect.error)).output?.statusCode !== 401
      if (shouldReconnect) {
        console.log('⚡ Reconectando...')
        startSock()
      } else {
        console.log('❌ Sessão encerrada. Escaneie o QR novamente.')
      }
    }
  })

  sock.ev.on('messages.upsert', async (msg) => {
    const m = msg.messages[0]
    if (!m.message || m.key.fromMe) return

    const texto = m.message.conversation?.toLowerCase() || ''
    console.log('📩 Mensagem recebida:', texto)

    if (texto.includes('corolla')) {
      await sock.sendMessage(m.key.remoteJid, {
        text: '✅ Valor FIPE Corolla 2021: R$ 128.987,00'
      })
    } else {
      await sock.sendMessage(m.key.remoteJid, {
        text: '🚗 Envie o nome de um carro para consultar o valor FIPE.'
      })
    }
  })
}

startSock()
