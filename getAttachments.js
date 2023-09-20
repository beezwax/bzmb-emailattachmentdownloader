const { ImapFlow } = require('imapflow');

const getAttachments = async (config) => {
  const { imapConfig, processedFolder, errorFolder } = config;
  const client = new ImapFlow({imapConfig});

  const childNodes = [];
  const attachments = [];

  await client.connect();

  let lock = await client.getMailboxLock('INBOX');

  try {
    const messageGenerator = client.fetch({seen: false}, { source: true, bodyStructure: true });

    for await (const message of messageGenerator) {

      message.bodyStructure.childNodes.forEach(node => {
        if(node.disposition === "attachment") {
          childNodes.push({uid: message.uid, part: node.part});
        }
      });
    }

    for (const childNode of childNodes) {
      const { meta, content } = await client.download(childNode.uid, childNode.part, {uid: true});
      const base64Content = await streamToBase64(content);
      attachments.push({filename: meta.filename, data: base64Content});
    }

    // Get UUIDs of processed messagges
    const targetMessages = childNodes.map(childNode => childNode.uid).filter((uid, index, arr) => arr.indexOf(uid === index)).join(",");

    // Mark processed messages read
    await client.messageFlagsSet(targetMessages, ["\\Seen"], {uid: true});
  
    // Move processed messages to processed folder if provided
    if (processedFolder) {
      await client.messageMove(targetMessages, "Processed", {uid: true})
    }
    
  } finally {
    lock.release();
  }
}

(async () => {
  const client = new ImapFlow(imapConfig);

  await client.connect();

  let lock = await client.getMailboxLock('INBOX');

  const messageGenerator = client.fetch({seen: false}, { source: true, bodyStructure: true });

  const childNodes = [];

  const attachments = [];

  for await (const message of messageGenerator) {

    message.bodyStructure.childNodes.forEach(node => {
      if(node.disposition === "attachment") {
        childNodes.push({uid: message.uid, part: node.part});
      }
    });
  }

  // console.log(childNodes);

  for (const childNode of childNodes) {
    const { meta, content } = await client.download(childNode.uid, childNode.part, {uid: true});
    const base64Content = await streamToBase64(content);
    attachments.push({filename: meta.filename, data: base64Content});
  }

  // console.log(attachments);

  const targetMessages = childNodes.map(childNode => childNode.uid).filter((uid, index, arr) => arr.indexOf(uid === index)).join(",");

  // Mark messages read
  await client.messageFlagsSet(targetMessages, ["\\Seen"], {uid: true});

  // Move to processed
  await client.messageMove(targetMessages, "Processed", {uid: true})

})();

/**
 * Convert a Readable Stream to base64 string
 * @param {ReadableStream} stream - a readable stream to convert in base64 string
 * @returns {Promise} - Promise that resolve in a string containing the base64
 */
const streamToBase64 = (stream) => {
  const concat = require('concat-stream');
  const { Base64Encode } = require('base64-stream');

  return new Promise((resolve, reject) => {
    const base64 = new Base64Encode()

    const cbConcat = (base64) => {
      resolve(base64)
    }

    stream
      .pipe(base64)
      .pipe(concat(cbConcat))
      .on('error', (error) => {
        reject(error)
      })
  })
}

module.exports = getAttachments;