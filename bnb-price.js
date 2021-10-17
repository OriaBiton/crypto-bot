const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();
const key = process.env.COINLAYER_API_KEY;
const params = {
  access_key: key,
  symbols: 'BNB'
};
const url = new URL(`http://api.coinlayer.com/api/live`);
url.search = new URLSearchParams(params);
module.exports = async function getBnbPrice(){
  return 468.302834;
  const {rates} = await (await fetch(url.href)).json();
  return rates.BNB;
}