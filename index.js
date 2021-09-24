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

const nextWord = {
        reply_to_message_id: null,
        reply_markup: JSON.stringify({
        inline_keyboard: 
        [
            [{text: 'Next random word', callback_data: 'random'}],
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
    let puzzle = msg.text.toLowerCase()
    if(chatIdList[chatId].settings.puzzle === puzzle) {
      chatIdList[chatId].settings.game = false;
      bot.sendMessage(chatId, msgTmps.puzzleSolved)
      getAnswer(puzzle, chatId);

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
    bot.sendMessage(chatId, answer)
    getAnswer(settings.puzzle, chatId);
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
          return getAudioDB({word: settings.puzzle });
        })
        .then((res) => {
          console.log('random word', res.word)
          let deflatedContext = zlib.inflateSync(new Buffer(res.media.deflatedContext, 'base64')).toString();
          let audio = Buffer.from(deflatedContext, 'base64');
          const fileOptions = {
            // Explicitly specify the file name.
            filename: "Listen carefully to find the word",
            // Explicitly specify the MIME type.
            contentType: 'application/octet-stream',
          };
            
          return bot.sendVoice(chatId, audio, {}, fileOptions);         
        })
        .catch(console.error);
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
      for (let i = 0; i < 3; i++) {
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


async function getAnswer(puzzle, chatId) {
  await getAudioDB({word: puzzle})
  .then(res => {
    console.log('random word', res.word)
    let deflatedWord = zlib.inflateSync(new Buffer(res.media.deflatedWord, 'base64')).toString();
    let audio = Buffer.from(deflatedWord, 'base64');
    const fileOptions = {
      // Explicitly specify the file name.
      filename: puzzle,
      // Explicitly specify the MIME type.
      contentType: 'application/octet-stream',
    };
            
    return bot.sendVoice(chatId, audio, nextWord, fileOptions);  
  })
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


async function removeDocumentsDB() {

  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    await removeDocs(client)

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
}




async function insertMetaDB(record) {
    console.log(record);
  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    let flashCard = getFlashcardRecord(record);    
    //await insertFlashCardMeta(client, flashCard)
    await insertFlashCardAudio(client, flashCard, {media: {} })

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
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
    //url: jsonRecord.url,
    //imgAuth: jsonRecord.imgAuth,
    media: {
      videoId: "",
      audioId: "",
    }
  }
  
  return record; 
}

async function insertFlashCardAudio (client, flashCard, flashCardAudio) {
  console.log(flashCard)
  let pathAudioContext = `./toefl/${flashCard.theme}-audio/${flashCard.theme}-${flashCard.word}-context.opus`
  let pathAudioWord = `./toefl/${flashCard.theme}-audio/${flashCard.theme}-${flashCard.word}-word.opus`
  
  let audioWord = fs.readFileSync(pathAudioWord, 'base64');
  let deflatedWord = zlib.deflateSync(audioWord).toString('base64');
  
  let audioContext = fs.readFileSync(pathAudioContext, 'base64');
  let deflatedContext = zlib.deflateSync(audioContext).toString('base64');
  
  flashCardAudio.word = flashCard.word;
  flashCardAudio.media.deflatedWord= deflatedWord;
  flashCardAudio.media.deflatedContext = deflatedContext;

  /*let pathAudio = `./toefl/${flashCard.topic}/${flashCard.word}/${flashCard.topic}-${flashCard.word}.mp4`
  let audio = fs.readFileSync(pathAudio, 'base64');
  flashCard.media.audio = audio;*/
  
  await client.db("flashcards").collection("audio").insertOne(flashCardAudio);
  
  console.log('insertFlashCardAudio path', path)

}

async function insertFlashCardMeta (client, flashCard) {

  const result = await client.db("flashcards").collection("toefl").insertOne(flashCard);
  
  console.log('insertFlashCardMeta ')
  return result;
}


async function removeDocs (client) {

  const result = await client.db("flashcards").collection("audio").remove({});
  
  return result;
}


async function getAudioDB(word) {

  const client = new MongoClient(uri);
  let result;
  try {
    await client.connect();
    await getFlashCardAudio(client, word)
      .then(res => {
        result = res;
        console.log('getAudioDB then', res.word)
      });
    
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    return result;
  }
  
}

async function getFlashCardAudio (client, word) {
  console.log('getFlashCardAudio', word)
  const result = await client.db("flashcards").collection("audio").findOne(word);
  console.log('getFlashCardAudio', result.word)
  return result;

}

const jsonRecords = [
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "abandon",
    "class": "verb",
    "transcription": "/əˈbændən/",
    "freq": 4,
    "level": "B1",
    "context": "Farmers will be forced to abandon trees in favour of food crops.",
    "eg": "to leave a place, thing, or person, usually for ever."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "adverse",
    "class": "adjective",
    "transcription": "/ædˈvɝːs/",
    "freq": 4,
    "level": "C2",
    "context": "Conflicts and adverse climate exacerbate food crises in Africa and elsewhere.",
    "eg": "having a negative or harmful effect on something."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "cultivation",
    "class": "noun",
    "transcription": "/ˌkʌl·təˈveɪ·ʃən/",
    "freq": 3,
    "level": "C1",
    "context": "Firstly, olive cultivation involves intensive manual labour.",
    "eg": "to prepare land and grow crops on it, or to grow a particular crop."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "harvest",
    "class": "noun",
    "transcription": "/ˈhɑːrvɪst/",
    "freq": 3,
    "level": "C1",
    "context": "The harvest began 15-20 days earlier than usual.",
    "eg": "to pick and collect crops, or to collect plants, animals, or fish to eat."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "intensify",
    "class": "verb",
    "transcription": "/ɪnˈten.sə.faɪ/",
    "freq": 3,
    "level": "C2",
    "context": "Both rain-fed and irrigated agriculture will have to intensify.",
    "eg": "to become greater, more serious, or more extreme, or to make something do this."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "irrigate",
    "class": "verb",
    "transcription": "/ˈɪr.ə.ɡeɪt/",
    "freq": 2,
    "level": "C2",
    "context": "With these infrastructure, the farmers can irrigate their fields thoroughly.",
    "eg": "to supply land with water so that crops and plants will grow."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "arable",
    "class": "adjective",
    "transcription": "/ˈærəbl/",
    "freq": 3,
    "level": "C2",
    "context": "They also argue that, contrary to popular belief, we are not running out of arable land.",
    "eg": "capable of producing crops; suitable for farming."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "fertilize",
    "class": "verb",
    "transcription": "/ˈfɝː.t̬əl.aɪz/",
    "freq": 2,
    "level": "C1",
    "context": "Fertilize your lawn at the beginning of each growing season.",
    "eg": "to spread a natural or chemical substance on land in order to make plants grow well."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "yield",
    "class": "noun",
    "transcription": "/jiːld/",
    "freq": 4,
    "level": "C1",
    "context": "Favourable weather yielded a good crop.",
    "eg": "is the amount of food produced on an area of land or by a number of animals."
  },
  {
    "theme": "nature",
    "topic": "crops",
    "set": "nature_1",
    "word": "vineyard",
    "class": "noun",
    "transcription": "/ˈvɪnjərd/",
    "freq": 2,
    "level": "C1",
    "context": "The vineyard's new season really starts early April.",
    "eg": "is an area of land where grape vines are grown in order to produce wine."
  }
]

//insertMetaDB(jsonRecords[0]);


/*
Promise.all([...jsonRecords.map((i) => {

  return insertMetaDB(i)
})]);
*/

//removeDocumentsDB();
/////////////////////////////////////////////////////////////////////////////

/*
https://speech.microsoft.com/portal/578716f61a894609ae5a30025b84713c/audiocontentcreation

for f in *.wav; do ffmpeg -i "$f" -c:a libopus "${f%.*}.opus" -b:a 32k; done

find . -type f -execdir rename 'y/A-Z/a-z/' {} \;

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
// ssh -i ~/.ssh/id_rsa.pub artem@84.201.159.199
*/

