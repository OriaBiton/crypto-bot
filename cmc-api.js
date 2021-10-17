const fetch = require('node-fetch');
const { CMC_API_KEY } = process.env;
const test = !true;

module.exports = async function(endpoint, getParams){
  const url = new URL(`https://${test ? 'sandbox' : 'pro'}-api.coinmarketcap.com/v1/cryptocurrency${endpoint}`);
  url.search = new URLSearchParams(getParams);
  const options = {headers: {'X-CMC_PRO_API_KEY': CMC_API_KEY}};
  const {data} = await (await fetch(url.href, options)).json();
  return data;
}