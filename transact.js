const ethers = require('ethers');
const dotenv = require('dotenv');
const getBnbPrice = require('./bnb-price');
dotenv.config();

const data = {
  gasPrice: ethers.utils.parseUnits(`${process.env.GWEI}`, 'gwei'), //in gwei
  gasLimit: process.env.GAS_LIMIT, //at least 21000
  minBnb: process.env.MIN_LIQUIDITY_ADDED //min liquidity added
};

let initialLiquidityDetected = false;
let jmlBnb = 0;
let txType;
let spendAmount;
let purchaseData;

const myAddress = process.env.YOUR_ADDRESS;
const wbnb = process.env.WBNB_CONTRACT;
const wss = process.env.WSS_NODE;
const mnemonic = process.env.YOUR_MNEMONIC //your memonic;
const slippage = process.env.SLIPPAGE; // as %
// const provider = new ethers.providers.JsonRpcProvider(bscMainnetUrl)
const provider = new ethers.providers.WebSocketProvider(wss);
const wallet = new ethers.Wallet(mnemonic);
const account = wallet.connect(provider);
const contracts = {
  factory: new ethers.Contract(
    process.env.FACTORY,
    [
      'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
      'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    account
  ),
  router: new ethers.Contract(
    process.env.ROUTER,
    [
      'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
      'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
      'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
      'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external payable'
    ],
    account
  ),
  erc: null
};

async function transact(type, token) {
  setTxType(type);
  setERCContract(token);
  await setSpendAmount();

  if (type == 'buy') await checkLiq(wbnb, token);
  else if (type == 'sell') await checkLiq(token, wbnb);
  else { throw new Error(`transaction type ${type} is invalid.`) }
  return purchaseData;
}

async function checkLiq(tokenIn, tokenOut) {
  console.log('Token in', tokenIn);
  console.log('Token out', tokenOut);
  const pairAddressx = await contracts.factory.getPair(tokenIn, tokenOut);
  console.log(`pairAddress: ${pairAddressx}`);
  if (pairAddressx) {
    if (pairAddressx.toString().includes('0x0000000000000')) {
      console.log(`pairAddress ${pairAddressx} not detected. Auto restart`);
      return; //return await checkLiq();
    }
  }
  const pairBNBvalue = await contracts.erc.balanceOf(pairAddressx);
  jmlBnb = ethers.utils.formatEther(pairBNBvalue);
  console.log(`value BNB : ${jmlBnb}`);

  if (jmlBnb > data.minBnb) {
    await buyAction(tokenIn, tokenOut);
  }
  else {
    initialLiquidityDetected = false;
    console.log(' run again...');
    //return await run();
  }
}
async function buyAction(tokenIn, tokenOut) {
  if (initialLiquidityDetected === true) {
    return console.log('not buy cause already buy');
  }
  initialLiquidityDetected = true;

  let amountOutMin = 0;
  console.log("spendAmount: ", spendAmount);
  const amountIn = ethers.utils.parseEther(`${spendAmount}`);  

  if (parseInt(slippage) !== 0) {
    const amounts = await contracts.router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    console.log(ethers.utils.formatEther(amounts[1]));
    //Our execution price will be a bit different, we need some flexibility    
    amountOutMin = amounts[1].sub(amounts[1].div(slippage));
  }
  console.log(
    `Start to buy \n`
    +
    `Buying Token
      =================
      tokenIn: ${ethers.utils.formatEther(amountIn)} ${tokenIn}
      tokenOut: ${ethers.utils.formatEther(amountOutMin)} ${tokenOut}
    `);

  console.log('Processing Transaction.....');
  console.log(`amountIn: ${ethers.utils.formatEther(amountIn)} ${tokenIn}`);
  console.log(`amountOutMin: ${ethers.utils.formatEther(amountOutMin)}`);
  console.log(`myAddress: ${myAddress}`);
  console.log(`gasLimit: ${data.gasLimit}`);

  let tx;
  if (isBuy()){
    tx = await contracts.router.swapETHForExactTokens(
      amountOutMin,
      [tokenIn, tokenOut],
      myAddress,
      Date.now() + 1000 * 60 * 5, //5 minutes
      {
        'gasLimit': data.gasLimit,
        'gasPrice': data.gasPrice,
        'nonce': null, //set you want buy at where position in blocks
        'value': amountIn
      }
    );
  }
  else {
    tx = await contracts.router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      amountIn,
      amountOutMin,
      [tokenIn, tokenOut],
      myAddress,
      Date.now() + 1000 * 60 * 5,
      {
        'gasLimit': data.gasLimit,
        'gasPrice': data.gasPrice,
        'nonce': null, //set you want buy at where position in blocks
        'value': amountIn
      }
    );
  }

  const receipt = await tx.wait();
  console.log(receipt);
  const txHash = receipt.transactionHash;
  const timestamp = Date.now();
  console.log(`Tx receipt: https://www.bscscan.com/tx/${txHash}`);  
  purchaseData = {txType, spendAmount, txHash, timestamp};
}


async function setSpendAmount() {
  if (isBuy()){
    const usdToSpend = process.env.SPEND_AMOUNT;
    const bnbPrice = await getBnbPrice();
    spendAmount = (usdToSpend / bnbPrice).toPrecision(5);
  }
  else spendAmount = await totalTokens();

  async function totalTokens(){
    if (isBuy()) throw new Error('Mismatch: cant buy with Token!');
    const balance = await contracts.erc.balanceOf(myAddress);
    //const decimals = await contracts.erc.decimals();
    //data.decimals = decimals;
    return ethers.utils.formatUnits(balance);
  }
}
function isBuy(){
  return txType == 'buy';
}
function setTxType(t){
  txType = t;
}
function setERCContract(token){
  contracts.erc = new ethers.Contract(
    isBuy() ? wbnb : token,
    [
      'function balanceOf(address owner) view returns (uint256)',
      'function approve(address _spender, uint256 _value) public returns (bool success)',
      "function decimals() view returns (uint256)"
    ],
    account
  );
}
module.exports = transact;