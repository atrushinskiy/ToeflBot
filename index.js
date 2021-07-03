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
const tokenBot = process.env.TELEGRAM_BOT

if(process.env.NODE_ENV === 'DEVELOPMENT') console.log('DEVELOPMENT MODE')
if(process.env.NODE_ENV === 'PRODUCTION') console.log('PRODUCTION MODE')

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
    chatIdList[chatId] = getTimeout();
  }
  
  let timer = chatIdList[chatId];
   
  console.log('chatIdList ', Object.keys(chatIdList))

  if(data == "stop") {
    timer.abortDelay(chatId)
    timer.resetAC();
    //console.log('timer stop', timer)
  }
  if(data == "start0") timer.setId = 0;
  if(data == "start1") timer.setId = 1;

  if(data == "start0" || data == "start1") {
    if(!timer.ac) timer.ac = timer.getAC()
    if(!timer.signal) timer.signal = timer.ac.signal;
    //console.log('timer start', timer)
    
    timer.setDelay(chatId, firstCall = true, lastCall = false)
      .then((fn) => {
        console.log('timer2 starts ', new Date().toLocaleTimeString())
        
        return fn.setDelay(chatId, firstCall = false, lastCall = false);
      })
      .then((fn) => {
        console.log('timer3 starts ', new Date().toLocaleTimeString())

        return fn.setDelay(chatId, firstCall = false, lastCall = false);
      })
      .then((fn) => {
        console.log('timer4 starts ', new Date().toLocaleTimeString())

        return fn.setDelay(chatId, firstCall = false, lastCall = true);
      })
      .then((fn) => {
        console.log('last then in chain', fn)
      })
      .catch((err) => {
        console.log('Catch error -> setDelay chaining',err.code)
      });
    
	
  }

})


let getTimeout = () => {
  return {
    setId: 1,
    minutes: 30,
    timeoutMin: 60000*30,
    aborted: false,
    getAC : function () {return new AbortController()},
    setAbortStatus : function (value) {return this.aborted = value},
    getAbortStatus : function () {return this.aborted},
    abortDelay: function (chatId) {
      //console.log('abortDelay', chatId, this)
      
      if(this.ac) this.ac.abort();
      this.setAbortStatus(true);        
      console.log('setAbortStatus', this.getAbortStatus())
      if(this.getAbortStatus()) bot.sendMessage(chatId, msgTmps.btnCancell, getKeyboard(0));
    },

    setDelay: function (chatId, firstCall, lastCall) {
      this.shuffledSet = this.shuffledSet || getShuffledSet(this.setId);

      if(firstCall) {
        let phraze = getPhraze(this.shuffledSet.next().value);
        bot.sendMessage(chatId, `${msgTmps.beforeFirstWord} \n ${phraze}`, getKeyboard(1));
        bot.sendMessage(chatId, msgTmps.timerNextWord(this.minutes));
      }

      return setTimeoutPromise(this.timeoutMin, 'timeout_callback', { signal: this.signal })
      .then( (value) => {
        console.log('timer ends->', value, new Date().toLocaleTimeString())
        console.log('setTimeoutPromise abortStatus', this.getAbortStatus());

        if(!this.getAbortStatus()) {
          console.log('lastCall', lastCall)
          let keyBoard = lastCall ? getKeyboard(0) :  getKeyboard(1);
          let phraze = getPhraze(this.shuffledSet.next().value);
          console.log('phraze', phraze)
          bot.sendMessage(chatId, phraze, keyBoard);
          return this;
        }
        else {
          console.log('setTimeoutPromise else condition',this)
          this.abortDelay(chatId)
        }
      })
      .catch((err) => {
        if(err.code === 'ABORT_ERR') console.log('Catch - the timeout was aborted', err.code);
        return err;
      });
    },
    resetAC : function() {
        this.setAbortStatus(false);
        this.ac = this.getAC()
        this.signal = this.ac.signal;
    }
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

 const getPhraze = (word) => {
    //const words = sets[setId];
    //const word = words[randomIntFromInterval(0,4)];
    const phraze = `${word.desc} -> ${word.pron} , Synonym:  ${word.syn} \n ${msgTmps.needAudio} \n ${ word.url}`;
    return phraze;
 }

const randomIntFromInterval = (min, max) => { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const getShuffledSet = (setId) => shuffle(sets[setId]);


function* shuffle(array) {

    var i = array.length;

    while (i--) {
        yield array.splice(Math.floor(Math.random() * (i+1)), 1)[0];
    }

}




let msgTmps = {
  chooseSet : 'Hi, choose a set below to learn a new five words =)',
  btnCancell :'High five bot were cancelled',
  beforeFirstWord : 'Here, we are! Check it out:',
  timerNextWord : function (timeout) {return `You will get the next random word from the set througout ${timeout} minutes)`},
  needAudio : 'Wait, a minute! Need a audio? go link below:'
}
//https://nodejs.org/api/timers.html







