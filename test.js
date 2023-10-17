const getAttachments = require("./getAttachments.js");
const getMessagesWithAttachments = require("./getMessagesWithAttachments.js");

const args = process.argv.slice(2);

const [ path, host, port, user, pass, processedFolder ] = args;

(async () => {

  const config = {
    imapConfig: {
      host,
      port,
      auth: {
        user,
        pass
      },
      secure: true,
      tls: { rejectUnauthorized: false },
      logger: false
    },
    processedFolder
  }
  switch (path) {
    case "getAttachments":
      
      const attachments = await getAttachments(config);
      console.log(`Downloaded ${attachments.length} attachment(s)`);
      console.log(JSON.stringify(attachments, null, 2));
      break;
    case "getMessagesWithAttachments":
      
      const messages = await getMessagesWithAttachments(config);
      console.log(`Downloaded ${messages.length} message(s)`);
      console.log(JSON.stringify(messages, null, 2));
      break;
  
    default:
      break;
  }
})();