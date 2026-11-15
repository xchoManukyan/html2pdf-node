# Contributing

Thanks for helping! Bug reports with a small HTML example, fixes and new options are all welcome.

## Where things live

The rendering is done by [html2pdf-core](https://github.com/xchoManukyan/html2pdf-core) (Go). **Rendering bugs and CSS
support belong there.** This repository is the Node.js package around it:

```
index.js, index.mjs, index.d.ts   the API (CommonJS, ES module, types)
lib/          options, binary lookup and verification, conversion with the binary, HTTP client, asset collection
core.json     the pinned converter version and the SHA-256 checksums of its release binaries
scripts/      fetch-core (binaries into .core/), update-core (pin a version), platform-packages (npm/)
test/         node:test tests; they convert real documents with the binary and with the converter as a server
```

The package runs the converter as a child process (command line with a JSON report) or talks to its HTTP API; both
interfaces are described in the core README. It has no dependencies; keep it that way.

## Setting up

```bash
npm run fetch-core        # the pinned converter release for this machine, into .core/
npm test
```

To work against an unreleased converter, clone html2pdf-core next to this folder, run `sh scripts/build.sh` there,
then `npm run update-core -- --local ../html2pdf-core` and `npm run fetch-core -- --local ../html2pdf-core`. Don't
commit a pin to an unreleased converter.

## Making changes

- Add a test that fails without your change; conversion tests go in `test/conversions.js`, which runs them with
  the binary and through the server.
- New converter options: add them to the core first, then to `lib/options.js` (arguments and form fields),
  `index.d.ts` and the README.
- Add a line to `CHANGELOG.md` under "Unreleased".

## Releasing (maintainers)

1. If the release needs a newer converter, release html2pdf-core first, then pin it: `npm run update-core -- X.Y.Z`.
2. Set the version in `package.json` (`version` and the six `optionalDependencies`, which must be equal) and
   `CHANGELOG.md`.
3. Commit, tag `vX.Y.Z` and push the tag. The release workflow tests, downloads the pinned binaries (verified against
   `core.json`), publishes the six platform packages and then the main package with provenance, and creates the
   GitHub release. It needs the `NPM_TOKEN` secret, and the `@xchomanukyan` scope on npm.

The package version and the converter version are independent: a JavaScript-only fix is released with the same
converter (the platform packages are republished under the new version).
