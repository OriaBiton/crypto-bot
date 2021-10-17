require('dotenv').config();
const fs = require('fs');
const cmcAPI = require('./cmc-api');
const transact = require('./transact');
const allTransactions = getTransactions();

module.exports = async function runCMC(){
  const data = cmcAPI('/listings/latest', {limit: 5, sort: 'date_added'});
  return console.log(data);
  const tx = await transact('sell', '0x2a3e1d095f2902c9b6da1bff7813a7b2fc65c3da');
  addCMCToken('0x2a3e1d095f2902c9b6da1bff7813a7b2fc65c3da', tx);
  //const newTokens = (await getFreshTokens()).filter(isNew);
  //newTokens.forEach(buy);
  //buy(newTokens[0]);
  //write('buy', );
  
  async function buy(token){
    console.log('Trying to buy ' + token.name);
    const platform = token.platform;
    if (!platform) return console.error('No platform');
    if (platform.symbol != 'BNB') return console.error('Not BSC');

    const address = platform.token_address;
    const txData = await transact('buy', address);
    if (txData) {
      //writeDown('buy', token);
      addCMCToken(token, txData);
    }
    
  }
  function addCMCToken(token, tx){    
    allTransactions.cmc.push({
      name: token.name,
      symbol: token.symbol,
      address: token.platform.token_address,
      id: token.id,
      ...tx
    });
    console.log(allTransactions);
  }
  function writeDown(type, token){
    const json = require('./log.json');
    console.log(json);
  }
  async function getFreshTokens(){
    const options = {headers: {'X-CMC_PRO_API_KEY': CMC_API_KEY}};
    const {data} = await (await fetch(cmcUrl.href, options)).json();
    return data;
  }
  function isNew({id}){
    const found = allTransactions.cmc.find(t => t.id == id);
    return found ? false : true;
  }
}

function getTransactions(){
  return JSON.parse(fs.readFileSync('./transactions.json'));  
}