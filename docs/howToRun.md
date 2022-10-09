## Install dependencies

1. `cd source/backend/nodeDataRelay`
2. `npm i`

In a new terminal:
0. Copy .env.example to .env in the same location and replace the ellipses with your own values.
1. `cd source/frontend`
2. `yarn install`
3. `yarn start` (which will open a browser to localhost:3000)

Example URLs to test:
1. http://localhost:3000
2. http://localhost:3000/tx/0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2
3. http://localhost:3000/tx/0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2,0x2fa6d5ff96474781b10c829a14edb6512004f63e875818808d8e7ffc95b33ae1
4. localhost:3000/tx/0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2,%200x2fa6d5ff96474781b10c829a14edb6512004f63e875818808d8e7ffc95b33ae1
5. http://localhost:3000/acct/0xBc3Eb8299C8647374E69E63a6A2E30398348B91d
6. http://localhost:3000/acct/0x3cd751e6b0078be393132286c442345e5dc49699
7. http://localhost:3000/?acct=ricmoo.eth
To create a production bundle, use `npm run build` or `yarn build`.
