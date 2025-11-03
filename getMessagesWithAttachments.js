const { ImapFlow } = require("imapflow");

const getMessagesWithAttachments = async (config) => {
  const { imapConfig, processedFolder, errorFolder, includeRead, readOnly } =
    config;
  const client = new ImapFlow(imapConfig);
  client.on("error", (err) => {
    console.log(`Error occurred: ${err.message}`);
  });
  client.on("mailboxOpen", (mailbox) => {
    console.log(`Mailbox ${mailbox.path} opened`);
  });
  client.on("mailboxClose", (mailbox) => {
    console.log(`Mailbox ${mailbox.path} closed`);
  });
  client.on("close", () => {
    console.log(`Connection closed`);
  });
  let lock = {};

  const childNodes = [];
  const textNodes = [];
  const messages = [];

  try {
    await client.connect();
  } catch (error) {
    throw error;
  }

  try {
    lock = await client.getMailboxLock("INBOX");
  } catch (error) {
    throw error;
  }

  try {
    const messageGenerator = client.fetch(
      includeRead ? { all: true } : { seen: false },
      { envelope: true, source: true, bodyStructure: true }
    );

    for await (const message of messageGenerator) {
      const messageResult = {
        subject: message.envelope.subject,
        date: message.envelope.date,
        from: message.envelope.from,
        to: message.envelope.to,
        cc: message.envelope.cc,
        bcc: message.envelope.bcc,
        uid: message.uid,
        attachments: [],
      };

      message.bodyStructure.childNodes?.forEach((node) => {
        if (
          node.disposition === "attachment" ||
          node.disposition === "inline"
        ) {
          childNodes.push({
            uid: message.uid,
            part: node.part,
            disposition: node.disposition,
          });
        } else if (node.type === "text/plain" || node.type === "text/html") {
          textNodes.push({
            uid: message.uid,
            part: node.part,
            type: node.type,
          });
        } else if (node.childNodes) {
          node.childNodes.forEach((childNode) => {
            handleNestedNode(childNode, childNodes, textNodes, message);
          });
        }
      });

      if (!childNodes.length && !textNodes.length) {
        messageResult.body = message.source
          .slice(message.bodyStructure.size * -1)
          .toString();
      }

      messages.push(messageResult);
    }

    for (const childNode of childNodes) {
      const { meta, content } = await client.download(
        childNode.uid,
        childNode.part,
        { uid: true }
      );
      if (content) {
        const base64Content = await streamToBase64(content);
        const message = messages.find(
          (message) => message.uid === childNode.uid
        );
        let filename = meta.filename;
        if (!filename && meta.contentType === "message/rfc822") {
          filename = `embedded_message_${Math.random()
            .toString()
            .slice(-5)}.eml`;
        } else if (!filename) {
          filename = `unknown_file_${Math.random().toString().slice(-5)}`;
        } else if (filename.substring(0, 2) === "=?") {
          filename = atob(filename.split("?B?")[1].slice(0, -2));
        }
        message.attachments.push({ filename, data: base64Content });
      }
    }

    for (const textNode of textNodes) {
      const { content } = await client.download(textNode.uid, textNode.part, {
        uid: true,
      });
      const base64Content = await streamToBase64(content);
      const messageBody = atob(base64Content);
      const message = messages.find((message) => message.uid === textNode.uid);
      if (textNode.type === "text/html") {
        if (message.bodyHTML) {
          message.bodyHTML += messageBody;
        } else {
          message.bodyHTML = messageBody;
        }
      } else {
        if (message.bodyText) {
          message.bodyText += messageBody;
        } else {
          message.bodyText = messageBody;
        }
      }
      if (message.body) {
        message.body += messageBody;
      } else {
        message.body = messageBody;
      }
    }

    // Get UUIDs of processed messages
    const targetMessages = messages.map((message) => message.uid).join(",");

    // Mark processed messages read
    if (!readOnly) {
      await client.messageFlagsSet(targetMessages, ["\\Seen"], { uid: true });
    }

    // Move processed messages to processed folder if provided
    if (processedFolder && !readOnly) {
      await client.messageMove(targetMessages, processedFolder, { uid: true });
    }
  } finally {
    lock.release();
    client.close();
  }

  return messages;
};

/**
 * Convert a Readable Stream to base64 string
 * @param {ReadableStream} stream - a readable stream to convert in base64 string
 * @returns {Promise} - Promise that resolve in a string containing the base64
 */
const streamToBase64 = (stream) => {
  const concat = require("concat-stream");
  const { Base64Encode } = require("base64-stream");

  return new Promise((resolve, reject) => {
    const base64 = new Base64Encode();

    const cbConcat = (base64) => {
      resolve(base64);
    };

    stream
      .pipe(base64)
      .pipe(concat(cbConcat))
      .on("error", (error) => {
        reject(error);
      });
  });
};

function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function streamToFile(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function handleNestedNode(node, childNodes, textNodes, message) {
  if (node.childNodes) {
    node.childNodes.forEach((node) =>
      handleNestedNode(node, childNodes, textNodes, message)
    );
  } else if (node.disposition) {
    childNodes.push({
      uid: message.uid,
      part: node.part,
      disposition: node.disposition,
    });
  } else if (node.type === "text/plain" || node.type === "text/html") {
    textNodes.push({ uid: message.uid, part: node.part, type: node.type });
  }
}

module.exports = getMessagesWithAttachments;
