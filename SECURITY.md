# Security policy

## Supported versions

Security fixes go into the latest release. Please upgrade before reporting an issue.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through GitHub:
[Report a vulnerability](https://github.com/xchoManukyan/html2pdf-node/security/advisories/new). Problems in the
converter itself (reading files, remote requests, the server) can also be reported to
[html2pdf-core](https://github.com/xchoManukyan/html2pdf-core/security/advisories/new).

Include what an attacker can do, the affected version, and an HTML document or steps that show it. You will get an
answer within a week; fixes are released as soon as they are ready and credited to you unless you prefer otherwise.

## What the package protects against

- **Local files:** a document can only read files inside the base path (`basePath`, or the file's folder with
  `convertFile`). With neither it can read none.
- **Remote resources** are off by default. When enabled, requests to private, loopback and link-local addresses are
  refused (checked after DNS resolution), and size, time and redirects are limited.
- **Converter binaries** are only used if their SHA-256 checksum matches the one pinned in `core.json`. They are
  reproducible builds of html2pdf-core, published with provenance.
- **Passwords** for PDF encryption are passed to the converter in its environment, not on the command line.

## Things to keep in mind

- The converter server has no authentication. Run it on an internal network or behind a proxy that authenticates.
- Converting untrusted HTML costs CPU and memory. Use `timeout` and limit the size of what users can submit.
