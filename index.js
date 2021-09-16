//win32 is development
const isWin = process.platform === 'win32'

//Server
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);
const async = require('async');
const dotenv = require('dotenv').config();
const http = require('http');
const https = require('https');
const path = require("path");
const url = require('url');
const express = require('express');
const app = express();
var fs = require('fs');
var zlib = require('zlib');


//Dependecies
const { MongoClient } = require('mongodb');
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

app.get('/', (req, res) => {
  res.sendFile('index.html', {root: __dirname })
  //res.render('../static/views/index',{page:'main', marker: null, markerEncoded: null, dayjs: dayjs});
  console.log('get /');
})

const server = http.createServer(app)
server.listen(8443,"0.0.0.0", () => {
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
            [{text: 'Learn random word', callback_data: 'random'}],
        ]
    })
  };


const answerBoard = {
        reply_to_message_id: null,
        reply_markup: JSON.stringify({
        inline_keyboard: 
        [
            [{text: 'Get answer)', callback_data: 'answer'}],
        ]
    })
  };




const cancelKeyboard =(url) => {

  const key = [[{text: 'On Instagram', callback_data: 'instagram', url: url}],[{text: 'Cancel TOEFL BOT', callback_data: 'stop'}],];
  
  const keyboard = {
    reply_to_message_id: null,
    reply_markup: JSON.stringify({inline_keyboard: key})}
  return keyboard;
}




bot.onText(/\/start/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  opts.reply_to_message_id = msg.message_id
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  //const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, msgTmps.randomWord, opts);

});




// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  opts.reply_to_message_id = msg.message_id
  console.log('message', msg)
  // send a message to the chat acknowledging receipt of their message

  if(chatIdList[chatId] && chatIdList[chatId].settings.game) {
    if(chatIdList[chatId].settings.puzzle === msg.text.toLowerCase()) {
      chatIdList[chatId].settings.game = false;
      bot.sendMessage(chatId, msgTmps.puzzleSolved, opts)
    } else {
      bot.sendMessage(chatId, msgTmps.puzzleWrong, answerBoard)
    }
  } else if(chatIdList[chatId] && !chatIdList[chatId].settings.game) { 
    bot.sendMessage(chatId, msgTmps.randomWord, opts);
  }

  else {
    bot.sendMessage(chatId, msgTmps.randomWord, opts);
  }


  //if(!msg.entities) bot.sendMessage(chatId, msgTmps.randomWord, opts);
});

bot.on("polling_error", console.log);



bot.on("callback_query", (callBackQuery) => {
  const data = callBackQuery.data
  const msg = callBackQuery.message
  const chatId = msg.chat.id;
	console.log('callback_query enter => ', data, new Date().toString(), callBackQuery)
  
 /* POP UP triggered by INLINE keyboard*/
 // bot.answerCallbackQuery(callBackQuery.id, {text: 'You successfully clicked the button', show_alert: false})
/**/

  if(!chatIdList[chatId]) {
    chatIdList[chatId] = {};
    chatIdList[chatId].settings = {};
  }
  
  let settings = chatIdList[chatId].settings;

   
  console.log('chatIdList ', Object.keys(chatIdList))

 
  if(data == "answer") {
    chatIdList[chatId].settings.game = false;
    let answer = `Correct word is ${settings.puzzle}.`
    bot.sendMessage(chatId, answer, opts)
  }
  
  if(data == "random") {

    const dictionary = getDictionary();

    const delay = (ms) => new Promise( (resolve, reject) => setTimeout(resolve, ms));


    async function sendRandomWord() {
      settings.game = true;
      await bot.sendDice(chatId);
      await delay(3000);
      await getRandomCardDB()
        .then((res)=> {
          settings.puzzle = res[0].word;
          res[0].word = dictionary.replaceString(res[0].word);
          let flashCard = dictionary.getFlashCard(res[0]);

          bot.sendMessage(chatId, `${flashCard}`)
        })
    }
  
    sendRandomWord() 
  
  }
  
 

})






let getDictionary = () => {

  return {
    getFlashCard:(flashCard) => `${capitalizeFirstLetter(flashCard.word)} - ${flashCard.meta.eg} \n `,
    getRandomIndex: (array) => {
      var copy = array.slice(0);
      return () => {
        if (copy.length < 1) copy = array.slice(0);
        let index = Math.floor(Math.random() * copy.length);
        let item = copy[index];
        copy.splice(index, 1);
        return item;
      };
    },
    replaceString(word) {
      let indexes = Array.from(Array(word.length).keys());
      let random = shuffle(indexes);
      let array = word.split('');
      for (let i = 0; i < 2; i++) {
        let y = random.pop();
        array[y] = ' _';
      }
      
      
      return array.join('')
    }
  }
}


function shuffle(o) {
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

const msgTmps = {
  randomWord : 'Would you like to learn random word?',
  puzzleSolved : 'Excellent! you are right!',
  puzzleWrong : 'Wrong! Try again!',
  cancelSet :'TOEFL bot were cancelled',
  firstCard : 'Let\'s start :)',
  nextCard : function (timeout) {return `You will get the next random flashcard from the set througout ${timeout} minutes)`},
  tipCard : 'Wait, a minute! Need a audio? Just go link below:'
}




function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}





/*MONGODB*/
const uri = process.env.MONGODB;



async function getRandomCardDB() {

  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    await getRandomFlashCard(client)
      .then(res => {
        result = res;
        console.log('getRandomCardDB then', )
      });
    
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
}


async function getRandomFlashCard (client) {

  const result = await client.db("flashcards").collection("toefl").aggregate([ { $sample: { size: 1 } } ]).toArray();
  
  console.log('getRandomFlashCard', result)
  return result;
}



if(process.env.NODE_ENV === 'DEVELOPMENT') {
  //insertMetaDB(jsonRecords[5]).then(res => console.log('main', res.word)).catch(console.error);
}




/*

interval - Set period of time between messages with TOEFL FlashCards
options - Set options for TOEFL FlashCards

*/

/*
https://speech.microsoft.com/portal/578716f61a894609ae5a30025b84713c/audiocontentcreation
https://docs.google.com/spreadsheets/d/14N-84W12l_WxY7l038HQiqSIEEbOJFbcjnEfWk0fwUk/edit?usp=drive_web&ouid=110277816954849002273
https://www.addmusictophoto.com/
https://unsplash.com/
https://csvjson.com/csv2json

Dictionaries
https://dictionary.cambridge.org/
https://www.collinsdictionary.com/dictionary/english
https://context.reverso.net
https://context.reverso.net/translation/
https://www.oxfordlearnersdictionaries.com/definition/english/
*/

/*
//84.201.159.199
*/

