
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
    NetworkType,
    MosaicId,
    NamespaceId,
    Deadline,
    TransactionHttp,
    MosaicAliasTransaction,
    AliasAction,
    UInt64,
    RawUInt64,
} from 'symbol-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'n',
        description: 'Namespace name',
    })
    @option({
        flag: 'm',
        description: 'Mosaic ID (JSON Uint64)',
    })
    mosaicId: string;
    namespaceId: string;
}

@command({
    description: 'Check for cow compatibility of MosaicAliasTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();

        let namespaceName;
        try {
            namespaceName = OptionsResolver(options,
                'namespaceName',
                () => { return ''; },
                'Enter a namespaceName: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid namespaceName (Ex: "cat.currency")');
        }

        let mosaicId;
        mosaicId = OptionsResolver(options,
            'mosaicId',
            () => { return ''; },
            'Enter a mosaicId (array notation or hexadecimal): ');

        if (mosaicId.indexOf('[') === 0) {
            // from array notation
            mosaicId = new MosaicId(JSON.parse(mosaicId))
        }
        else {
            // from hex
            mosaicId = new MosaicId(RawUInt64.fromHex(mosaicId))
        }

        // add a block monitor
        this.monitorBlocks();

        const address = this.getAddress("tester1").plain();
        this.monitorAddress(address);

        return await this.createMosaicAlias(namespaceName, mosaicId);
    }

    public async createMosaicAlias(namespace: string, mosaicId: MosaicId): Promise<Object>
    {
        const address = this.getAddress("tester1");
        const account = this.getAccount("tester1");

        // TEST: send mosaic alias transaction

        const actionType  = AliasAction.Link;
        const namespaceId = new NamespaceId(namespace);

        const aliasTx = MosaicAliasTransaction.create(
            Deadline.create(),
            actionType,
            namespaceId,
            mosaicId,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const signedTransaction = account.sign(aliasTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        console.log(aliasTx);
        console.log("Signed Transaction: ", signedTransaction);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('MosaicAlias announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
            console.log("");

        }, (err) => {
            let text = '';
            text += 'createMosaicAlias() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
