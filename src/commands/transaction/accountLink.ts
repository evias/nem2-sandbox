
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
import * as readlineSync from 'readline-sync';
import {command, ExpectedError, metadata, option} from 'clime';
import {
    NetworkType,
    NamespaceId,
    Address,
    Deadline,
    TransactionHttp,
    AccountLinkTransaction,
    LinkAction,
    UInt64,
    Account,
    AccountType,
} from 'nem2-sdk';

import {OptionsResolver} from '../../options-resolver';
import {BaseCommand, BaseOptions} from '../../base-command';

export class CommandOptions extends BaseOptions {
    @option({
        flag: 'p',
        description: 'Private key of your account',
    })
    privateKey: string;
}

@command({
    description: 'Check for cow compatibility of AccountLinkTransaction',
})
export default class extends BaseCommand {

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        await this.setupConfig();

        let action = OptionsResolver(options, 'linkAction', () => { return ''; },
            'Enter 0 for UNLINK or 1 for LINK: ');
        const linkAction: LinkAction = action == '0' ? LinkAction.Unlink : LinkAction.Link

        console.log('');
        const privateKey = OptionsResolver(options,
            'privateKey',
            () => { return ''; },
            'Enter your account private key: ');

        const account: Account = Account.createFromPrivateKey(privateKey, this.networkType)

        console.log('');
        const inputRemote = readlineSync.keyInYN(
            'Do you want to enter a delegated account private key? ');

        let remoteAccount: Account
        if (inputRemote === true) {
            console.log('');
            const delegatedPrivateKey = OptionsResolver(options,
                'delegatedPrivateKey',
                () => { return ''; },
                'Enter your delegated account private key: ');

            remoteAccount = Account.createFromPrivateKey(delegatedPrivateKey, this.networkType)
        }
        else {
            remoteAccount =  Account.generateNewAccount(this.networkType)
        }

        // add a block monitor
        this.monitorBlocks();

        const address = account.address
        this.monitorAddress(address.plain());

        return await this.createAccountLink(account, remoteAccount, linkAction);
    }

    public async createAccountLink(
        account: Account,
        delegatedAccount: Account,
        linkAction: LinkAction,
    ): Promise<Object>
    {
        const signer = account

        const action = linkAction === LinkAction.Link ? 'Linking' : 'Unlinking'
        console.log(chalk.yellow(action + ' account ' + account.address.plain() + ' and remote public key: ' + delegatedAccount.publicKey))
        console.log(chalk.yellow('Delegated private key: ' + delegatedAccount.privateKey))

        const linkTx = AccountLinkTransaction.create(
            Deadline.create(),
            delegatedAccount.publicKey,
            linkAction,
            this.networkType,
            UInt64.fromUint(1000000), // 1 XEM fee
        );

        const signedTransaction = signer.sign(linkTx, this.generationHash);
        console.log(chalk.yellow('Announcing Transaction Payload: ', signedTransaction.payload))

        // announce/broadcast transaction
        const transactionHttp = new TransactionHttp(this.endpointUrl);
        return transactionHttp.announce(signedTransaction).subscribe(() => {
            console.log('AddressAlias announced correctly');
            console.log('Hash:   ', signedTransaction.hash);
            console.log('Signer: ', signedTransaction.signerPublicKey);
            console.log("");

        }, (err) => {
            let text = '';
            text += 'createAddressAlias() - Error';
            console.log(text, err.response !== undefined ? err.response.text : err);
        });
    }

}
