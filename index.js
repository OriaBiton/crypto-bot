require('dotenv').config();
const runBinance = require('./run-binance');
const runCMC = require('./run-cmc');
const { CMC_API_KEY } = process.env;

//runCMC();
runBinance();