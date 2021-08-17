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
            [{text: 'Choose TOEFL Theme', callback_data: 'theme'}],
            [{text: 'Learn random word', callback_data: 'random'}],
        ]
    })
  };

const themesKeyboard = (themes) => {
        const keyboard = {
          reply_to_message_id: null,
          reply_markup: JSON.stringify({inline_keyboard: themes})
      }
      return keyboard;
}

const intervalKeyboard =(userId) => {
  
  let keys = {'inline_keyboard':
               [
                 [{text: "45 min", callback_data: 45}],
                 [{text: "30 min", callback_data: 30}],
                 [{text: "15 min", callback_data: 15}],
                 [{text: "5 min", callback_data: 5}]
               ],
              };

  if(userId === 587265489) keys.inline_keyboard.push([{text: "1 min", callback_data: 1}]);
  
  const keyboard = {
      reply_to_message_id: null,
      reply_markup: JSON.stringify(keys)
    }

  return keyboard;
}

const optionsKeyboard =() => {
  
  let keys = {keyboard:
               [
                 ['/interval'],
               ],
              resize_keyboard: true, 
              one_time_keyboard: true
              };
  
  const keyboard = {
      reply_to_message_id: null,
      reply_markup: JSON.stringify(keys),
    }

  return keyboard;
}


const cancelKeyboard =(url) => {

  const key = [[{text: 'On Instagram', callback_data: 'instagram', url: url}],[{text: 'Cancel TOEFL BOT', callback_data: 'stop'}],];
  
  const keyboard = {
    reply_to_message_id: null,
    reply_markup: JSON.stringify({inline_keyboard: key})}
  return keyboard;
}


const instagramKeyboard =(url) => {

  const key = [[{text: 'On Instagram', callback_data: 'instagram', url: url}],];
  
  const keyboard = {
    reply_to_message_id: null,
    reply_markup: JSON.stringify({inline_keyboard: key})}
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

bot.onText(/\/interval/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  opts.reply_to_message_id = msg.message_id
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  //const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, 'Choose a interval between messages with TOEFLS cards', intervalKeyboard(userId));

});

bot.onText(/\/start/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  opts.reply_to_message_id = msg.message_id
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  //const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, msgTmps.chooseTheme, opts);

});


bot.onText(/\/options/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  opts.reply_to_message_id = msg.message_id
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  //const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, 'Choose a option for TOEFLS cards', optionsKeyboard());

});


// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  opts.reply_to_message_id = msg.message_id
  console.log('message', msg)
  // send a message to the chat acknowledging receipt of their message

  if(!msg.entities) bot.sendMessage(chatId, msgTmps.chooseTheme, opts);
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

  if(data === "45") { 
    settings.timeout = parseInt(data);
    bot.sendMessage(chatId, msgTmps.chooseTheme, opts);
  }

  if(data === "30") {
    settings.timeout = parseInt(data);
    bot.sendMessage(chatId, msgTmps.chooseTheme, opts);
  }

  if(data === "15") {
    settings.timeout = parseInt(data);
    bot.sendMessage(chatId, msgTmps.chooseTheme, opts);
  } 

  if(data === "5") {
    settings.timeout = parseInt(data);
    bot.sendMessage(chatId, msgTmps.chooseTheme, opts);
  }
  if(data === "1") {
    settings.timeout = parseInt(data)/10;
    bot.sendMessage(chatId, msgTmps.chooseTheme, opts);
  }

  if(data == "theme") {
    //            [{text: 'Choose TOEFL Theme', callback_data: 'theme'}],
    themesDB().
      then(res => {
        let themes = res.map(el => {
          return [{text: el.theme, callback_data: el.themeId}]
        })

        let keyboard = themesKeyboard(themes.slice(0,1));
        console.log(keyboard)
        bot.sendMessage(chatId, msgTmps.chooseSet, keyboard);
     })
  }

  if(data == "random") {
    const publishInstagramURL = false;
    const dictionary = getDictionary(publishInstagramURL);



    const delay = (ms) => new Promise( (resolve, reject) => setTimeout(resolve, ms));

    //bot.sendDice(chatId)


   async function test() {
     await bot.sendDice(chatId);
     await delay(3000);
     await getRandomCardDB()
      .then((res)=> {
        const randomWord =res[0].word;
        let flashCard = dictionary.getFlashCard(res[0]);
        bot.sendMessage(chatId, `${flashCard}`)
        return getVideoDB({word: randomWord})
      })
      .then((res) => {
        console.log('random word', res.word)
        let inflated = zlib.inflateSync(new Buffer(res.media.deflated, 'base64')).toString();
        let video = Buffer.from(inflated, 'base64');
        const fileOptions = {
          // Explicitly specify the file name.
          filename: res.word,
          // Explicitly specify the MIME type.
          contentType: 'application/octet-stream',
        };
            
        return bot.sendVideo(chatId, video, {}, fileOptions);         
      })
      .then(()=> {
        return bot.sendMessage(chatId, "Voila!", opts)
      })
   }


  test() 
  }
  
  if(data == "nature1") {

  }
  if(data == "nature") {
    if(!timer.ac) timer.ac = timer.getAC()
    if(!timer.signal) timer.signal = timer.ac.signal;
    //console.log('timer start', timer)
    console.log('timer start', settings)
    
    //https://stackoverflow.com/questions/17891173/how-to-efficiently-randomly-select-array-item-without-repeats
    //https://stackoverflow.com/questions/40328932/javascript-es6-promise-for-loop

    runGenerator (timer, settings, chatId)
	
  }

})


function runGenerator (timer, settings, chatId) {
      
      const publishInstagramURL = false;
      const dictionary = getDictionary(publishInstagramURL);
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
      
      async function * delayGenerator(count , timeout, randomWord) {
        let flashCard = dictionary.getFlashCard(randomWord);
        console.log('delayGenerator randomWord', randomWord, count)
        yield getVideoDB({word: randomWord.word})
          .then((res) => {

            //bot.sendMessage(chatId, 'Check it out on Instagram', instagramKeyboard(randomWord.url));
            
            bot.sendMessage(chatId, `${msgTmps.firstCard} \n ${flashCard}`)

            return res;
         })
         .then(res => {
           console.log('main', res.word)
           let inflated = zlib.inflateSync(new Buffer(res.media.deflated, 'base64')).toString();
           let video = Buffer.from(inflated, 'base64');
           const fileOptions = {
             // Explicitly specify the file name.
             filename: res.word,
             // Explicitly specify the MIME type.
             contentType: 'application/octet-stream',
            };
            
            return bot.sendVideo(chatId, video, {}, fileOptions);  
         }).then(()=> {
            bot.sendMessage(chatId, msgTmps.nextCard(minutes), cancelKeyboard(randomWord.url));
            return "video done"
         })
         .catch(console.error);
        

        for (let i = 0; i < count; i++) {

          let randomWord = settings.getRandomWord();

          yield delay(timeout, { signal: timer.signal })
          .then(() => {
            let keyBoard = i === count - 1 ? opts : cancelKeyboard(randomWord.url);
            let flashCard = dictionary.getFlashCard(randomWord);
            bot.sendMessage(chatId, `${flashCard}`, keyBoard)
            return i;
          })
          .catch((err) => {
            bot.sendMessage(chatId, msgTmps.cancelSet, opts)
            //console.log('err', err)
            return err;
          });

          yield getVideoDB({word: randomWord.word})
           .then(res => {
             console.log('main', res.word)
             let inflated = zlib.inflateSync(new Buffer(res.media.deflated, 'base64')).toString();
             let video = Buffer.from(inflated, 'base64');
             const fileOptions = {
               // Explicitly specify the file name.
               filename: res.word,
               // Explicitly specify the MIME type.
               contentType: 'application/octet-stream',
              };
            
              return bot.sendVideo(chatId, video, {}, fileOptions);
                
            })
           .then(() => {
              //let keyBoard = i === count - 1 ? opts : cancelKeyboard(randomWord.url);
              //bot.sendMessage(chatId, "Learn more on Instagram", keyBoard)
            return i;
           })
           .catch(console.error);
        }
      }

      /*MAIN FUCTION*/
      (async function loop() {
        settings.isGeneratorRunning = true;
        const setDB = await getSetDB({theme: 'nature'});
        settings.getRandomWord = dictionary.getRandomiser(setDB);       
        let length = setDB.length;
        console.log('setDB')
        
        try {
          for await (let i of delayGenerator(length, timer.timeout(minutes), settings.getRandomWord())) {
            console.log('loop generator for await', i, i instanceof Error);
            if(i instanceof Error) {
              settings.isGeneratorRunning = false;
              break; 
            } 
          }
        } finally {
          console.log('finally generator internal')
          settings.isGeneratorRunning = false;
        }
        

      })();



}

