
import { Address, Cell, TonClient, WalletContractV4 } from '@ton/ton';
import * as fs from "fs";
import { mnemonicToWalletKey } from "ton-crypto";
import dotenv = require('dotenv');
dotenv.config();

const folderPath = "./deployInfo";

export function tonClient() {
    const endpoint = process.env.RPC_ENDPOINT || "";
    const api_key = process.env.API_KEY;
    return new TonClient({ endpoint, apiKey: api_key });
}

export function cellCode(fileName: string) {
    return Cell.fromBoc(fs.readFileSync(`build/${fileName}.cell`))[0];
}

export async function getKeyWallet() {
    const mnemonic = process.env.WALLET_MNEMONIC || "";
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    if (!await tonClient().isContractDeployed(wallet.address)) {
        return console.log("wallet is not deployed");
    }
    return {
        key: key,
        wallet: wallet
    }
}

export async function saveDeploymentInfo(info: any, filename: string) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    if (!filename) {
        console.log(`!file name`);
        return;
    }
    const filePath = `${folderPath}/${filename}.json`;
    const content = JSON.stringify(info, null, 2);
    fs.writeFileSync(filePath, content, { encoding: "utf-8" });
    console.log(`Writing deployment info to ${filePath}`);
    return true;
}

export async function loadDeploymentInfo(filename: any) {
    const filePath = `${folderPath}/${filename}.json`;
    if (!fs.existsSync(filePath)) {
        console.log(`${filename} not existed.`);
        return
    }
    const content = fs.readFileSync(filePath, { encoding: "utf8" });
    const info = JSON.parse(content);
    console.log(`Load ${filename} info: ${info.address}`);
    return Address.parse(info.address);
}