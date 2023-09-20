const getAttachments = require("./getAttachments.js");

const getAttachmentsSchema = {
  body: {
    type: "object",
    required: [
      "imapConfig"
    ],
    properties: {
      imapConfig: {
        type: "object",
        required: [
          "host",
          "port",
          "auth"
        ],
        properties: {
          host: { type: "string" },
          port: { type: "number" },
          auth: {
            type: "object",
            oneOf: [
              {required: ["user", "pass"]},
              {required: ["accessToken"]}
            ],
            user: { type: "string" },
            pass: { type: "string" },
            accessToken: { type: "string" },
          },
          tls: { type: "object" },
          logger: { type: "boolean" }
        }
      },
      processedFolder: { type: "string" },
      errorFolder: { type: "string" }
    }
  }
};

async function bzmbEmailattachmentdownloader(fastify, options) {
  fastify.post(
    "/bzmb-emailattachmentdownloader-getAttachments",
    { schema: getAttachmentsSchema },
    async (req, res) => {
    req.body;
    try {
      const attachments = await getAttachments(req.body);
      res
        .code(200)
        .send(attachments);
    } catch (error) {
      res
        .code(500)
        .send(error);
    }
  });
}

module.exports = { microbond: bzmbEmailattachmentdownloader };