let userSettings = () => {
  return {
    setId: 1,
    timeout: 5
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

let getDictionary = (permission) => {
  let externalURL = permission;
  return {
    getFlashCard:(flashCard) => `${capitalizeFirstLetter(flashCard.word)} -> ${flashCard.meta.transcription} \nEg.:  ${flashCard.meta.context}  \nExp.: ${flashCard.meta.eg} \n ${ externalURL ? flashCard.url : ''}`,
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



const msgTmps = {
  chooseTheme : 'Would you like to learn theme or random word?',
  chooseSet : 'Choose a theme to learn =)',
  cancelSet :'TOEFL bot were cancelled',
  firstCard : 'Let\'s start :)',
  nextCard : function (timeout) {return `You will get the next random flashcard from the set througout ${timeout} minutes)`},
  tipCard : 'Wait, a minute! Need a audio? Just go link below:'
}


function getFlashcardRecord ( jsonRecord ) {
  
  let record =  {
    theme: jsonRecord.theme,
    topic: jsonRecord.topic,
    set: jsonRecord.set,
    word: jsonRecord.word,
    meta: {
      class: jsonRecord.class,
      transcription: jsonRecord.transcription,
      context: jsonRecord.context,
      eg: jsonRecord.eg,
      level: jsonRecord.level,
      freq: jsonRecord.freq,
    },
    url: jsonRecord.url,
    imgAuth: jsonRecord.imgAuth,
    media: {
      videoId: "",
      audioId: "",
    }
  }
  
  return record; 
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


const jsonRecords = [
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "abandon",
    "class": "v.",
    "transcription": "/əˈbændən/",
    "freq": 4,
    "level": "B1",
    "context": "Farmers will be forced to abandon trees in favour of food crops.",
    "eg": "Abandon - to leave a place, thing, or person, usually for ever.",
    "url": "https://www.instagram.com/p/CSHD95jscjA/",
    "imgAuth": ""
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "adverse",
    "class": "adv.",
    "transcription": "/ædˈvɝːs/",
    "freq": 4,
    "level": "C2",
    "context": "Conflicts and adverse climate exacerbate food crises in Africa and elsewhere.",
    "eg": "Adverse - having a negative or harmful effect on something.",
    "url": "https://www.instagram.com/p/CSEtflqs2Ri/",
    "imgAuth": ""
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "cultivation",
    "class": "n.",
    "transcription": "/ˌkʌl·təˈveɪ·ʃən/",
    "freq": 3,
    "level": "C1",
    "context": "Firstly, olive cultivation involves intensive manual labour.",
    "eg": "Cultivation - to prepare land and grow crops on it, or to grow a particular crop.",
    "url": "https://www.instagram.com/p/CSEAKR8MfeI/",
    "imgAuth": ""
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "harvest",
    "class": "n.",
    "transcription": "/ˈhɑːrvɪst/",
    "freq": 3,
    "level": "C1",
    "context": "The harvest began 15-20 days earlier than usual.",
    "eg": "The harvest is the gathering of a crop",
    "url": "https://www.instagram.com/p/CSONruCilo-/",
    "imgAuth": "https://unsplash.com/photos/uQN9KaPTeI4"
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "intensify",
    "class": "v.",
    "transcription": "/ɪnˈten.sə.faɪ/",
    "freq": 3,
    "level": "C2",
    "context": "Both rain-fed and irrigated agriculture will have to intensify.",
    "eg": "If you intensify something or if it intensifies, it becomes greater in strength, amount, or degree.",
    "url": "https://www.instagram.com/p/CSJRr36sC-Z/",
    "imgAuth": "https://unsplash.com/photos/xDLEUTWCZdc"
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "irrigate",
    "class": "v.",
    "transcription": "/ˈɪr.ə.ɡeɪt/",
    "freq": 2,
    "level": "C2",
    "context": "With these infrastructure, the farmers can irrigate their fields thoroughly.",
    "eg": "Irrigate - to supply land with water so that crops and plants will grow.",
    "url": "https://www.instagram.com/p/CSORBZAM5lA/",
    "imgAuth": "https://unsplash.com/photos/peBIF9jpwio"
  }
]


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

async function getSetDB(theme) {

  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    await getFlashCardSet(client, theme)
      .then(res => {
        result = res;
        console.log('getSetDB then')
      });
    
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
}


async function getVideoDB(word) {

  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    await getFlashCardVideo(client, word)
      .then(res => {
        result = res;
        console.log('getVideoDB then', res.word)
      });
    
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
}

async function insertMetaDB(record) {

  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    let flashCard = getFlashcardRecord(record);    
    await insertFlashCardMeta(client, flashCard)
    await insertFlashCardVideo(client, flashCard, {media: {} })

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
}


async function getFlashCardSet (client, theme) {

  const result = await client.db("flashcards").collection("toefl").find({}, theme).toArray();
  
  console.log('getFlashCardSet', result)
  return result;
}

async function getRandomFlashCard (client) {

  const result = await client.db("flashcards").collection("toefl").aggregate([ { $sample: { size: 1 } } ]).toArray();
  
  console.log('getRandomFlashCard', result)
  return result;
}


async function insertFlashCardVideo (client, flashCard, flashCardVideo) {
  let pathVideo = `./toefl/${flashCard.theme}/${flashCard.word}/${flashCard.theme}-${flashCard.word}.mp4`
  let video = fs.readFileSync(pathVideo, 'base64');
  let deflated = zlib.deflateSync(video).toString('base64');
  flashCardVideo.word = flashCard.word;
  flashCardVideo.media.deflated = deflated;

  /*let pathAudio = `./toefl/${flashCard.topic}/${flashCard.word}/${flashCard.topic}-${flashCard.word}.mp4`
  let audio = fs.readFileSync(pathAudio, 'base64');
  flashCard.media.audio = audio;*/
  
  await client.db("flashcards").collection("video").insertOne(flashCardVideo);
  
  console.log('insertFlashCardVideo path', path)

}

async function insertFlashCardMeta (client, flashCard) {

  const result = await client.db("flashcards").collection("toefl").insertOne(flashCard);
  
  console.log('insertFlashCardMeta ')
  return result;
}


async function updateFlashCardVideo (client, word) {
  var mp4 = fs.readFileSync('./toefl/nature/abandon/nature-abandon.mp4', 'base64');
  const result = await client.db("flashcards").collection("toefl").updateOne({word},{ $set: {media: {video: mp4}}});
  console.log('updateFlashCardVideo', result)

}

async function getFlashCardVideo (client, word) {
  console.log('getFlashCardVideo', word)
  const result = await client.db("flashcards").collection("video").findOne(word);
  console.log('getFlashCardVideo', result.word)
  return result;

}

async function themesDB() {

  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    await getThemes(client)
      .then(res => {
        result = res.themes;
        console.log('getThemes', result)
      });

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
}

async function getThemes (client) {
  return await client.db("flashcards").collection("theme").findOne({nav:'themes'});
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

