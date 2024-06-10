const { ImapFlow } = require('imapflow');

const getAttachments = async (config) => {
  const { imapConfig, processedFolder, errorFolder, includeRead, readOnly } = config;
  const client = new ImapFlow(imapConfig);

  const childNodes = [];
  const attachments = [];

  await client.connect();

  let lock = await client.getMailboxLock('INBOX');

  try {
    const messageGenerator = client.fetch(includeRead ? {all: true} : {seen: false}, { source: true, bodyStructure: true });

    for await (const message of messageGenerator) {

      message.bodyStructure.childNodes.forEach(node => {
        if (node.disposition === "attachment" || node.disposition === "inline") {
          childNodes.push({uid: message.uid, part: node.part});
        } else if (node.childNodes) {
          node.childNodes.forEach(childNode => {
            if(childNode.disposition) {
              childNodes.push({uid: message.uid, part: childNode.part});
            }
          })
        }
      });
    }

    for (const childNode of childNodes) {
      const { meta, content } = await client.download(childNode.uid, childNode.part, {uid: true});
      if (content) {
        const base64Content = await streamToBase64(content);
        let filename = meta.filename;
        if(!filename && meta.contentType === "message/rfc822") {
          filename = `embedded_message_${Math.random().toString().slice(-5)}.eml`;
        } else if (!filename) { 
          filename = `unknown_file_${Math.random().toString().slice(-5)}`;
        } else if (filename.substring(0, 2) === "=?") {
          filename = atob(filename.split("?B?")[1].slice(0, -2));
        }
        attachments.push({filename: meta.filename, data: base64Content});
      }
    }

    // Get UUIDs of processed messagges
    const targetMessages = childNodes.map(childNode => childNode.uid).filter((uid, index, arr) => arr.indexOf(uid === index)).join(",");

    // Mark processed messages read
    if (!readOnly) {
      await client.messageFlagsSet(targetMessages, ["\\Seen"], {uid: true});
    }
  
    // Move processed messages to processed folder if provided
    if (processedFolder && !readOnly) {
      await client.messageMove(targetMessages, processedFolder, {uid: true});
    }
    
  } finally {
    lock.release();
    client.close();
  }

  return attachments;
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

module.exports = getAttachments;