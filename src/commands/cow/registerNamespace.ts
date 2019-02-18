
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
    Account,
    NetworkType,
    MosaicId,
    MosaicService,
    AccountHttp,
    MosaicHttp,
    NamespaceHttp,
    MosaicView,
    MosaicInfo,
    Address,
    Deadline,
    Mosaic,
    PlainMessage,
    TransactionHttp,
    TransferTransaction,
    LockFundsTransaction,
    XEM,
    PublicAccount,
    TransactionType,
    Listener,
    EmptyMessage,
    AggregateTransaction,
    MosaicDefinitionTransaction,
    MosaicProperties,
    MosaicSupplyChangeTransaction,
    MosaicSupplyType,
    RegisterNamespaceTransaction
} from 'nem2-sdk';

import {
    convert,
    mosaicId,
    nacl_catapult,
    uint64 as uint64_t
} from "nem2-library";

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'n',
        description: 'Namespace name',
    })
    name: string;
}

@command({
    description: 'Check for cow compatibility of RegisterNamespace',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        this.monitorAction();

        let name;
        try {
            name = OptionsResolver(options,
                'name',
                () => { return ''; },
                'Enter a namespace name: ');
        } catch (err) {
            console.log(options);
            throw new ExpectedError('Enter a valid namespace name');
        }

        return await this.registerNamespace(name);
    }

    public async registerNamespace(name: string): Promise<Object>
    {
        const address = this.getAddress();
        const account = this.getAccount();

        // TEST: send register namespace transaction

        const bytes = nacl_catapult.randomBytes(8);
        const nonce = uint64_t.fromBytes(bytes);
        const mosId = mosaicId(nonce, convert.hexToUint8(account.publicKey));

        const registerTx = RegisterNamespaceTransaction.createRootNamespace(
            Deadline.create(),
            name,
            UInt64.fromUint(1000),
            NetworkType.MIJIN_TEST
        );

        const signedTransaction = account.sign(registerTx);

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('RegisterNamespaceTransaction announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signer);
            console.log("");
        }, (err) => {
            let text = '';
            text += 'registerNamespace() RegisterNamespaceTransaction - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
