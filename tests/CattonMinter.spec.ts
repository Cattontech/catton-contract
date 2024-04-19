import { Blockchain, SandboxContract, TreasuryContract, internal } from '@ton/sandbox';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import { CattonMinter, cattonContentToCell } from '../wrappers/CattonMinter';
import { CattonWallet } from '../wrappers/CattonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Errors, Op } from '../wrappers/Constants';
import { getRandomTon } from './utils';

describe('CattonToken', () => {
    let minterCode: Cell;
    let walletcode: Cell;

    let fwd_fee = 1804014n, gas_consumption = 15000000n, min_tons_for_storage = 10000000n

    beforeAll(async () => {
        minterCode = await compile('CattonMinter');
        walletcode = await compile('CattonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let trader: SandboxContract<TreasuryContract>;
    let cattonMinter: SandboxContract<CattonMinter>;
    let defaultContent: Cell;
    let userWallet: any;
    let initialJettonBalance = toNano('10000000');

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        trader = await blockchain.treasury('trader');

        defaultContent = cattonContentToCell({ type: 1, uri: "https://testjetton.org/content.json" });

        cattonMinter = blockchain.openContract(CattonMinter.createFromConfig({
            admin: deployer.address,
            content: defaultContent,
            wallet_code: walletcode,
        }, minterCode));

        userWallet = async (address: Address) => blockchain.openContract(
            CattonWallet.createFromAddress(
                await cattonMinter.getWalletAddress(address)
            )
        );

        const deployResult = await cattonMinter.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: cattonMinter.address,
            deploy: true,
            success: true,
        });
    });

    async function mintTokenToDeploper() {
        return await cattonMinter.sendMint(deployer.getSender(), deployer.address, initialJettonBalance, toNano('0.05'), toNano('1'));
    }

    it('minter admin should be able to mint jettons', async () => {
        // can mint from deployer
        let initialTotalSupply = await cattonMinter.getTotalSupply();

        const deployerJettonWallet = await userWallet(deployer.address);

        const mintResult = await mintTokenToDeploper();

        expect(mintResult.transactions).toHaveTransaction({
            from: cattonMinter.address,
            to: deployerJettonWallet.address,
            deploy: true,
        });

        expect(mintResult.transactions).toHaveTransaction({ // excesses
            from: deployerJettonWallet.address,
            to: cattonMinter.address
        });


        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await cattonMinter.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
        initialTotalSupply += initialJettonBalance;

        console.log("initialTotalSupply", initialTotalSupply);

    });

    it('Cannot mint > Maxsupply', async () => {
        await mintTokenToDeploper();

        let amount = toNano('100');
        const mintExcessMaxSupply = await cattonMinter.sendMint(deployer.getSender(), deployer.address, amount, toNano('0.05'), toNano('1'));
        expect(mintExcessMaxSupply.transactions).toHaveTransaction({
            from: deployer.address,
            to: cattonMinter.address,
            aborted: true,
            exitCode: Errors.max_supply, // error::max_supply
        });
    });

    // Implementation detail
    it('minter admin can change admin', async () => {
        const adminBefore = await cattonMinter.getAdminAddress();
        expect(adminBefore).toEqualAddress(deployer.address);
        let res = await cattonMinter.sendChangeAdmin(deployer.getSender(), trader.address);
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            on: cattonMinter.address,
            success: true
        });

        const adminAfter = await cattonMinter.getAdminAddress();
        expect(adminAfter).toEqualAddress(trader.address);
        await cattonMinter.sendChangeAdmin(trader.getSender(), deployer.address);
        expect((await cattonMinter.getAdminAddress()).equals(deployer.address)).toBe(true);
    });

    it('not a minter admin can not change admin', async () => {
        const adminBefore = await cattonMinter.getAdminAddress();
        expect(adminBefore).toEqualAddress(deployer.address);
        let changeAdmin = await cattonMinter.sendChangeAdmin(trader.getSender(), trader.address);
        expect((await cattonMinter.getAdminAddress()).equals(deployer.address)).toBe(true);
        expect(changeAdmin.transactions).toHaveTransaction({
            from: trader.address,
            on: cattonMinter.address,
            aborted: true,
            exitCode: Errors.not_admin, // error::unauthorized_change_admin_request
        });
    });


    it('wallet owner should be able to send jettons', async () => {
        await mintTokenToDeploper();
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        let initialTotalSupply = await cattonMinter.getTotalSupply();
        const traderJettonWallet = await userWallet(trader.address);
        let initialJettonBalance2 = await traderJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        let forwardAmount = toNano('0.05');
        const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, trader.address,
            deployer.address, null, forwardAmount, null);
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: deployer.address,
            to: deployerJettonWallet.address,
        });
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: deployerJettonWallet.address,
            to: traderJettonWallet.address,
        });
        expect(sendResult.transactions).toHaveTransaction({ //notification
            from: traderJettonWallet.address,
            to: trader.address,
            value: forwardAmount
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
        expect(await traderJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
        expect(await cattonMinter.getTotalSupply()).toEqual(initialTotalSupply);
    });

    it('not wallet owner should not be able to send jettons', async () => {
        await mintTokenToDeploper();
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        let initialTotalSupply = await cattonMinter.getTotalSupply();
        const traderJettonWallet = await userWallet(trader.address);
        let initialJettonBalance2 = await traderJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        const sendResult = await deployerJettonWallet.sendTransfer(trader.getSender(), toNano('0.1'), //tons
            sentAmount, trader.address,
            deployer.address, null, toNano('0.05'), null);
        expect(sendResult.transactions).toHaveTransaction({
            from: trader.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.not_owner, //error::unauthorized_transfer
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await traderJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
        expect(await cattonMinter.getTotalSupply()).toEqual(initialTotalSupply);
    });

    it('impossible to send too much jettons', async () => {
        await mintTokenToDeploper();
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        const traderJettonWallet = await userWallet(trader.address);
        let initialJettonBalance2 = await traderJettonWallet.getJettonBalance();
        let sentAmount = initialJettonBalance + 1n;
        let forwardAmount = toNano('0.05');
        const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, trader.address,
            deployer.address, null, forwardAmount, null);
        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.balance_error, //error::not_enough_jettons
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await traderJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
    });

    it.skip('malformed forward payload', async () => {

        const deployerJettonWallet = await userWallet(deployer.address);
        const traderJettonWallet = await userWallet(trader.address);

        let sentAmount = toNano('0.5');
        let forwardAmount = getRandomTon(0.01, 0.05); // toNano('0.05');
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
        let msgPayload = beginCell().storeUint(0xf8a7ea5, 32).storeUint(0, 64) // op, queryId
            .storeCoins(sentAmount).storeAddress(trader.address)
            .storeAddress(deployer.address)
            .storeMaybeRef(null)
            .storeCoins(toNano('0.05')) // No forward payload indication
            .endCell();
        const res = await blockchain.sendMessage(internal({
            from: deployer.address,
            to: deployerJettonWallet.address,
            body: msgPayload,
            value: toNano('0.2')
        }));


        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: 708
        });
    });

    it('correctly sends forward_payload', async () => {
        await mintTokenToDeploper();
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        const traderJettonWallet = await userWallet(trader.address);
        let initialJettonBalance2 = await traderJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        let forwardAmount = toNano('0.05');
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, trader.address,
            deployer.address, null, forwardAmount, forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: deployerJettonWallet.address,
            to: traderJettonWallet.address,
        });
        /*
        transfer_notification#7362d09c query_id:uint64 amount:(VarUInteger 16)
                                      sender:MsgAddress forward_payload:(Either Cell ^Cell)
                                      = InternalMsgBody;
        */
        expect(sendResult.transactions).toHaveTransaction({ //notification
            from: traderJettonWallet.address,
            to: trader.address,
            value: forwardAmount,
            body: beginCell().storeUint(Op.transfer_notification, 32).storeUint(0, 64) //default queryId
                .storeCoins(sentAmount)
                .storeAddress(deployer.address)
                .storeUint(1, 1)
                .storeRef(forwardPayload)
                .endCell()
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
        expect(await traderJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
    });

    it('no forward_ton_amount - no forward', async () => {
        await mintTokenToDeploper();
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        const traderJettonWallet = await userWallet(trader.address);
        let initialJettonBalance2 = await traderJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        let forwardAmount = 0n;
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, trader.address,
            deployer.address, null, forwardAmount, forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: deployerJettonWallet.address,
            to: traderJettonWallet.address,
        });

        expect(sendResult.transactions).not.toHaveTransaction({ //no notification
            from: traderJettonWallet.address,
            to: trader.address
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
        expect(await traderJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
    });

    it('check revert on not enough tons for forward', async () => {
        await mintTokenToDeploper();
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        await deployer.send({ value: toNano('1'), bounce: false, to: deployerJettonWallet.address });
        let sentAmount = toNano('0.1');
        let forwardAmount = toNano('0.3');
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
        const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), forwardAmount, // not enough tons, no tons for gas
            sentAmount, trader.address,
            deployer.address, null, forwardAmount, forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            on: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.not_enough_ton, //error::not_enough_tons
        });
        // Make sure value bounced
        expect(sendResult.transactions).toHaveTransaction({
            from: deployerJettonWallet.address,
            on: deployer.address,
            inMessageBounced: true,
            success: true
        });

        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    });

    // it('works with minimal ton amount', async () => {
    //     await mintTokenToDeploper();
    //     const deployerJettonWallet = await userWallet(deployer.address);
    //     let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    //     const someAddress = Address.parse("EQD__________________________________________0vo");
    //     const someJettonWallet = await userWallet(someAddress);
    //     let initialJettonBalance2 = await someJettonWallet.getJettonBalance();
    //     await deployer.send({ value: toNano('1'), bounce: false, to: deployerJettonWallet.address });

    //     let forwardAmount = toNano('0.003');
    //     /*
    //                  forward_ton_amount +
    //                  fwd_count * fwd_fee +
    //                  (2 * gas_consumption + min_tons_for_storage));
    //     */
    //     let minimalFee = 2n * fwd_fee + 2n * gas_consumption + min_tons_for_storage;
    //     let sentAmount = forwardAmount + minimalFee; // not enough, need >
    //     let forwardPayload = null;
    //     let tonBalance = (await blockchain.getContract(deployerJettonWallet.address)).balance;
    //     let tonBalance2 = (await blockchain.getContract(someJettonWallet.address)).balance;
    //     console.log("tonBalance", tonBalance)
    //     console.log("tonBalance2", tonBalance2)
    //     let sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), sentAmount,
    //         sentAmount, someAddress,
    //         deployer.address, null, forwardAmount, forwardPayload);
    //     expect(sendResult.transactions).toHaveTransaction({
    //         from: deployerJettonWallet.address,
    //         to: someJettonWallet.address,
    //         aborted: true,
    //         exitCode: Errors.not_enough_ton, //error::not_enough_tons
    //     });
    //     sentAmount += 1n; // now enough
    //     sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), sentAmount,
    //         sentAmount, someAddress,
    //         deployer.address, null, forwardAmount, forwardPayload);
    //     expect(sendResult.transactions).not.toHaveTransaction({ //no excesses
    //         from: someJettonWallet.address,
    //         to: deployer.address,
    //     });
    //     /*
    //     transfer_notification#7362d09c query_id:uint64 amount:(VarUInteger 16)
    //                                   sender:MsgAddress forward_payload:(Either Cell ^Cell)
    //                                   = InternalMsgBody;
    //     */
    //     expect(sendResult.transactions).toHaveTransaction({ //notification
    //         from: someJettonWallet.address,
    //         to: someAddress,
    //         value: forwardAmount,
    //         body: beginCell().storeUint(Op.transfer_notification, 32).storeUint(0, 64) //default queryId
    //             .storeCoins(sentAmount)
    //             .storeAddress(deployer.address)
    //             .storeUint(0, 1)
    //             .endCell()
    //     });
    //     expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
    //     expect(await someJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);

    //     tonBalance = (await blockchain.getContract(deployerJettonWallet.address)).balance;
    //     expect((await blockchain.getContract(someJettonWallet.address)).balance).toBeGreaterThan(min_tons_for_storage);
    // });

    // // implementation detail
    // it('wallet does not accept internal_transfer not from wallet', async () => {
    //     const deployerJettonWallet = await userWallet(deployer.address);
    //     let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    //     /*
    //       internal_transfer  query_id:uint64 amount:(VarUInteger 16) from:MsgAddress
    //                          response_address:MsgAddress
    //                          forward_ton_amount:(VarUInteger 16)
    //                          forward_payload:(Either Cell ^Cell)
    //                          = InternalMsgBody;
    //     */
    //     let internalTransfer = beginCell().storeUint(0x178d4519, 32).storeUint(0, 64) //default queryId
    //         .storeCoins(toNano('0.01'))
    //         .storeAddress(deployer.address)
    //         .storeAddress(deployer.address)
    //         .storeCoins(toNano('0.05'))
    //         .storeUint(0, 1)
    //         .endCell();
    //     const sendResult = await blockchain.sendMessage(internal({
    //         from: trader.address,
    //         to: deployerJettonWallet.address,
    //         body: internalTransfer,
    //         value: toNano('0.3')
    //     }));
    //     expect(sendResult.transactions).toHaveTransaction({
    //         from: trader.address,
    //         to: deployerJettonWallet.address,
    //         aborted: true,
    //         exitCode: Errors.not_valid_wallet, //error::unauthorized_incoming_transfer
    //     });
    //     expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    // });

});
