//win32 is development
const isWin = process.platform === 'win32'

//Server
const async = require('async')
const dotenv = require('dotenv').config()
const http = require('http')
const https = require('https')
const path = require("path")
const url = require('url')
const express = require('express')
const app = express()


//Dependecies
const TelegramBot = require('node-telegram-bot-api')
const tokenBot = process.env.TELEGRAM_BOT

//Ports
const portHTTP = 8080
const portHTTPS = 8443
const port = isWin ? portHTTP : portHTTPS

const server = http.createServer(app)
server.listen(portHTTP, () => {
  console.log('HTTPS Server running on port ' + port)
})


//TELEGRAM BOT
const bot = new TelegramBot(tokenBot, {polling: true});
 const opts = {
        reply_to_message_id: null,
        reply_markup: JSON.stringify({
        inline_keyboard: 
        [
            [{text: 'Start memorising', callback_data: 'start'}, {text: 'Stop', callback_data: 'stop'}],
        ]
    })
  };
// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  opts.reply_to_message_id = msg.message_id
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp, opts);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  opts.reply_to_message_id = msg.message_id

  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, 'Received your message', opts);
});


