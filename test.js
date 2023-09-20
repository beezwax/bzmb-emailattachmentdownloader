const getAttachments = require("./getAttachments.js");

const args = process.argv.slice(2);

const [ host, port, user, pass, processedFolder ] = args;

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
  const attachments = await getAttachments(config);
  console.log(`Downloaded ${attachments.length} attachment(s)`);
  console.log(attachments);
})();