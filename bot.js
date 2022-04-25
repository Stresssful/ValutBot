require('dotenv').config(); 
var request = require('request'); //HTTP-запити
var cheerio = require('cheerio'); //Парсинг
var TelegramBot = require('node-telegram-bot-api');//Telegram-bot
var mongoClient = require('mongodb').MongoClient;

var token = process.env.TOKEN;//Токен
//var token = '418440998:AAGpggVT2H3_4am1qZmwoNaQ5BEUS6-UEzg'; // Устанавливаем токен (DEVELOP)
var url = 'http://ok-finance.net.ua';//Сторінка, яка парситься

var client = new mongoClient("mongodb+srv://admin:administrator@botdb.zctxy.azure.mongodb.net/<dbname>?retryWrites=true&w=majority", { useNewUrlParser: true });
client.connect();

var bot = new TelegramBot(token, {polling: true});//створення бота
var USA_Flag='🇺🇸';
var EUR_Flag='🇪🇺';
var POL_Flag='🇵🇱';
var CHF_Flag='🇨🇭';
var GBP_Flag='🇬🇧';
var Comm_course='💰';
var up = '↑';
var down = '↓';
var no_change = ' ';
var Flags = [USA_Flag, EUR_Flag,  POL_Flag, GBP_Flag, CHF_Flag];
var ids = ['USD','EUR', 'PLN','GBP','CHF'];
var adminid=310694905;
var channel="@svinnoryl";

var isNotSet=true;
checkTimeInterval();
setInterval(checkTimeInterval, 7200000);

function tabulate(string)
{
	while(string.length<5) string+=' ';
	return string;
}

async function updateDB(cur_rates) //Запис користувачів в БД
{
	let collection = client.db("ValutBotDB").collection("Rates");
    await collection.updateOne(
        { },
        { $set: { "cur_rates": cur_rates} },
        { upsert: true }
	);
}




function getRates(callback)
{
	request({uri:url, method:'GET', encoding:'utf-8'},
		function (err, res, page) 
		{
			let $=cheerio.load(page);
			let content=$('div.exchange_table').eq(0);
			let table=content.children('.line');
			let message_table='';

			for(let i=0; i<5; i++)
          	{
          		let currency_name=table.eq(i).children('.currency_name').eq(0).text().substr(21,3).replace('\n','');
          		let buy_price=table.eq(i).children('.buy').eq(0).text().substr(21,6).replace('\n','').trim();
          		let sell_price=table.eq(i).children('.sell').eq(0).text().substr(21,6).replace('\n','').trim();

          		buy_price=tabulate(buy_price);

          		message_table+=Flags[ids.indexOf(currency_name)]+currency_name+" "+buy_price+" / "+sell_price+"\n";
          	}

          	let message="`"+message_table+"`";

          	callback(null, message);
    	}
    );
}

function getCommericalRates(callback)
{
	request({uri:url, method:'GET', encoding:'utf-8'},
		function (err, res, page) 
		{
            if (!err && res.statusCode == 200) {
     			let $=cheerio.load(page);
     			let content=$('div.commercial').eq(0).children('.exchange_table').eq(0);
     			let table=content.children('.line');
     			let message_table='';

     			for(let i=0; i<4; i++)
               	{
               		let currency_name=table.eq(i).children('.currency_name').eq(0).text().substr(21,3).replace('\n','').trim();
               		let buy_price=table.eq(i).children('.buy').eq(0).text().substr(21,6).replace('\n','').trim();
               		let sell_price=table.eq(i).children('.sell').eq(0).text().substr(21,6).replace('\n','').trim();
               		buy_price=tabulate(buy_price);

               		message_table+=Flags[ids.indexOf(currency_name)]+currency_name+"  "+buy_price+" / "+sell_price+"\n";
               	}

               	let message="`"+message_table+"`";

               	callback(null, message);
               }
            else console.log("Error");
		}
	);
}



