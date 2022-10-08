//Adapted From Coinbase node documentation
//Run with `npx ts-node queryCoinbase.ts`
const { ethers } = require('ethers');

async function getFormattedETHBalance() {
	const provider = new ethers.providers.JsonRpcProvider({
		url: 'https://mainnet.ethereum.coinbasecloud.net',
		user: 'WR5CGFRJSKSID364W4CW',
		password: '5MQCC4HB5X7RXNPDODB6SBWREAEK2LLKKDBVUIHI',
	});
	const receipt = await provider.getTransactionReceipt('0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2');
	const txn = await provider.getTransaction('0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2');
	return  {
		value: txn.value,
		gasUsed: receipt.gasUsed,
		//cumulativeGasUsed: receipt.cumulativeGasUsed, //includes txes before the current one in the same block.
		effectiveGasPrice: receipt.effectiveGasPrice,
		gasPrice: txn.gasPrice,
		gasLimit: txn.gasLimit,
	};
}
getFormattedETHBalance().then(function(formattedBalance) {
	console.log('Txn data: ', formattedBalance);
});
