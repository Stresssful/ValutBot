var request = require('request'); //HTTP-запити
var cheerio = require('cheerio'); //Парсинг
var TelegramBot = require('node-telegram-bot-api');//Telegram-bot
var fs=require('fs');//Робота з файлами
var monk = require('monk');

var token = '683429870:AAFYVsXZxSot3K3cIyH8vp-h_3j_lVTW4os';//Токен
//var token = '418440998:AAGpggVT2H3_4am1qZmwoNaQ5BEUS6-UEzg'; // Устанавливаем токен (DEVELOP)
var url = 'http://ok-finance.net.ua';//Сторінка, яка парситься
var db = monk('ether:herokuDB@ds249025.mlab.com:49025/heroku_26kgq0gk');
var dbRates = db.get('Rates');


var bot = new TelegramBot(token, {polling: true});//створення бота
var USA_Flag='🇺🇸';
var EUR_Flag='🇪🇺';
var RUS_Flag='🇷🇺';
var POL_Flag='🇵🇱';
var CHF_Flag='🇨🇭';
var GBP_Flag='🇬🇧';
var Comm_course='💰';
var up = '↑';
var down = '↓';
var no_change = ' ';
var Flags = [USA_Flag, EUR_Flag, RUS_Flag, POL_Flag, GBP_Flag, CHF_Flag];
var ids = ['USD','EUR', 'RUB','PLN','GBP','CHF'];
var adminid=310694905;
var channel="@oktavarates";

setInterval(intervalFunc, 180000);// Перевірка наявності оновлень (180000 - 3хв, 900000 - 15 хв, 3600000 - 1 год)


function tabulate(string)
{
	while(string.length<5) string+=' ';
	return string;
}

function updateDB(cur_rates) //Запис користувачів в БД
{
     dbRates.findOneAndUpdate(
      {},
      { 
        cur_rates
      },
      { upsert: true });
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



function intervalFunc()
{
	request({uri:url, method:'GET', encoding:'utf-8'},
		function (err, res, page) 
		{
               if (!err && res.statusCode == 200) 
               {
                    let isEmpty=true;
                    dbRates.find({},function(err,response)
                    {
                         let Rates = response[0].cur_rates;
                         let $=cheerio.load(page);
          			let content=$('div.exchange_table').eq(0);
          			let table=content.children('.line');

          			let cur_rates={
          				"USD": [0.0, 0.0],
          				"EUR": [0.0, 0.0],
          				"RUB": [0.0, 0.0],
          				"PLN": [0.0, 0.0],
          				"GBP": [0.0, 0.0],
                              "EURUSD": [0.0, 0.0],
          				"USD_Com": [0.0, 0.0],
          				"EUR_Com": [0.0, 0.0],
          				"RUB_Com": [0.0, 0.0],
          				"PLN_Com": [0.0, 0.0]
          			};


          			let trigger=false;

          			for(let i=0; i<5; i++)
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

          			for(let i=0; i<4; i++)
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
                    		for (let i=0; i<10; i++)
                    		{
                    			let key = Object.keys(cur_rates)[i];
                    			let currency_name=key.substr(0,3);
                    			m_table+=Flags[ids.indexOf(currency_name)];
                                   if(i!=5) m_table+=currency_name;
                                   else m_table+="EUR/USD";

                    			if(cur_rates[key][0]<Rates[key][0]) m_table+=" " + down;
                    			else if(cur_rates[key][0]>Rates[key][0]) m_table+=" " + up;
                    			else m_table+=" " + no_change;
                    			m_table+=tabulate(cur_rates[key][0])+" / ";

                    			if(cur_rates[key][1]<Rates[key][1]) m_table+= down;
                    			else if(cur_rates[key][1]>Rates[key][1]) m_table+= up;
                    			else m_table+=no_change;
                    			m_table+=cur_rates[key][1]+"\n";

                    			if(i==5)
                                   {
                                        m_table+="`\n"+Comm_course+"Комерційний курс:\n`";
                                   }
                    		}

                    		m_table+="`";
                    		bot.sendMessage(channel, m_table, {parse_mode : "markdown"});
                              updateDB(cur_rates);
                    	}
                    });
               }
               else console.log("Error");
          	
		}
	);
}






bot.onText(/\/get/, function(msg, match) 
{ 
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

bot.onText(/\/comm/, function(msg, match) 
{ 
	let fromId = msg.from.id;//telegram id відправника
	getCommericalRates(function(err, msg){bot.sendMessage(fromId,msg,{parse_mode : "markdown"})});//Відправити пост          
});