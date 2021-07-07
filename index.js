//win32 is development
const isWin = process.platform === 'win32'

//Server
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);
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
let tokenBot = process.env.TELEGRAM_BOT_PROD

if(process.env.NODE_ENV === 'DEVELOPMENT') {
  console.log('DEVELOPMENT MODE')
  tokenBot = process.env.TELEGRAM_BOT_DEV;
}
if(process.env.NODE_ENV === 'PRODUCTION') {
  console.log('PRODUCTION MODE')
  tokenBot = process.env.TELEGRAM_BOT_PROD;
}

//Ports
const portHTTP = 8080
const portHTTPS = 8443
const port = isWin ? portHTTP : portHTTPS

const server = http.createServer(app)
server.listen(portHTTP, () => {
  console.log('HTTPS Server running on port ' + port)
})


//TELEGRAM BOT
let chatIdList = {};
const bot = new TelegramBot(tokenBot, {polling: true});
const opts = {
        reply_to_message_id: null,
        reply_markup: JSON.stringify({
        inline_keyboard: 
        [
            [{text: 'Choose set 1 to learn', callback_data: 'start0'}],
            [{text: 'Choose set 2 to learn', callback_data: 'start1'}],
        ]
    })
  };

const getKeyboard =(key) => {

  const buttons = [
    {text: 'Get a word to learn', callback_data: 'start'},
    {text: 'Stop memorising', callback_data: 'stop'},
    {text: 'Get a word again)', callback_data: 'start'},];

  const multyButton = [[{text: 'Choose set 1 to learn', callback_data: 'start0'}],[{text: 'Choose set 2 to learn', callback_data: 'start1'}]];
  
  let b = key ? [[buttons[key]]] : multyButton;

  const keyboard = {
    reply_to_message_id: null,
    reply_markup: JSON.stringify({inline_keyboard: b})}
  return keyboard;
}


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
  console.log('message')
  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, msgTmps.chooseSet, opts);
});

bot.on("polling_error", console.log);

bot.on("callback_query", (callBackQuery) => {
  const data = callBackQuery.data
  const msg = callBackQuery.message
  const chatId = msg.chat.id;
	console.log('callback_query enter => ', data)
  
  if(!chatIdList[chatId]) {
    chatIdList[chatId] = {};
    chatIdList[chatId].timer = getTimeout();
    chatIdList[chatId].settings = userSettings();
  }
  
  let timer = chatIdList[chatId].timer;
  let settings = chatIdList[chatId].settings;
   
  console.log('chatIdList ', Object.keys(chatIdList))

  if(data == "stop") {
    timer.abortDelay(chatId)
    timer.resetAC();
    //console.log('timer stop', timer)
  }
  if(data == "start0") settings.setId = 0;
  if(data == "start1") settings.setId = 1;

  if(data == "start0" || data == "start1") {
    if(!timer.ac) timer.ac = timer.getAC()
    if(!timer.signal) timer.signal = timer.ac.signal;
    //console.log('timer start', timer)
    console.log('timer start', settings)

    //https://stackoverflow.com/questions/17891173/how-to-efficiently-randomly-select-array-item-without-repeats
    //https://stackoverflow.com/questions/40328932/javascript-es6-promise-for-loop

      const dictionary = getDictionary();
      const getRandomWord = dictionary.getRandomiser(sets[settings.setId]);
      const minutes = settings.timeout;

      const delay = (ms, options = {}) => new Promise( (resolve, reject) => { 
        let timerId = setTimeout(resolve, ms, 'timeout_callback')
        if (options.signal) {
          // implement aborting logic for our async operation
          options.signal.addEventListener('abort', event => {
            clearTimeout(timerId);
            reject(new Error('ABORT_ERR'));
          });
        }

      });
      //const delay = ms => setTimeoutPromise(resolve, ms, 'timeout_callback', { signal: timer.signal })
      
      async function * delayGenerator(count , timeout) {
        let flashCard = dictionary.getFlashCard(getRandomWord());
        
        bot.sendMessage(chatId, `${msgTmps.firstCard} \n ${flashCard}`, getKeyboard(1))
        bot.sendMessage(chatId, msgTmps.nextCard(minutes));
        for (let i = 0; i < count; i++) {
          yield delay(timeout, { signal: timer.signal })
          .then(() => {
            //let keyBoard = lastCall ? getKeyboard(0) :  getKeyboard(1);
            let keyBoard = i === count - 1 ? 0 : 1;
            let flashCard = dictionary.getFlashCard(getRandomWord());
            bot.sendMessage(chatId, `${flashCard}`, getKeyboard(keyBoard))
            return i;
          })
          .catch((err) => {
            bot.sendMessage(chatId, msgTmps.cancelSet, getKeyboard(0))
            //console.log('err', err)
            return err;
          }); 
        }
      }

      (async function loop() {
        let length = sets[settings.setId].length;
        for await (let i of delayGenerator(length, timer.timeout(minutes))) {
          console.log('loop', i, i instanceof Error);
          if(i instanceof Error) break; 
        }
      })();
    
	
  }

})

