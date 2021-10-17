require('dotenv').config();
const fs = require('fs');
const { JSDOM } = require("jsdom");
const cmcAPI = require('./cmc-api');
const transact = require('./transact');
const allTransactions = getTransactions();

module.exports = async function runBinance(){
  const newSymbol = await getNewTokenSymbol();
  if (!newSymbol) return;
  const address = await getTokenAddress(newSymbol);
  const txData = await transact('buy', address);
  console.log(txData);
  // if (txData) {
  //   //writeDown('buy', token);
  //   //addCMCToken(token, txData);
  // }

  async function getTokenAddress(symbol){
    const data = await cmcAPI('/info', {symbol});
    const token = Object.values(data)[0];
    return token?.platform?.token_address;
  }
  async function getNewTokenSymbol(){
    const announcementsUrl = 'https://www.binance.com/en/support/announcement/c-48';  
    const {document} = (await JSDOM.fromURL(announcementsUrl)).window
    const links = Array.from(document.querySelectorAll('a'));
    const announcements = links.filter(hasWillList);
    const firstAnnouncement = announcements[0];
    const symbol = announcementToSymbol(firstAnnouncement);
    if (isNew(symbol)) return symbol;
    
    function announcementToSymbol(a){
      const text = a.textContent;
      const withParentheses = text.match(/\([A-Z0-9]{2,7}\)/)?.[0];
      return withParentheses.replace('(', '').replace(')', '');
    }
    function isNew(symbol){      
      const found = allTransactions.binance.find(t => t.symbol == symbol);
      return found ? false : true;
    }
    function hasWillList(a){
      return a.textContent.includes('Will List');
    }
  }
}

function getTransactions(){
  return JSON.parse(fs.readFileSync('./transactions.json'));  
}