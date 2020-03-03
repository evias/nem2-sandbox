
/**
 * 
 * Copyright 2019 Grégory Saive for NEM (github.com/nemtech)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import chalk from 'chalk';
import {command, ExpectedError, metadata, option} from 'clime';
import {
    UInt64,
    NetworkType,
    AccountHttp,
    NamespaceHttp,
    NamespaceId,
    Address,
    Deadline,
    Mosaic,
    TransactionHttp,
    TransferTransaction,
    LockFundsTransaction,
    EmptyMessage,
    AggregateTransaction,
} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'a',
        description: 'Recipient address',
    })
    address: string;
}

@command({
    description: 'Check for cow compatibility of HashLockTransaction (LockFundsTransaction)',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();
        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        const recipient = Address.createFromRawAddress(address);
        return await this.lockFundsOf(recipient);
    }

    public async lockFundsOf(recipient: Address): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST 3: send hash lock transaction
        const fundsTx = TransferTransaction.create(
            Deadline.create(),
            recipient,
            [],
            EmptyMessage,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const accountHttp = new AccountHttp(this.endpointUrl);
        const namespaceHttp = new NamespaceHttp(this.endpointUrl);

        return accountHttp.getAccountInfo(recipient).subscribe(async (accountInfo) => {
            const aggregateTx = AggregateTransaction.createBonded(
                Deadline.create(),
                [fundsTx.toAggregate(accountInfo.publicAccount)],
                this.networkType, [], UInt64.fromUint(1000000));

            const signedTransaction = account.sign(aggregateTx, this.generationHash);

            // @FIX catapult-server@0.3.0.2 bug with HashLock.mosaics containing namespaceId
            const mosaicId = await namespaceHttp.getLinkedMosaicId(new NamespaceId(this.networkConfig.currencyMosaic)).toPromise();

            // create lock funds of 10 "cat.currency" for the aggregate transaction
            const lockFundsTransaction = LockFundsTransaction.create(
                Deadline.create(),
                new Mosaic(mosaicId, UInt64.fromUint(10000000)),
                UInt64.fromUint(1000),
                signedTransaction,
                this.networkType,
                UInt64.fromUint(1000000), // 1 XEM fee
            );

            const signedLockFundsTransaction = account.sign(lockFundsTransaction, this.generationHash);
            console.log(chalk.yellow('Announcing Transaction Payload: ', signedLockFundsTransaction.payload))

            const transactionHttp = new TransactionHttp(this.endpointUrl);
            transactionHttp.announce(signedLockFundsTransaction).subscribe(() => {
                console.log('Announced lock funds transaction');
                console.log('Hash:   ', signedLockFundsTransaction.hash);
                console.log('Signer: ', signedLockFundsTransaction.signerPublicKey, '\n');
            }, (err) => {
                let text = '';
                text += 'testLockFundsAction() - Error';
                console.log(text, err.response !== undefined ? err.response.text : err);
            });
        }, (err) => {
            console.log("getAccountInfo error: ", err);
        });
    }

}
