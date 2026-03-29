const { getIkasToken } = require('./auth.ts');
const { getSalesChannelId } = require('./merchant.ts');
async function run() {
  const token = await getIkasToken();
  const id = await getSalesChannelId(token);
  console.log('Channel ID:', id);
}
run();
