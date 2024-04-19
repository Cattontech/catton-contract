import { toNano } from '@ton/core';
import { cattonContentToCell, CattonMinter } from '../wrappers/CattonMinter';
import { compile, NetworkProvider, sleep } from '@ton/blueprint';
import { getKeyWallet, saveDeploymentInfo, tonClient } from '../utils';

export async function run(provider: NetworkProvider) {
    const client = tonClient();
    const keyAndWallet: any = await getKeyWallet();

    const walletcode = await compile('CattonWallet');
    const minterCode = await compile('CattonMinter');

    const defaultContent = cattonContentToCell({ type: 1, uri: "https://bc-test.catton.tech/test-jetton-data" });
    const cattonMinter = provider.open(CattonMinter.createFromConfig({
        admin: keyAndWallet.wallet.address,
        content: defaultContent,
        wallet_code: walletcode,
    }, minterCode));

    const walletContract = client.open(keyAndWallet.wallet);
    const walletSender = walletContract.sender(keyAndWallet.key.secretKey);
    const seqno = await walletContract.getSeqno();

    await cattonMinter.sendDeploy(walletSender, toNano('0.05'));
    await provider.waitForDeploy(cattonMinter.address);

    const data = {
        name: "CattonMinter",
        address: cattonMinter.address.toString({ bounceable: true })
    }
    await saveDeploymentInfo(data, "CattonMinter");
}