let userSettings = () => {
  return {
    setId: 1,
    timeout: 0.1
  }
}


let getTimeout = () => {
  return { 
    getAC : function () {return new AbortController()},
    abortDelay: function (chatId) {     
      if(this.ac) this.ac.abort();
    },
    resetAC : function() {
      this.ac = this.getAC();
      this.signal = this.ac.signal;
    },
    timeout: function(mn) {return 60000 * mn}
  }
}

let getDictionary = () => {
  return {
    getFlashCard:(word) => `${word.desc} -> ${word.pron} , Synonym:  ${word.syn} \n ${msgTmps.tipCard} \n ${ word.url}`,
    getRandomiser: (array) => {
      var copy = array.slice(0);
      return () => {
        if (copy.length < 1) copy = array.slice(0);
        let index = Math.floor(Math.random() * copy.length);
        let item = copy[index];
        copy.splice(index, 1);
        return item;
      };
    },
  }
}

const sets = [[
    {url: 'https://www.instagram.com/p/CQaZaQENJzc/', desc:'Endow', pron: "/ɪnˈdaʊ/", syn: 'Donate'},
    {url: 'https://www.instagram.com/p/CQaylbptUu8/', desc:'Forestall', pron: "/fɔːrˈstɑːl/", syn: 'Prevent'},
    {url: 'https://www.instagram.com/p/CP0KqeWHEsV/', desc:'Prone', pron: "/proʊn/", syn: 'Disposed'},
    {url: 'https://www.instagram.com/p/CNFvhaGr-Xv/', desc:'Augment', pron: "/ɑːɡˈment/", syn: 'Boost'},
    {url: 'https://www.instagram.com/p/CMbeuk2FKbT/', desc:'Vibrant', pron: "/ˈvaɪ.brənt/", syn: 'Energetic '},
  ],[
    {url: 'https://www.instagram.com/p/CKGdOnuMXq3', desc:'Wretched', pron: "/ˈretʃ.ɪd/", syn: 'Worthless'},
    {url: 'https://www.instagram.com/p/CJiaEs0M358/', desc:'Nuance', pron: "/ˈnuː.ɑːns/", syn: 'Subtlety'},
    {url: 'https://www.instagram.com/p/CJaXHHlBOdw/', desc:'Fortitude', pron: "/ˈel.ə.kwənt/", syn: 'Courage'},
    {url: 'https://www.instagram.com/p/CJAnJb3hrl9/', desc:'Eloquent', pron: "/ɑːɡˈment/", syn: 'Fluency'},
    {url: 'https://www.instagram.com/p/CI_AJZGFfrw/', desc:'Imprudent', pron: "/ɪmˈpruː.dənt/", syn: 'Irresponsible'},

  ]]


const msgTmps = {
  chooseSet : 'Hi, choose a set to learn five new words below =)',
  cancelSet :'TOEFL bot were cancelled',
  firstCard : 'Here, we are! Check it out:',
  nextCard : function (timeout) {return `You will get the next random flashcard from the set througout ${timeout} minutes)`},
  tipCard : 'Wait, a minute! Need a audio? Just go link below:'
}







