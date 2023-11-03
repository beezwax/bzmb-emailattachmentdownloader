const { ImapFlow } = require('imapflow');

const getMessagesWithAttachments = async (config) => {
  const { imapConfig, processedFolder, errorFolder, includeRead } = config;
  const client = new ImapFlow(imapConfig);

  const childNodes = [];
  const textNodes = [];
  const messages = [];

  await client.connect();

  let lock = await client.getMailboxLock('INBOX');

  try {
    const messageGenerator = client.fetch(includeRead ? "1:*" : {seen: false}, { envelope: true, source: true, bodyStructure: true });

    for await (const message of messageGenerator) {

      messages.push({
        subject: message.envelope.subject,
        date: message.envelope.date,
        from: message.envelope.from,
        to: message.envelope.to,
        cc: message.envelope.cc,
        bcc: message.envelope.bcc,
        uid: message.uid,
        attachments: []
      });

      message.bodyStructure.childNodes.forEach(node => {
        if (node.disposition === "attachment") {
          childNodes.push({uid: message.uid, part: node.part});
        } else if (node.type === "text/plain" || node.type === "text/html") {
          textNodes.push({uid: message.uid, part: node.part});
        }
      });
    }

    for (const childNode of childNodes) {
      const { meta, content } = await client.download(childNode.uid, childNode.part, {uid: true});
      const base64Content = await streamToBase64(content);
      const message = messages.find(message => message.uid === childNode.uid);
      let filename = meta.filename;
      if (filename.substring(0, 2) === "=?") {
        filename = atob(filename.split("?B?")[1].slice(0, -2));
      }
      message.attachments.push({filename, data: base64Content});
    }

    for (const textNode of textNodes) {
      const { content } = await client.download(textNode.uid, textNode.part, {uid: true});
      const base64Content = await streamToBase64(content);
      const messageBody = atob(base64Content);
      const message = messages.find(message => message.uid === textNode.uid);
      if (message.body) {
        message.body += messageBody;
      } else {
        message.body = messageBody;
      }
    }

    // Get UUIDs of processed messages
    const targetMessages = messages.map(message => message.uid).join(",");

    // Mark processed messages read
    await client.messageFlagsSet(targetMessages, ["\\Seen"], {uid: true});
  
    // Move processed messages to processed folder if provided
    if (processedFolder) {
      await client.messageMove(targetMessages, processedFolder, {uid: true});
    }
    
  } finally {
    lock.release();
    client.close();
  }

  return messages;
}

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

module.exports = getMessagesWithAttachments;