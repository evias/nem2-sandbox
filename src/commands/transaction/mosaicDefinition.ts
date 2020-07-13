
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
import * as readlineSync from 'readline-sync';
import {
    UInt64,
    NetworkType,
    MosaicId,
    MosaicNonce,
    Deadline,
    TransactionHttp,
    MosaicDefinitionTransaction,
    MosaicFlags,
} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'd',
        description: 'Divisibility [0, 6]',
    })
    divisibility: number;
}

@command({
    description: 'Check for cow compatibility of MosaicDefinition',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();

        let divisibility = OptionsResolver(options, 'divisibility', () => { return ''; }, 'Enter a mosaic divisibility: ');
        divisibility = divisibility < 0 ? 0 : divisibility > 6 ? 6 : divisibility

        console.log('');
        const supplyMutable = readlineSync.keyInYN(
            'Should the mosaic supply be mutable? ');

        console.log('');
        const transferable = readlineSync.keyInYN(
            'Should the mosaic be transferable? ');

        console.log('');
        const restrictable = readlineSync.keyInYN(
            'Should the mosaic be restrictable? ');

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.createMosaic(divisibility, supplyMutable, transferable, restrictable);
    }

    public async createMosaic(
        divisibility: number,
        supplyMutable: boolean,
        transferable: boolean,
        restrictable: boolean
    ): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send mosaic creation transaction

        // STEP 1: MosaicDefinition
        const nonce = MosaicNonce.createRandom();
        const mosId = MosaicId.createFromNonce(nonce, account.publicAccount.address);

        const createTx = MosaicDefinitionTransaction.create(
            Deadline.create(),
            nonce,
            mosId,
            MosaicFlags.create(supplyMutable, transferable, restrictable),
            divisibility,
            UInt64.fromUint(100000), // 100'000 blocks
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );  

        const signedCreateTransaction = account.sign(createTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedCreateTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedCreateTransaction).subscribe(() => {
            console.log('MosaicDefinition announced correctly');
            console.log('Hash:   ', signedCreateTransaction.hash);
            console.log('Signer: ', signedCreateTransaction.signerPublicKey);

        }, (err) => {
            let text = '';
            text += 'createMosaic() MosaicDefinition - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
