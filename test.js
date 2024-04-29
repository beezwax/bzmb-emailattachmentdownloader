const fs = require("fs");

const getAttachments = require("./getAttachments.js");
const getMessagesWithAttachments = require("./getMessagesWithAttachments.js");

const args = process.argv.slice(2);

const [ path, host, port, user, pass, processedFolder, includeRead, readOnly ] = args;

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
    processedFolder,
    includeRead,
    readOnly
  }
  switch (path) {
    case "getAttachments":
      
      const attachments = await getAttachments(config);
      fs.writeFileSync("testOutput/getAttachments_output.json", JSON.stringify(attachments, null, 2));
      console.log(`Downloaded ${attachments.length} attachment(s)`);
      break;
    case "getMessagesWithAttachments":
      
      const messages = await getMessagesWithAttachments(config);
      fs.writeFileSync("testOutput/getMessagesWithAttachments_output.json", JSON.stringify(messages, null, 2));
      console.log(`Downloaded ${messages.length} message(s)`);
      break;
  
    default:
      break;
  }
})();