async function intervalFunc()
{
  	console.log("Im working!");
	request({uri:url, method:'GET', encoding:'utf-8'},
		async function (err, res, page) 
		{
            if (!err && res.statusCode == 200) 
            {
				let isEmpty=true;

				let col = client.db("ValutBotDB").collection("Rates");
				let ratesArray = await col.find().toArray();
				let Rates = ratesArray[0].cur_rates;

                let $=cheerio.load(page);
          		let content=$('div.exchange_table').eq(0);
          		let table=content.children('.line');

          		let cur_rates={
          			"USD": [0.0, 0.0],
          			"EUR": [0.0, 0.0],
          			"PLN": [0.0, 0.0],
          			"GBP": [0.0, 0.0],
                    "EURUSD": [0.0, 0.0],
          			"USD_Com": [0.0, 0.0],
          			"EUR_Com": [0.0, 0.0],
          			"PLN_Com": [0.0, 0.0]
				  };
				  
          		let trigger=false;

          		for(let i=0; i<4; i++)
                {          		
                    let buy_price=table.eq(i).children('.buy').eq(0).text().substr(21,6).replace('\n','').trim();
                    let sell_price=table.eq(i).children('.sell').eq(0).text().substr(21,6).replace('\n','').trim();          		

                    let key = Object.keys(cur_rates)[i];

                    cur_rates[key][0]=buy_price.replace(',','.');
                    cur_rates[key][1]=sell_price.replace(',','.');

                    if(cur_rates[key][0]!=Rates[key][0] || cur_rates[key][1]!=Rates[key][1])
                    	trigger=true;   
                    if(cur_rates[key][0]!=0 && cur_rates[key][0]!=null && cur_rates[key][1]!=0 && cur_rates[key][1]!=null)       		
                        isEmpty=false;
                }

                cur_rates["EURUSD"][0]=table.eq(5).children('.buy').eq(0).text().substr(21,6).replace('\n','').trim().replace(',','.');
                cur_rates["EURUSD"][1]=table.eq(5).children('.sell').eq(0).text().substr(21,6).replace('\n','').trim().replace(',','.');

                if(cur_rates["EURUSD"][0]!=Rates["EURUSD"][0] || cur_rates["EURUSD"][1]!=Rates["EURUSD"][1])
                    trigger=true;
                if(cur_rates["EURUSD"][0]!=0 && cur_rates["EURUSD"][0]!=null && cur_rates["EURUSD"][1]!=0 && cur_rates["EURUSD"][1]!=null)             
                    isEmpty=false;

                content=$('div.commercial').eq(0).children('.exchange_table').eq(0);
          		table=content.children('.line');			

          		for(let i=0; i<3; i++)
                {          		
                    let buy_price=table.eq(i).children('.buy').eq(0).text().substr(21,6).replace('\n','').trim();
                    let sell_price=table.eq(i).children('.sell').eq(0).text().substr(21,6).replace('\n','').trim();          		

                    let key = Object.keys(cur_rates)[i+6];
                    cur_rates[key][0]=buy_price.replace(',','.');
                    cur_rates[key][1]=sell_price.replace(',','.');

                    if(cur_rates[key][0]!=Rates[key][0] || cur_rates[key][1]!=Rates[key][1])
                    	trigger=true;  

                    if(cur_rates[key][0]!=0 && cur_rates[key][0]!=null && cur_rates[key][1]!=0 && cur_rates[key][1]!=null)             
                        isEmpty=false;	
                }

                if(trigger && !isEmpty)
                {
                    let m_table="`";
                    for (let i=0; i<8; i++)
                    {
                    	let key = Object.keys(cur_rates)[i];
                    	let currency_name=key.substr(0,3);
                    	m_table+=Flags[ids.indexOf(currency_name)];
						if(i!=4) 
							m_table+=currency_name;
						else 
							m_table+="EUR/USD";

						if(cur_rates[key][0]<Rates[key][0]) 
							m_table+=" " + down;
						else if(cur_rates[key][0]>Rates[key][0]) 
							m_table+=" " + up;
						else 
							m_table+=" " + no_change;
                    	m_table+=tabulate(cur_rates[key][0])+" / ";

						if(cur_rates[key][1]<Rates[key][1]) 
							m_table+= down;
						else if(cur_rates[key][1]>Rates[key][1]) 
							m_table+= up;
						else 
							m_table+=no_change;
                    	m_table+=cur_rates[key][1]+"\n";

                    	if(i==5)
                        {
                            m_table+="`\n"+Comm_course+"Комерційний курс:\n`";
                        }
                    }

                    m_table+="`";
					bot.sendMessage(channel, m_table, {parse_mode : "markdown"});
					//bot.sendMessage(adminid, m_table, {parse_mode : "markdown" });	//DEBUG
                    await updateDB(cur_rates);
                }
            }
            else console.log("Error");
          	
		}
	);
}

function checkTimeInterval()
{
  	let hour = toLocalTime(new Date().getUTCHours()); //current Ukraine Time
  	console.log(hour);
  	if(hour>21 || hour<9) 
  	{
    	if(!isNotSet)
    	{
      		console.log("clear interval");
      		clearInterval(intervalId);
      		isNotSet=true;
    	}
  	}
  	else
  	{
    	if(isNotSet)
    	{
      		console.log("set interval");
			intervalId = setInterval(intervalFunc, 300000);
			//intervalId = setInterval(intervalFunc, 5000); //DEBUG
      		isNotSet=false;
    	}
  	}
}

function toLocalTime(hour)
{
  	let result = hour + 3;

  	if(result>23)  
	    return result - 24;
  	else 
    	return result;
}



bot.onText(/\/get/, function(msg, match) { 
	let fromId = msg.from.id;//telegram id відправника
	getRates(function(err, msg){bot.sendMessage(fromId,msg,{parse_mode : "markdown"})});//Відправити пост          
});

bot.onText(/^\/change(.*|\n)*$/, function(msg, match) {
    let fromId = msg.from.id;
    if(adminid == fromId )
    {
    	let text = msg.text.substr(7);
        url=text; 
    }
});

bot.onText(/\/comm/, function(msg, match) {
	let fromId = msg.from.id;//telegram id відправника
	getCommericalRates(function(err, msg){bot.sendMessage(fromId,msg,{parse_mode : "markdown"})});//Відправити пост          
});