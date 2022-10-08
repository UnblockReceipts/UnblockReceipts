//Adapted From Coinbase node documentation
//Run with `npx ts-node queryCoinbase.ts`
const { ethers } = require('ethers');

async function getFormattedETHBalance() {
	const provider = new ethers.providers.JsonRpcProvider({
		url: 'https://mainnet.ethereum.coinbasecloud.net',
		user: 'WR5CGFRJSKSID364W4CW',
		password: '5MQCC4HB5X7RXNPDODB6SBWREAEK2LLKKDBVUIHI',
	});
	const balance = await provider.getBalance('0xc94770007dda54cF92009BFF0dE90c06F603a09f')
	const balanceFormatted = ethers.utils.formatEther(balance)
	return balanceFormatted;
}
getFormattedETHBalance().then(function(formattedBalance) {
	console.log('Your ETH balance is ', formattedBalance);
});
