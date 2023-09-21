# Introduction

A [bzBond-server](https://github.com/beezwax/bzBond/tree/main/packages/bzBond-server#bzbond-server) microbond to download email attachments via IMAP.

# Installation

## Installation on macOS/Linux

On macOs/Linux use the following command to install this Microbond:

`/var/www/bzbond-server/bin/install-microbond.sh bzmb-emailattachmentdownloader https://github.com/beezwax/bzmb-emailattachmentdownloader`

## Installation on Windows Server

On Windows Server use the following command to install this Microbond:

`powershell -File "C:\Program Files\bzBond-server\bin\install-microbond.ps1" bzmb-emailattachmentdownloader https://github.com/beezwax/bzmb-emailattachmentdownloader`

## Installation with a proxy on macOS/Linux

On macOs/Linux use the following command to install this Microbond via a proxy:

`/var/www/bzbond-server/bin/install-microbond.sh bzmb-emailattachmentdownloader https://github.com/beezwax/bzmb-emailattachmentdownloader http://proxy.example.com:443`

## Installation with a proxy on Windows Server

On Windows Server use the following command to install this Microbond via a proxy:

`powershell -File "C:\Program Files\bzBond-server\bin\install-microbond.ps1" -Proxy http://proxy.example.com:443`

# Usage

The bzmb-emailattachmentdownloader Microbond provides one route

## bzmb-emailattachmentdownloader-getAttachments

In a server-side FileMaker script run `bzBondRelay` script with parameters in the following format:

```
{
  "mode": "PERFORM_JAVASCRIPT",

  "route": "bzmb-emailattachmentdownloader-getAttachments",

  "customMethod": "POST",

  "customBody": {
    
    // Required. The imap config object. See https://imapflow.com/module-imapflow-ImapFlow.html#ImapFlow for details
    "imapConfig": "object"

    // Optional. The mail folder to move processed emails to
    "processedFolders": "string"
  }
}

```

The attachments and filenames can be accessed in a JSON array via `Get ( ScriptResult )`:
`JSONGetElement ( Get ( ScriptResult ); "response.result" )`