import { Address, toNano } from '@ton/core';
import { cattonContentToCell, CattonMinter } from '../wrappers/CattonMinter';
import { compile, NetworkProvider, sleep } from '@ton/blueprint';
import { getKeyWallet, loadDeploymentInfo, tonClient } from '../utils';

export async function run(provider: NetworkProvider) {

    const client = tonClient();
    const keyAndWallet: any = await getKeyWallet();

    const contractAddress: any = await loadDeploymentInfo("CattonMinter");
    if (!contractAddress) {
        return;
    }

    const cattonMinter = provider.open(CattonMinter.createFromAddress(contractAddress));

    const walletContract = client.open(keyAndWallet.wallet);
    const walletSender = walletContract.sender(keyAndWallet.key.secretKey);
    const seqno = await walletContract.getSeqno();

    let initialJettonBalance = toNano('5000000');

    await cattonMinter.sendMint(walletSender, keyAndWallet.wallet.address, initialJettonBalance, toNano('0.05'), toNano('0.2'));

    let currentSeqno = seqno;
    while (currentSeqno == seqno) {
        console.log("waiting for transaction to confirm...");
        await sleep(1500);
        currentSeqno = await walletContract.getSeqno();
    }
    console.log("Transaction confirmed!");

}
