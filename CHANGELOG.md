# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0]

First release, with [html2pdf-core](https://github.com/xchoManukyan/html2pdf-core) 0.1.2.

- `convert(html, options)` and `convertFile(file, options)`, resolving with a `Result` (`pdf` Buffer, failures,
  CSS libraries, render time); CommonJS, ES module and TypeScript types.
- The options of the PHP package: paper size and orientation, margins, page numbers, viewport width, CSS libraries,
  base path, remote resources, passwords and permissions with AES-256, PDF/A, fillable forms, digital signatures,
  timeout.
- The converter binary in a package per platform (Linux, macOS, Windows; x64 and ARM64), verified against the
  pinned checksums before the first use; `HTML2PDF_BINARY` for a binary of your own.
- `HttpClient` for a converter server, uploading the local files a document refers to; extra headers, such as the
  `Authorization` token a signing server requires, with `new HttpClient(url, { headers })`.

[Unreleased]: https://github.com/xchoManukyan/html2pdf-node/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/xchoManukyan/html2pdf-node/releases/tag/v0.1.0
