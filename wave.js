import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import fs from 'fs';
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { bcs } from '@mysten/bcs';
import chalk from "chalk";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const getTimeClaim = async (address) => {
  try {
    const response = await fetch('https://fullnode.mainnet.sui.io/', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8',
        'client-sdk-type': 'typescript',
        'client-sdk-version': '0.51.0',
        'client-target-api-version': '1.21.0',
        'content-type': 'application/json',
        'origin': 'https://walletapp.waveonsui.com',
        'priority': 'u=1, i',
        'referer': 'https://walletapp.waveonsui.com/',
        'sec-ch-ua': '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99", "Microsoft Edge WebView2";v="124"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
      },
      body: JSON.stringify({
        'jsonrpc': '2.0',
        'id': 45,
        'method': 'suix_getDynamicFieldObject',
        'params': [
          '0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a',
          {
            'type': 'address',
            'value': address
          }
        ]
      })
    });
    const data = await response.json();
    return data.result.data.content.fields.last_claim;
  } catch (error) {
    console.error(chalk.red("Error fetching claim time: "), error);
    throw error;
  }
};

const processMnemonic = async (mnemonic) => {
  try {
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const address = keypair.getPublicKey().toSuiAddress();
    console.log("============================================================================");
    console.log("Address : " + address);

    const client = new SuiClient({
      url: "https://fullnode.mainnet.sui.io",
    });

    let lastClaimTime = await getTimeClaim(address);
    let currentTime = Date.now();

    const timeElapsed = currentTime - lastClaimTime;

    if (timeElapsed > 7200000) { // Check if 2 hours (7200000 ms) have passed since the last claim
      const packageObjectId = '0x1efaf509c9b7e986ee724596f526a22b474b15c376136772c00b8452f204d2d1';
      const tx = new TransactionBlock();
      tx.moveCall({
        target: `${packageObjectId}::game::claim`,
        arguments: [
          tx.object("0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a"),
          tx.pure('0x0000000000000000000000000000000000000000000000000000000000000006'),
        ],
      });

      const result = await client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
      });
      console.log(chalk.green(`Sukses Claim => https://suiscan.xyz/mainnet/tx/${result.digest}`));
    } else {
      console.log(chalk.red("Belum Waktunya Claim"));
    }
  } catch (error) {
    console.error(chalk.red("Error processing mnemonic: "), error);
  } finally {
    console.log("============================================================================");
  }
};

const main = async () => {
  while (true) {
    try {
      console.log(chalk.blue("Auto claim setiap 30 menit"));
      console.log(chalk.blue("Buy RDP di Alif Gardika"));
      
      const file = fs.readFileSync('phrase.txt', 'utf-8');
      const mnemonics = file.split('\r\n');
      for (let mnemonic of mnemonics) {
        await processMnemonic(mnemonic);
      }
      console.log(chalk.yellow("Menunggu selama 30 menit sebelum memulai siklus berikutnya..."));
      await delay(1800000); // Delay for 30 minutes
    } catch (error) {
      console.error(chalk.red("Error in main function: "), error);
    }
  }
};

main();
