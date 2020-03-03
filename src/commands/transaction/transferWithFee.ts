
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
    NamespaceHttp,
    Address,
    Deadline,
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    NamespaceId,
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
    description: 'Send TransferTransaction',
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

        const recipient = this.getAddress("tester2");
        return await this.sendTransferTo(recipient);
    }

    public async sendTransferTo(recipient: Address): Promise<Object>
    {
        // TEST 2: send transfer with alias `cat.currency`
        let mosaics: Mosaic[] = [];

        // read mosaic Id from namespace name
        const namespaceHttp = new NamespaceHttp(this.endpointUrl);
        const namespaceId = new NamespaceId(this.networkConfig.currencyMosaic);
        const mosaicId = await namespaceHttp.getLinkedMosaicId(namespaceId).toPromise();

        // attach mosaicId !
        mosaics.push(new Mosaic(mosaicId, UInt64.fromUint(10)));

        const account   = this.getAccount("tester1");
        const message   = PlainMessage.create("Testing transfer with fee");

        // prepare SDK transaction and sign it
        const transferTransaction = TransferTransaction.create(
            Deadline.create(), 
            recipient, 
            mosaics, 
            message, 
            this.networkType,
            new UInt64([5000000, 0]), // set 5 `cat.currency` fee
        );

        const signedTransaction = account.sign(transferTransaction, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);

        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('Transaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
        }, (err) => {
            let text = '';
            text += 'testTransferAction() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
